import type {
  DataSourceHealth,
  GlobalMarketData,
  TickerMarketSnapshot,
} from '../src/types.ts';

export interface RawNewsHeadline {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  body?: string;
  categories?: string[];
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const globalCache: { market?: CacheEntry<GlobalMarketData>; news?: CacheEntry<{ items: RawNewsHeadline[]; sources: DataSourceHealth[] }> } = {};

function fearGreedClassificationFa(cls?: string): string {
  if (!cls) return 'نامشخص';
  const lower = cls.toLowerCase();
  if (lower.includes('extreme fear')) return 'ترس شدید';
  if (lower.includes('fear')) return 'ترس';
  if (lower.includes('extreme greed')) return 'طمع شدید';
  if (lower.includes('greed')) return 'طمع';
  if (lower.includes('neutral')) return 'خنثی';
  return cls;
}

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 6500
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 6500): Promise<T> {
  const res = await fetchWithTimeout(
    url,
    {
      Accept: 'application/json',
      'User-Agent': 'CryptoScopeAI/1.0',
    },
    timeoutMs
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchTextWithTimeout(url: string, timeoutMs = 6500): Promise<string> {
  const res = await fetchWithTimeout(
    url,
    {
      Accept: 'application/xml, application/rss+xml, text/xml, */*',
      'User-Agent': 'CryptoScopeAI/1.0',
    },
    timeoutMs
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return await res.text();
}

export async function fetchGlobalMarketData(forceRefresh = false): Promise<GlobalMarketData> {
  const now = Date.now();
  if (!forceRefresh && globalCache.market && globalCache.market.expiresAt > now) {
    return globalCache.market.data;
  }

  const timestamp = new Date().toISOString();
  const sources: DataSourceHealth[] = [];

  const [
    coingeckoGlobalRes,
    coingeckoMarketsRes,
    fngRes,
    binanceBtcRes,
    binanceEthRes,
    binanceFundingRes,
    binanceOiRes,
  ] = await Promise.allSettled([
    fetchJsonWithTimeout<any>('https://api.coingecko.com/api/v3/global'),
    fetchJsonWithTimeout<any[]>(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,tether,usd-coin&order=market_cap_desc&sparkline=false'
    ),
    fetchJsonWithTimeout<any>('https://api.alternative.me/fng/?limit=7'),
    fetchJsonWithTimeout<any>('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT'),
    fetchJsonWithTimeout<any>('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=ETHUSDT'),
    fetchJsonWithTimeout<any>('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT'),
    fetchJsonWithTimeout<any>('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT'),
  ]);

  // Parse CoinGecko Global + Coins
  let globalOk = false;
  let globalSection: GlobalMarketData['global'] = {
    available: false,
    error: 'داده جهانی CoinGecko در دسترس نیست',
  };

  let cgBtc: any = null;
  let cgEth: any = null;
  let stablecoinCap = 0;
  let stablecoinChangeSum = 0;
  let stablecoinCount = 0;

  if (coingeckoMarketsRes.status === 'fulfilled' && Array.isArray(coingeckoMarketsRes.value)) {
    for (const c of coingeckoMarketsRes.value) {
      if (c.id === 'bitcoin') cgBtc = c;
      if (c.id === 'ethereum') cgEth = c;
      if (c.id === 'tether' || c.id === 'usd-coin') {
        stablecoinCap += Number(c.market_cap || 0);
        if (typeof c.market_cap_change_percentage_24h === 'number') {
          stablecoinChangeSum += c.market_cap_change_percentage_24h;
          stablecoinCount++;
        }
      }
    }
  }

  const toFiniteNum = (v: unknown): number | undefined => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };

  if (coingeckoGlobalRes.status === 'fulfilled' && coingeckoGlobalRes.value?.data) {
    const d = coingeckoGlobalRes.value.data;
    globalOk = true;
    globalSection = {
      available: true,
      totalMarketCapUsd: toFiniteNum(d.total_market_cap?.usd),
      totalMarketCapChange24h: toFiniteNum(d.market_cap_change_percentage_24h_usd),
      totalVolume24hUsd: toFiniteNum(d.total_volume?.usd),
      btcDominance: toFiniteNum(d.market_cap_percentage?.btc),
      ethDominance: toFiniteNum(d.market_cap_percentage?.eth),
      stablecoinMarketCapUsd: stablecoinCap > 0 ? stablecoinCap : undefined,
      stablecoinChange24h:
        stablecoinCount > 0 ? Number((stablecoinChangeSum / stablecoinCount).toFixed(2)) : undefined,
    };
  }

  sources.push({
    name: 'CoinGecko API',
    status: globalOk || cgBtc ? 'online' : 'unavailable',
    message:
      globalOk || cgBtc
        ? undefined
        : coingeckoGlobalRes.status === 'rejected'
          ? String(coingeckoGlobalRes.reason?.message || 'خطا در اتصال')
          : 'داده نامعتبر',
    lastUpdated: timestamp,
  });

  // Parse Binance BTC & ETH
  const btcBinance = binanceBtcRes.status === 'fulfilled' ? binanceBtcRes.value : null;
  const ethBinance = binanceEthRes.status === 'fulfilled' ? binanceEthRes.value : null;
  const btcFunding = binanceFundingRes.status === 'fulfilled' ? binanceFundingRes.value : null;
  const btcOi = binanceOiRes.status === 'fulfilled' ? binanceOiRes.value : null;

  sources.push({
    name: 'Binance Public API',
    status: btcBinance || ethBinance ? 'online' : 'unavailable',
    message:
      btcBinance || ethBinance
        ? undefined
        : binanceBtcRes.status === 'rejected'
          ? String(binanceBtcRes.reason?.message || 'خطا در اتصال')
          : 'عدم دسترسی',
    lastUpdated: timestamp,
  });

  const btcPrice = toFiniteNum(btcBinance?.lastPrice) ?? toFiniteNum(cgBtc?.current_price);
  const btcFundingRateRaw = toFiniteNum(btcFunding?.lastFundingRate);
  const btcOiRaw = toFiniteNum(btcOi?.openInterest);
  const btcData: GlobalMarketData['btc'] =
    btcPrice !== undefined
      ? {
          available: true,
          priceUsd: btcPrice,
          change24h: btcBinance
            ? toFiniteNum(btcBinance.priceChangePercent)
            : toFiniteNum(cgBtc?.price_change_percentage_24h),
          high24h: btcBinance ? toFiniteNum(btcBinance.highPrice) : toFiniteNum(cgBtc?.high_24h),
          low24h: btcBinance ? toFiniteNum(btcBinance.lowPrice) : toFiniteNum(cgBtc?.low_24h),
          volume24hUsd: btcBinance
            ? toFiniteNum(btcBinance.quoteVolume)
            : toFiniteNum(cgBtc?.total_volume),
          fundingRate: btcFundingRateRaw !== undefined ? btcFundingRateRaw * 100 : undefined,
          openInterestUsd: btcOiRaw !== undefined ? btcOiRaw * btcPrice : undefined,
        }
      : {
          available: false,
          error: 'قیمت لحظه‌ای بیت‌کوین در دسترس نیست',
        };

  const ethPrice = toFiniteNum(ethBinance?.lastPrice) ?? toFiniteNum(cgEth?.current_price);
  const ethData: GlobalMarketData['eth'] =
    ethPrice !== undefined
      ? {
          available: true,
          priceUsd: ethPrice,
          change24h: ethBinance
            ? toFiniteNum(ethBinance.priceChangePercent)
            : toFiniteNum(cgEth?.price_change_percentage_24h),
          high24h: ethBinance ? toFiniteNum(ethBinance.highPrice) : toFiniteNum(cgEth?.high_24h),
          low24h: ethBinance ? toFiniteNum(ethBinance.lowPrice) : toFiniteNum(cgEth?.low_24h),
          volume24hUsd: ethBinance
            ? toFiniteNum(ethBinance.quoteVolume)
            : toFiniteNum(cgEth?.total_volume),
        }
      : {
          available: false,
          error: 'قیمت لحظه‌ای اتریوم در دسترس نیست',
        };

  // Parse Alternative.me Fear & Greed
  let fngData: GlobalMarketData['fearAndGreed'] = {
    available: false,
    error: 'شاخص ترس و طمع در دسترس نیست',
  };
  if (fngRes.status === 'fulfilled' && Array.isArray(fngRes.value?.data) && fngRes.value.data.length > 0) {
    const list = fngRes.value.data;
    const latest = list[0];
    const prev = list[1];
    fngData = {
      available: true,
      value: Number(latest.value),
      classification: latest.value_classification,
      classificationFa: fearGreedClassificationFa(latest.value_classification),
      previousValue: prev ? Number(prev.value) : undefined,
      history: list
        .slice(0, 7)
        .map((item: any) => ({
          value: Number(item.value),
          date: new Date(Number(item.timestamp) * 1000).toISOString().slice(0, 10),
        }))
        .reverse(),
    };
  }

  sources.push({
    name: 'Alternative.me Fear & Greed',
    status: fngData.available ? 'online' : 'unavailable',
    message: fngData.available ? undefined : fngData.error,
    lastUpdated: timestamp,
  });

  const result: GlobalMarketData = {
    lastUpdated: timestamp,
    sources,
    btc: btcData,
    eth: ethData,
    global: globalSection,
    fearAndGreed: fngData,
  };

  globalCache.market = { data: result, expiresAt: now + 45_000 };
  return result;
}

export function normalizeCryptoTicker(rawSymbol: string): { base: string; pair: string } {
  const cleaned = rawSymbol
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
  if (!cleaned) return { base: 'BTC', pair: 'BTCUSDT' };
  const quoteSuffixes = ['USDT', 'USD', 'USDC', 'BUSD', 'FDUSD', 'PERP'];
  for (const suffix of quoteSuffixes) {
    if (cleaned.endsWith(suffix) && cleaned.length > suffix.length) {
      const base = cleaned.slice(0, cleaned.length - suffix.length);
      return { base, pair: `${base}USDT` };
    }
  }
  return { base: cleaned, pair: `${cleaned}USDT` };
}

export async function fetchTickerSnapshot(rawSymbol: string): Promise<TickerMarketSnapshot> {
  const { base, pair } = normalizeCryptoTicker(rawSymbol);
  const fetchedAt = new Date().toISOString();

  // Try Binance Spot + Futures first
  const [spotRes, fundingRes, oiRes, cgSearchRes] = await Promise.allSettled([
    fetchJsonWithTimeout<any>(`https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${pair}`),
    fetchJsonWithTimeout<any>(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${pair}`),
    fetchJsonWithTimeout<any>(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${pair}`),
    fetchJsonWithTimeout<any>(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(base)}`),
  ]);

  if (spotRes.status === 'fulfilled' && spotRes.value?.lastPrice) {
    const s = spotRes.value;
    const price = Number(s.lastPrice);
    const funding =
      fundingRes.status === 'fulfilled' && fundingRes.value?.lastFundingRate
        ? Number(fundingRes.value.lastFundingRate) * 100
        : undefined;
    const oi =
      oiRes.status === 'fulfilled' && oiRes.value?.openInterest
        ? Number(oiRes.value.openInterest) * price
        : undefined;

    return {
      symbol: base,
      pair,
      available: true,
      source: 'Binance Public API',
      priceUsd: price,
      change24h: Number(s.priceChangePercent),
      high24h: Number(s.highPrice),
      low24h: Number(s.lowPrice),
      volume24hUsd: Number(s.quoteVolume),
      fundingRate: funding,
      openInterest: oi,
      fetchedAt,
    };
  }

  // Fallback to CoinGecko Search + Markets if not on Binance Spot
  if (cgSearchRes.status === 'fulfilled' && Array.isArray(cgSearchRes.value?.coins)) {
    const exactMatch =
      cgSearchRes.value.coins.find((c: any) => String(c.symbol).toUpperCase() === base) ||
      cgSearchRes.value.coins[0];
    if (exactMatch?.id) {
      try {
        const markets = await fetchJsonWithTimeout<any[]>(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(exactMatch.id)}`
        );
        const coin = markets?.[0];
        if (coin && typeof coin.current_price === 'number') {
          return {
            symbol: base,
            pair,
            available: true,
            source: 'CoinGecko API',
            priceUsd: coin.current_price,
            change24h: coin.price_change_percentage_24h,
            high24h: coin.high_24h,
            low24h: coin.low_24h,
            volume24hUsd: coin.total_volume,
            marketCapUsd: coin.market_cap,
            fetchedAt,
          };
        }
      } catch {
        // Ignore fallback failure and report unavailable below
      }
    }
  }

  return {
    symbol: base,
    pair,
    available: false,
    error: `داده لحظه‌ای تاییدشده برای نماد ${base} در منابع Binance/CoinGecko یافت نشد`,
    fetchedAt,
  };
}

