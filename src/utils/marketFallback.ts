import type { GlobalMarketData } from '../types.ts';

function toNum(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function fngFa(cls?: string): string {
  if (!cls) return 'نامشخص';
  const lower = cls.toLowerCase();
  if (lower.includes('extreme fear')) return 'ترس شدید';
  if (lower.includes('fear')) return 'ترس';
  if (lower.includes('extreme greed')) return 'طمع شدید';
  if (lower.includes('greed')) return 'طمع';
  if (lower.includes('neutral')) return 'خنثی';
  return cls;
}

export async function fetchPublicMarketFallback(): Promise<GlobalMarketData | null> {
  const timestamp = new Date().toISOString();
  const [btcRes, ethRes, fngRes, cgRes] = await Promise.allSettled([
    fetch('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT').then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
    ),
    fetch('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=ETHUSDT').then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
    ),
    fetch('https://api.alternative.me/fng/?limit=2').then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
    ),
    fetch('https://api.coingecko.com/api/v3/global').then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
    ),
  ]);

  const btcRaw = btcRes.status === 'fulfilled' ? btcRes.value : null;
  const ethRaw = ethRes.status === 'fulfilled' ? ethRes.value : null;
  const fngRaw = fngRes.status === 'fulfilled' ? fngRes.value : null;
  const cgRaw = cgRes.status === 'fulfilled' ? cgRes.value?.data : null;

  const btcPrice = toNum(btcRaw?.lastPrice);
  const ethPrice = toNum(ethRaw?.lastPrice);
  const fngLatest = Array.isArray(fngRaw?.data) ? fngRaw.data[0] : null;
  const fngVal = toNum(fngLatest?.value);

  if (btcPrice === undefined && ethPrice === undefined && fngVal === undefined && !cgRaw) {
    return null;
  }

  return {
    lastUpdated: timestamp,
    sources: [
      {
        name: 'Binance Public API',
        status: btcPrice !== undefined || ethPrice !== undefined ? 'online' : 'unavailable',
        lastUpdated: timestamp,
      },
      {
        name: 'CoinGecko API',
        status: cgRaw ? 'online' : 'unavailable',
        lastUpdated: timestamp,
      },
      {
        name: 'Alternative.me Fear & Greed',
        status: fngVal !== undefined ? 'online' : 'unavailable',
        lastUpdated: timestamp,
      },
    ],
    btc:
      btcPrice !== undefined
        ? {
            available: true,
            priceUsd: btcPrice,
            change24h: toNum(btcRaw?.priceChangePercent),
            high24h: toNum(btcRaw?.highPrice),
            low24h: toNum(btcRaw?.lowPrice),
            volume24hUsd: toNum(btcRaw?.quoteVolume),
          }
        : { available: false, error: 'ناموجود' },
    eth:
      ethPrice !== undefined
        ? {
            available: true,
            priceUsd: ethPrice,
            change24h: toNum(ethRaw?.priceChangePercent),
            high24h: toNum(ethRaw?.highPrice),
            low24h: toNum(ethRaw?.lowPrice),
            volume24hUsd: toNum(ethRaw?.quoteVolume),
          }
        : { available: false, error: 'ناموجود' },
    global: cgRaw
      ? {
          available: true,
          totalMarketCapUsd: toNum(cgRaw.total_market_cap?.usd),
          totalMarketCapChange24h: toNum(cgRaw.market_cap_change_percentage_24h_usd),
          totalVolume24hUsd: toNum(cgRaw.total_volume?.usd),
          btcDominance: toNum(cgRaw.market_cap_percentage?.btc),
          ethDominance: toNum(cgRaw.market_cap_percentage?.eth),
        }
      : { available: false, error: 'ناموجود' },
    fearAndGreed:
      fngVal !== undefined
        ? {
            available: true,
            value: fngVal,
            classification: fngLatest?.value_classification,
            classificationFa: fngFa(fngLatest?.value_classification),
          }
        : { available: false, error: 'ناموجود' },
  };
}