function stripXmlTags(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssItems(xml: string, sourceName: string, limit = 12): RawNewsHeadline[] {
  const items: RawNewsHeadline[] = [];
  const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  for (const block of itemMatches.slice(0, limit)) {
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const pubMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    const descMatch = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const title = titleMatch ? stripXmlTags(titleMatch[1]) : '';
    const url = linkMatch ? stripXmlTags(linkMatch[1]) : '';
    const pubDate = pubMatch ? stripXmlTags(pubMatch[1]) : new Date().toISOString();
    const body = descMatch ? stripXmlTags(descMatch[1]).slice(0, 260) : '';
    if (title) {
      let isoDate = new Date().toISOString();
      const parsed = Date.parse(pubDate);
      if (!Number.isNaN(parsed)) {
        isoDate = new Date(parsed).toISOString();
      }
      items.push({ title, source: sourceName, url, publishedAt: isoDate, body });
    }
  }
  return items;
}

export async function fetchRawCryptoNews(
  assetSymbol = 'BTC',
  forceRefresh = false,
  cryptoPanicApiKey?: string
): Promise<{ items: RawNewsHeadline[]; sources: DataSourceHealth[] }> {
  const now = Date.now();
  const normalized = normalizeCryptoTicker(assetSymbol).base;
  if (!forceRefresh && normalized === 'BTC' && globalCache.news && globalCache.news.expiresAt > now) {
    return globalCache.news.data;
  }

  const timestamp = new Date().toISOString();
  const sources: DataSourceHealth[] = [];
  const collected: RawNewsHeadline[] = [];

  const cryptoPanicKey =
    cryptoPanicApiKey ?? (typeof process !== 'undefined' ? process.env?.CRYPTOPANIC_API_KEY : undefined);
  const cpUrl = cryptoPanicKey
    ? `https://cryptopanic.com/api/v1/posts/?auth_token=${encodeURIComponent(cryptoPanicKey)}&public=true&currencies=${encodeURIComponent(normalized)}`
    : null;

  const ccUrl =
    normalized && normalized !== 'ALL'
      ? `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=${encodeURIComponent(normalized)}`
      : `https://min-api.cryptocompare.com/data/v2/news/?lang=EN`;

  const [ccRes, ccGeneralRes, coindeskRes, cointelegraphRes, cpRes] = await Promise.allSettled([
    fetchJsonWithTimeout<any>(ccUrl),
    fetchJsonWithTimeout<any>('https://min-api.cryptocompare.com/data/v2/news/?lang=EN'),
    fetchTextWithTimeout('https://www.coindesk.com/arc/outboundfeeds/rss/'),
    fetchTextWithTimeout('https://cointelegraph.com/rss'),
    cpUrl ? fetchJsonWithTimeout<any>(cpUrl) : Promise.reject(new Error('API Key تنظیم نشده است')),
  ]);

  // CryptoCompare News (aggregates CoinDesk, Cointelegraph, CoinGecko, Decrypt, etc.)
  let ccCount = 0;
  for (const res of [ccRes, ccGeneralRes]) {
    if (res.status === 'fulfilled' && Array.isArray(res.value?.Data)) {
      for (const n of res.value.Data.slice(0, 14)) {
        collected.push({
          title: String(n.title || ''),
          source: String(n.source_info?.name || n.source || 'Crypto News Wire'),
          url: String(n.url || ''),
          publishedAt: n.published_on
            ? new Date(Number(n.published_on) * 1000).toISOString()
            : timestamp,
          body: String(n.body || '').slice(0, 260),
          categories: String(n.categories || '')
            .split('|')
            .filter(Boolean),
        });
        ccCount++;
      }
    }
  }
  sources.push({
    name: 'CryptoCompare / Aggregator',
    status: ccCount > 0 ? 'online' : 'unavailable',
    message: ccCount > 0 ? undefined : 'فید تجمیعی اخبار در دسترس نیست',
    lastUpdated: timestamp,
  });

  // CoinDesk RSS
  if (coindeskRes.status === 'fulfilled') {
    const parsed = parseRssItems(coindeskRes.value, 'CoinDesk', 10);
    collected.push(...parsed);
    sources.push({
      name: 'CoinDesk RSS',
      status: parsed.length > 0 ? 'online' : 'unavailable',
      message: parsed.length > 0 ? undefined : 'موردی دریافت نشد',
      lastUpdated: timestamp,
    });
  } else {
    sources.push({
      name: 'CoinDesk RSS',
      status: 'unavailable',
      message: String(coindeskRes.reason?.message || 'خطا در اتصال'),
      lastUpdated: timestamp,
    });
  }

  // Cointelegraph RSS
  if (cointelegraphRes.status === 'fulfilled') {
    const parsed = parseRssItems(cointelegraphRes.value, 'Cointelegraph', 10);
    collected.push(...parsed);
    sources.push({
      name: 'Cointelegraph RSS',
      status: parsed.length > 0 ? 'online' : 'unavailable',
      message: parsed.length > 0 ? undefined : 'موردی دریافت نشد',
      lastUpdated: timestamp,
    });
  } else {
    sources.push({
      name: 'Cointelegraph RSS',
      status: 'unavailable',
      message: String(cointelegraphRes.reason?.message || 'خطا در اتصال'),
      lastUpdated: timestamp,
    });
  }

  // CryptoPanic API (optional key)
  if (cpRes.status === 'fulfilled' && Array.isArray(cpRes.value?.results)) {
    const cpItems = cpRes.value.results.slice(0, 12).map((p: any) => ({
      title: String(p.title || ''),
      source: String(p.source?.title || 'CryptoPanic'),
      url: String(p.url || ''),
      publishedAt: p.published_at || timestamp,
    }));
    collected.push(...cpItems);
    sources.push({
      name: 'CryptoPanic API',
      status: 'online',
      lastUpdated: timestamp,
    });
  } else {
    sources.push({
      name: 'CryptoPanic API',
      status: 'unavailable',
      message: cryptoPanicKey ? 'خطا در دریافت از CryptoPanic' : 'نیازمند کلید اختیاری CRYPTOPANIC_API_KEY (جایگزین فعال: Google Search + RSS)',
      lastUpdated: timestamp,
    });
  }

  // Deduplicate by title
  const seen = new Set<string>();
  const unique: RawNewsHeadline[] = [];
  for (const item of collected) {
    const key = item.title.toLowerCase().slice(0, 64);
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  // Sort newest first
  unique.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const result = { items: unique.slice(0, 30), sources };
  if (normalized === 'BTC') {
    globalCache.news = { data: result, expiresAt: now + 60_000 };
  }
  return result;
}
