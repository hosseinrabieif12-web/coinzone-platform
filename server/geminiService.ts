import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  ChartAnalysisReport,
  ChatMessage,
  GlobalMarketData,
  NewsDashboardData,
  TickerMarketSnapshot,
  TimeframeKey,
} from '../src/types.ts';
import type { DataSourceHealth } from '../src/types.ts';
import {
  fetchGlobalMarketData,
  fetchRawCryptoNews,
  fetchTickerSnapshot,
  normalizeCryptoTicker,
  type RawNewsHeadline,
} from './marketService.ts';

function getGeminiClient(apiKeyOverride?: string): GoogleGenAI {
  const apiKey =
    apiKeyOverride ?? (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);
  if (!apiKey) {
    throw new Error('کلید API جمینی (GEMINI_API_KEY) در تنظیمات سرور یافت نشد.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractGroundingUrls(response: any): { title: string; uri: string }[] {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const urls: { title: string; uri: string }[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title || uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      urls.push({ title: String(title), uri: String(uri) });
    }
  }
  return urls.slice(0, 12);
}

function safeJsonParse<T>(text: string | undefined, fallback?: T): T {
  if (!text) {
    if (fallback !== undefined) return fallback;
    throw new Error('پاسخ خالی از مدل هوش مصنوعی دریافت شد.');
  }
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

async function withGeminiRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('429') ||
        msg.includes('overloaded');
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1200 * attempt));
    }
  }
  throw lastErr;
}

export interface ChartInputFrame {
  timeframe: TimeframeKey | 'auto';
  mimeType: string;
  base64Data: string;
}

interface QuickChartId {
  symbol: string;
  coinName: string;
  exchange: string;
  detectedTimeframe: string;
  currentPriceText: string;
  symbolClear: boolean;
  timeframeClear: boolean;
  priceClear: boolean;
}

async function identifyChartQuickly(
  ai: GoogleGenAI,
  frames: ChartInputFrame[],
  userHints: { symbol?: string; timeframe?: string; currentPrice?: string }
): Promise<QuickChartId> {
  const imageParts = frames.map((f) => ({
    inlineData: {
      mimeType: f.mimeType === 'image/jpg' ? 'image/jpeg' : f.mimeType || 'image/png',
      data: f.base64Data,
    },
  }));

  const prompt = `Look carefully at the uploaded cryptocurrency chart screenshot(s).
User hints (may be empty):
- Symbol hint: ${userHints.symbol || 'None'}
- Timeframe hint: ${userHints.timeframe || 'None'}
- Current price hint: ${userHints.currentPrice || 'None'}

Extract ONLY what is explicitly readable on the chart or provided in user hints. NEVER guess or invent if unreadable.`;

  const res = await withGeminiRetry(() =>
    ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [...imageParts, { text: prompt }],
    },
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          symbol: { type: Type.STRING, description: 'Ticker symbol e.g. BTC, ETH, SOL, BTCUSDT or UNKNOWN' },
          coinName: { type: Type.STRING, description: 'Full coin name if identifiable or UNKNOWN' },
          exchange: { type: Type.STRING, description: 'Exchange or platform e.g. TradingView, Binance, Bybit or UNKNOWN' },
          detectedTimeframe: { type: Type.STRING, description: 'Timeframe like 15m, 1h, 4h, 1D or UNKNOWN' },
          currentPriceText: { type: Type.STRING, description: 'Visible current/last price on axis or UNKNOWN' },
          symbolClear: { type: Type.BOOLEAN },
          timeframeClear: { type: Type.BOOLEAN },
          priceClear: { type: Type.BOOLEAN },
        },
        required: [
          'symbol',
          'coinName',
          'exchange',
          'detectedTimeframe',
          'currentPriceText',
          'symbolClear',
          'timeframeClear',
          'priceClear',
        ],
      },
    },
  }));

  return safeJsonParse<QuickChartId>(res.text, {
    symbol: userHints.symbol || 'UNKNOWN',
    coinName: 'UNKNOWN',
    exchange: 'UNKNOWN',
    detectedTimeframe: userHints.timeframe || 'UNKNOWN',
    currentPriceText: userHints.currentPrice || 'UNKNOWN',
    symbolClear: Boolean(userHints.symbol),
    timeframeClear: Boolean(userHints.timeframe),
    priceClear: Boolean(userHints.currentPrice),
  });
}

async function gatherGroundedNewsAndMacro(
  ai: GoogleGenAI,
  symbol: string,
  rawHeadlines: RawNewsHeadline[]
): Promise<{ groundedSummary: string; groundingUrls: { title: string; uri: string }[] }> {
  const headlineBlock = rawHeadlines
    .slice(0, 18)
    .map((h, i) => `${i + 1}. [${h.source} | ${h.publishedAt}] ${h.title}`)
    .join('\n');

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today's date is ${today}.
Search for the latest real-time cryptocurrency news and macroeconomic news affecting "${symbol}" and the broader crypto market (Bitcoin, Ethereum, Federal Reserve, US CPI/inflation, employment, geopolitical events).
Cover:
1. Latest ${symbol} news in the last 24 hours, 7 days, and 30 days (from CoinDesk, Cointelegraph, CoinMarketCap, CoinGecko, official project announcements, verified exchanges).
2. Major partnerships, protocol updates, exchange listings/delistings, regulatory developments, security incidents/hacks, token unlocks/supply changes, institutional/ETF flows.
3. Explicitly distinguish verified announcements from unverified rumors.
4. Latest Federal Reserve interest rate stance, inflation/employment reports, and geopolitical developments impacting crypto.

Live RSS/API headlines already fetched right now:
${headlineBlock || 'No RSS headlines available right now.'}

Provide a concise, factual, source-attributed briefing with dates and verification status.`;

  try {
    const res = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          tools: [{ googleSearch: {} }],
        },
      })
    );
    return {
      groundedSummary: res.text || 'اطلاعات تکمیلی جستجوی وب دریافت نشد.',
      groundingUrls: extractGroundingUrls(res),
    };
  } catch (err) {
    return {
      groundedSummary: `جستجوی وب در دسترس نبود (${err instanceof Error ? err.message : 'خطای نامشخص'}). تحلیل بر اساس فیدهای زنده خبری انجام شد.`,
      groundingUrls: [],
    };
  }
}

const newsItemSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: { type: Type.STRING },
    titleFa: { type: Type.STRING },
    summaryFa: { type: Type.STRING },
    source: { type: Type.STRING },
    url: { type: Type.STRING },
    publishedAt: { type: Type.STRING },
    sentiment: { type: Type.STRING, description: 'positive, negative, or neutral' },
    impactScore: { type: Type.NUMBER, description: 'Integer from -100 to +100' },
    credibility: { type: Type.STRING, description: 'high, medium, or low' },
    credibilityFa: { type: Type.STRING },
    verificationStatus: { type: Type.STRING, description: 'verified, rumor, or developing' },
    verificationStatusFa: { type: Type.STRING },
    shortTermImpactFa: { type: Type.STRING },
    longTermImpactFa: { type: Type.STRING },
    category: { type: Type.STRING },
    relatedAssets: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'id',
    'title',
    'titleFa',
    'summaryFa',
    'source',
    'publishedAt',
    'sentiment',
    'impactScore',
    'credibility',
    'credibilityFa',
    'verificationStatus',
    'verificationStatusFa',
    'shortTermImpactFa',
    'longTermImpactFa',
    'category',
    'relatedAssets',
  ],
};

export async function analyzeChartWithAI(params: {
  frames: ChartInputFrame[];
  userHints: {
    symbol?: string;
    timeframe?: string;
    currentPrice?: string;
    notes?: string;
  };
  env?: {
    geminiApiKey?: string;
    cryptoPanicApiKey?: string;
  };
}): Promise<ChartAnalysisReport> {
  const ai = getGeminiClient(params.env?.geminiApiKey);
  const { frames, userHints } = params;

  if (!frames || frames.length === 0) {
    throw new Error('حداقل یک تصویر چارت برای تحلیل الزامی است.');
  }

  // Step 1: Identify symbol & timeframe honestly from screenshot(s) + hints
  const quickId = await identifyChartQuickly(ai, frames, userHints);
  const effectiveSymbolRaw =
    userHints.symbol?.trim() || (quickId.symbol !== 'UNKNOWN' ? quickId.symbol : 'BTC');
  const { base: normalizedBase } = normalizeCryptoTicker(effectiveSymbolRaw);

  // Step 2: Fetch live market data, specific ticker snapshot, and live news in parallel
  const [globalMarket, tickerSnapshot, rawNews] = await Promise.all([
    fetchGlobalMarketData(),
    quickId.symbol !== 'UNKNOWN' || userHints.symbol
      ? fetchTickerSnapshot(effectiveSymbolRaw)
      : Promise.resolve(null),
    fetchRawCryptoNews(normalizedBase, false, params.env?.cryptoPanicApiKey),
  ]);

  // Step 3: Search grounding for latest asset & macro news
  const { groundedSummary, groundingUrls } = await gatherGroundedNewsAndMacro(
    ai,
    quickId.symbol !== 'UNKNOWN' || userHints.symbol ? normalizedBase : 'Bitcoin & Crypto Market',
    rawNews.items
  );

  const imageParts = frames.map((f, idx) => ([
    { text: `Chart Screenshot #${idx + 1} (User-tagged timeframe: ${f.timeframe})` },
    {
      inlineData: {
        mimeType: f.mimeType === 'image/jpg' ? 'image/jpeg' : f.mimeType || 'image/png',
        data: f.base64Data,
      },
    },
  ])).flat();

  const liveDataContext = JSON.stringify(
    {
      quickIdentification: quickId,
      userHints,
      globalMarket,
      tickerSnapshot,
      rawHeadlines: rawNews.items.slice(0, 20),
    },
    null,
    2
  );

  const systemInstruction = `You are CRYPTO SCOPE AI, an institutional-grade, brutally honest cryptocurrency technical, fundamental, and macro analyst writing entirely in professional Persian (فارسی).
Technical indicator abbreviations (RSI, MACD, EMA 20, EMA 50, EMA 100, EMA 200, Bollinger Bands, R:R, BTC.D, ETF, CPI, FOMC) may remain in English alongside Persian terminology.

STRICT HONESTY & ANALYTICAL RULES:
1. NEVER invent indicator values (e.g., RSI=42, MACD crossover, EMA200 price) that are NOT visibly readable in the uploaded chart screenshot(s). If an indicator is not on the chart or unreadable, explicitly write "در تصویر چارت نمایش داده نشده / غیرقابل خواندن است".
2. NEVER invent fake prices. Use visible chart price levels or the verified live snapshot provided in context. If neither provides exact price data, clearly mark risk management levels as "برآورد تحلیلی" (estimated) or set hasSufficientPriceData=false and ask the user for current market data.
3. If the chart symbol, timeframe, or price axis is unclear and not supplied by userHints, set identification.needsUserInput=true and list specific Persian questions in missingInfoQuestions instead of guessing.
4. NEVER pretend to analyze timeframes (5m, 15m, 1h, 4h, 1D) that were NOT uploaded in the screenshots. Only analyze the timeframe(s) actually provided; for all other timeframes in multiTimeframe, set provided=false, bias="نامشخص", and explain in Persian that the screenshot for that timeframe was not uploaded.
5. NEVER guarantee profits. Explicitly state in riskDisclaimer that confidenceScore and probabilities are analytical assessments, not profit guarantees.
6. Prefer NO TRADE ("عدم ورود") or WAIT ("صبر") whenever the chart is unclear, signals conflict strongly, or risk-reward is unfavorable.
7. Never generate BUY or SELL based on a single news headline. Weigh all 3 modules:
   - Module A (Technical Analysis): Weight 45%
   - Module B (News & Fundamental Analysis): Weight 30%
   - Module C (Overall Market Conditions): Weight 25%
   Compute combinedScore = round(0.45 * technicalScore + 0.30 * newsScore + 0.25 * marketScore) where each score is -100 to +100.
   Explain any disagreements or conflicts between the 3 modules clearly in moduleDisagreements.
8. For News & Fundamental Analysis:
   - Provide a News Impact Score from -100 to +100.
   - Distinguish verified facts from unverified rumors (rumorsVsVerified).
   - Cover 24h, 7d, 30d news, partnerships/updates, listings/delistings, regulations, security/exchange incidents, token unlocks/supply changes, institutional/ETF flows, short-term vs long-term impact.
9. For Overall Market Conditions:
   - Use ONLY the real numbers provided in globalMarket & tickerSnapshot. If any API source shows available=false, explicitly state it is unavailable rather than inventing a number.`;

  const analysisPrompt = `Analyze the uploaded cryptocurrency chart screenshot(s) along with the verified live market data, live news feed, and grounded search briefing below.

VERIFIED LIVE CONTEXT:
${liveDataContext}

GROUNDED NEWS & MACRO SEARCH BRIEFING:
${groundedSummary}

Generate the complete, structured Persian trading decision report following the exact JSON schema.`;

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [...imageParts, { text: analysisPrompt }],
    },
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          identification: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              coinNameFa: { type: Type.STRING },
              exchange: { type: Type.STRING },
              detectedTimeframe: { type: Type.STRING },
              currentPriceText: { type: Type.STRING },
              verifiedLivePriceUsd: { type: Type.NUMBER, nullable: true },
              priceVerified: { type: Type.BOOLEAN },
              visibleIndicators: { type: Type.ARRAY, items: { type: Type.STRING } },
              needsUserInput: { type: Type.BOOLEAN },
              missingInfoQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              chartQualityNote: { type: Type.STRING },
            },
            required: [
              'symbol',
              'coinNameFa',
              'exchange',
              'detectedTimeframe',
              'currentPriceText',
              'priceVerified',
              'visibleIndicators',
              'needsUserInput',
              'missingInfoQuestions',
              'chartQualityNote',
            ],
          },
          decisionEngine: {
            type: Type.OBJECT,
            properties: {
              finalDecision: {
                type: Type.STRING,
                description: 'Must be one of: STRONG BUY, BUY, WAIT, SELL, STRONG SELL, NO TRADE',
              },
              finalDecisionFa: { type: Type.STRING },
              chartSignal: {
                type: Type.STRING,
                description: 'Must be one of: BUY, SELL, HOLD, NO TRADE',
              },
              chartSignalFa: { type: Type.STRING },
              confidenceScore: { type: Type.NUMBER },
              bullishProbability: { type: Type.NUMBER },
              bearishProbability: { type: Type.NUMBER },
              weightedBreakdown: {
                type: Type.OBJECT,
                properties: {
                  technicalWeight: { type: Type.NUMBER },
                  technicalScore: { type: Type.NUMBER },
                  newsWeight: { type: Type.NUMBER },
                  newsScore: { type: Type.NUMBER },
                  marketWeight: { type: Type.NUMBER },
                  marketScore: { type: Type.NUMBER },
                  combinedScore: { type: Type.NUMBER },
                },
                required: [
                  'technicalWeight',
                  'technicalScore',
                  'newsWeight',
                  'newsScore',
                  'marketWeight',
                  'marketScore',
                  'combinedScore',
                ],
              },
              moduleDisagreements: { type: Type.STRING },
              decisionReasons: { type: Type.ARRAY, items: { type: Type.STRING } },
              confirmationConditions: { type: Type.ARRAY, items: { type: Type.STRING } },
              invalidationConditions: { type: Type.ARRAY, items: { type: Type.STRING } },
              riskDisclaimer: { type: Type.STRING },
            },
            required: [
              'finalDecision',
              'finalDecisionFa',
              'chartSignal',
              'chartSignalFa',
              'confidenceScore',
              'bullishProbability',
              'bearishProbability',
              'weightedBreakdown',
              'moduleDisagreements',
              'decisionReasons',
              'confirmationConditions',
              'invalidationConditions',
              'riskDisclaimer',
            ],
          },
          riskManagement: {
            type: Type.OBJECT,
            properties: {
              hasSufficientPriceData: { type: Type.BOOLEAN },
              isEstimated: { type: Type.BOOLEAN },
              estimationNote: { type: Type.STRING },
              entryZone: { type: Type.STRING },
              stopLoss: { type: Type.STRING },
              takeProfit1: { type: Type.STRING },
              takeProfit2: { type: Type.STRING },
              takeProfit3: { type: Type.STRING },
              riskRewardRatio: { type: Type.STRING },
              invalidationLevel: { type: Type.STRING },
              numericLevels: {
                type: Type.OBJECT,
                properties: {
                  current: { type: Type.NUMBER, nullable: true },
                  entryLow: { type: Type.NUMBER, nullable: true },
                  entryHigh: { type: Type.NUMBER, nullable: true },
                  stopLoss: { type: Type.NUMBER, nullable: true },
                  tp1: { type: Type.NUMBER, nullable: true },
                  tp2: { type: Type.NUMBER, nullable: true },
                  tp3: { type: Type.NUMBER, nullable: true },
                  invalidation: { type: Type.NUMBER, nullable: true },
                },
              },
            },
            required: [
              'hasSufficientPriceData',
              'isEstimated',
              'estimationNote',
              'entryZone',
              'stopLoss',
              'takeProfit1',
              'takeProfit2',
              'takeProfit3',
              'riskRewardRatio',
              'invalidationLevel',
            ],
          },
          technicalAnalysis: {
            type: Type.OBJECT,
            properties: {
              overallTrend: { type: Type.STRING },
              marketStructure: { type: Type.STRING },
              supportLevels: { type: Type.ARRAY, items: { type: Type.STRING } },
              resistanceLevels: { type: Type.ARRAY, items: { type: Type.STRING } },
              rsi: { type: Type.STRING },
              macd: { type: Type.STRING },
              movingAverages: { type: Type.STRING },
              bollingerBands: { type: Type.STRING },
              volumeAnalysis: { type: Type.STRING },
              candlestickPatterns: { type: Type.STRING },
              chartPatterns: { type: Type.STRING },
              breakoutPossibilities: { type: Type.STRING },
              divergences: { type: Type.STRING },
              fibonacciRetracement: { type: Type.STRING },
              priceAction: { type: Type.STRING },
              liquidityZones: { type: Type.STRING },
              momentum: { type: Type.STRING },
              bullishFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
              bearishFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'overallTrend',
              'marketStructure',
              'supportLevels',
              'resistanceLevels',
              'rsi',
              'macd',
              'movingAverages',
              'bollingerBands',
              'volumeAnalysis',
              'candlestickPatterns',
              'chartPatterns',
              'breakoutPossibilities',
              'divergences',
              'fibonacciRetracement',
              'priceAction',
              'liquidityZones',
              'momentum',
              'bullishFactors',
              'bearishFactors',
            ],
          },
          multiTimeframe: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timeframe: { type: Type.STRING, description: 'One of 5m, 15m, 1h, 4h, 1D' },
                provided: { type: Type.BOOLEAN },
                trend: { type: Type.STRING },
                bias: { type: Type.STRING, description: 'صعودی, نزولی, خنثی, or نامشخص' },
                summary: { type: Type.STRING },
              },
              required: ['timeframe', 'provided', 'trend', 'bias', 'summary'],
            },
          },
          newsAndFundamental: {
            type: Type.OBJECT,
            properties: {
              impactScore: { type: Type.NUMBER },
              last24hSummary: { type: Type.STRING },
              last7dSummary: { type: Type.STRING },
              last30dSummary: { type: Type.STRING },
              positiveNewsImpact: { type: Type.STRING },
              negativeNewsImpact: { type: Type.STRING },
              neutralNewsImpact: { type: Type.STRING },
              partnershipsAndUpdates: { type: Type.STRING },
              listingsAndDelistings: { type: Type.STRING },
              regulatoryDevelopments: { type: Type.STRING },
              securityIncidents: { type: Type.STRING },
              tokenUnlocksAndSupply: { type: Type.STRING },
              institutionalAndEtf: { type: Type.STRING },
              rumorsVsVerified: { type: Type.STRING },
              shortTermImpact: { type: Type.STRING },
              longTermImpact: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: newsItemSchema,
              },
            },
            required: [
              'impactScore',
              'last24hSummary',
              'last7dSummary',
              'last30dSummary',
              'positiveNewsImpact',
              'negativeNewsImpact',
              'neutralNewsImpact',
              'partnershipsAndUpdates',
              'listingsAndDelistings',
              'regulatoryDevelopments',
              'securityIncidents',
              'tokenUnlocksAndSupply',
              'institutionalAndEtf',
              'rumorsVsVerified',
              'shortTermImpact',
              'longTermImpact',
              'items',
            ],
          },
          marketConditions: {
            type: Type.OBJECT,
            properties: {
              overallMarketTrend: { type: Type.STRING },
              btcDirectionAndAltcoinImpact: { type: Type.STRING },
              ethTrend: { type: Type.STRING },
              btcDominanceAnalysis: { type: Type.STRING },
              totalMarketCapAnalysis: { type: Type.STRING },
              fearAndGreedAnalysis: { type: Type.STRING },
              marketVolatilityAndVolume: { type: Type.STRING },
              stablecoinMovements: { type: Type.STRING },
              altcoinStrength: { type: Type.STRING },
              liquidationsFundingOi: { type: Type.STRING },
              macroAndFedEvents: { type: Type.STRING },
              inflationAndEmployment: { type: Type.STRING },
              geopoliticalRisks: { type: Type.STRING },
            },
            required: [
              'overallMarketTrend',
              'btcDirectionAndAltcoinImpact',
              'ethTrend',
              'btcDominanceAnalysis',
              'totalMarketCapAnalysis',
              'fearAndGreedAnalysis',
              'marketVolatilityAndVolume',
              'stablecoinMovements',
              'altcoinStrength',
              'liquidationsFundingOi',
              'macroAndFedEvents',
              'inflationAndEmployment',
              'geopoliticalRisks',
            ],
          },
        },
        required: [
          'identification',
          'decisionEngine',
          'riskManagement',
          'technicalAnalysis',
          'multiTimeframe',
          'newsAndFundamental',
          'marketConditions',
        ],
      },
    },
  }));

  const parsed = safeJsonParse<Omit<ChartAnalysisReport, 'id' | 'createdAt'>>(response.text);

  // Enforce deterministic 45/30/25 weights & bounds cleanly
  const techScore = Math.max(-100, Math.min(100, Math.round(parsed.decisionEngine.weightedBreakdown.technicalScore)));
  const newsScore = Math.max(-100, Math.min(100, Math.round(parsed.decisionEngine.weightedBreakdown.newsScore)));
  const marketScore = Math.max(-100, Math.min(100, Math.round(parsed.decisionEngine.weightedBreakdown.marketScore)));
  const combinedScore = Math.round(techScore * 0.45 + newsScore * 0.30 + marketScore * 0.25);

  parsed.decisionEngine.weightedBreakdown = {
    technicalWeight: 45,
    technicalScore: techScore,
    newsWeight: 30,
    newsScore,
    marketWeight: 25,
    marketScore,
    combinedScore,
  };

  return {
    ...parsed,
    id: `cs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    liveSnapshotUsed: {
      globalMarket,
      tickerSnapshot,
    },
    groundingUrls,
  };
}

export async function generateNewsDashboard(
  assetSymbol = 'BTC',
  forceRefresh = false,
  env?: { geminiApiKey?: string; cryptoPanicApiKey?: string }
): Promise<NewsDashboardData> {
  const ai = getGeminiClient(env?.geminiApiKey);
  const { base } = normalizeCryptoTicker(assetSymbol);

  const [globalMarket, rawNews] = await Promise.all([
    fetchGlobalMarketData(forceRefresh),
    fetchRawCryptoNews(base, forceRefresh, env?.cryptoPanicApiKey),
  ]);

  const { groundedSummary, groundingUrls } = await gatherGroundedNewsAndMacro(
    ai,
    base,
    rawNews.items
  );

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today is ${today}.
Create a structured Persian real-time crypto news & macro dashboard for selected asset "${base}".
Use ONLY the verified live market data, raw RSS/API headlines, and grounded search briefing below. Never fabricate prices or fake news headlines. Distinguish verified news from rumors.

LIVE MARKET DATA:
${JSON.stringify(globalMarket, null, 2)}

RAW HEADLINES FROM COINDESK, COINTELEGRAPH, CRYPTOCOMPARE, CRYPTOPANIC:
${JSON.stringify(rawNews.items.slice(0, 24), null, 2)}

GROUNDED SEARCH BRIEFING (Asset + Fed/Macro/Geopolitics):
${groundedSummary}

Requirements:
- Return all text summaries and translated headlines in professional Persian.
- Score overallNewsScore from -100 to +100.
- Include up to 12 analyzed items in latestNews, plus topPositiveNews (up to 4) and topNegativeNews (up to 4).
- Include upcomingEconomicEvents (Fed FOMC, CPI inflation, NFP employment, etc.) based on grounded data.
- For each news item provide credibility ('high' | 'medium' | 'low'), verificationStatus ('verified' | 'rumor' | 'developing'), shortTermImpactFa, longTermImpactFa, impactScore (-100 to +100), source, publishedAt.`;

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallNewsScore: { type: Type.NUMBER },
          positiveCount: { type: Type.INTEGER },
          negativeCount: { type: Type.INTEGER },
          neutralCount: { type: Type.INTEGER },
          marketSentimentSummaryFa: { type: Type.STRING },
          btcConditionSummaryFa: { type: Type.STRING },
          assetSpecificSummaryFa: { type: Type.STRING },
          latestNews: { type: Type.ARRAY, items: newsItemSchema },
          topPositiveNews: { type: Type.ARRAY, items: newsItemSchema },
          topNegativeNews: { type: Type.ARRAY, items: newsItemSchema },
          upcomingEconomicEvents: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                dateLabel: { type: Type.STRING },
                importance: { type: Type.STRING, description: 'high, medium, or low' },
                impactOnCryptoFa: { type: Type.STRING },
                status: { type: Type.STRING },
              },
              required: ['title', 'dateLabel', 'importance', 'impactOnCryptoFa', 'status'],
            },
          },
        },
        required: [
          'overallNewsScore',
          'positiveCount',
          'negativeCount',
          'neutralCount',
          'marketSentimentSummaryFa',
          'btcConditionSummaryFa',
          'assetSpecificSummaryFa',
          'latestNews',
          'topPositiveNews',
          'topNegativeNews',
          'upcomingEconomicEvents',
        ],
      },
    },
  }));

  const parsed = safeJsonParse<Omit<NewsDashboardData, 'lastUpdated' | 'selectedAsset' | 'sources' | 'groundingUrls'>>(
    response.text
  );

  const combinedSources: DataSourceHealth[] = [
    ...rawNews.sources,
    ...globalMarket.sources,
    {
      name: 'Google Search Grounding',
      status: groundingUrls.length > 0 ? 'online' : 'unavailable',
      message: groundingUrls.length > 0 ? undefined : 'نتیجه جستجوی وب محدود بود',
      lastUpdated: new Date().toISOString(),
    },
  ];

  return {
    ...parsed,
    lastUpdated: new Date().toISOString(),
    selectedAsset: base,
    sources: combinedSources,
    groundingUrls,
  };
}

export async function answerChatQuestion(params: {
  question: string;
  history: ChatMessage[];
  report: ChartAnalysisReport | null;
  globalMarket?: GlobalMarketData | null;
  env?: { geminiApiKey?: string };
}): Promise<string> {
  const ai = getGeminiClient(params.env?.geminiApiKey);
  const { question, history, report, globalMarket } = params;

  const contextSummary = report
    ? JSON.stringify({
        identification: report.identification,
        decisionEngine: report.decisionEngine,
        riskManagement: report.riskManagement,
        technicalAnalysis: report.technicalAnalysis,
        multiTimeframe: report.multiTimeframe,
        newsAndFundamental: {
          impactScore: report.newsAndFundamental.impactScore,
          last24hSummary: report.newsAndFundamental.last24hSummary,
          last7dSummary: report.newsAndFundamental.last7dSummary,
          rumorsVsVerified: report.newsAndFundamental.rumorsVsVerified,
        },
        marketConditions: report.marketConditions,
      })
    : JSON.stringify({
        note: 'هیچ چارتی هنوز آپلود و تحلیل نشده است.',
        globalMarket: globalMarket || 'در دسترس نیست',
      });

  const historyText = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'کاربر' : 'تحلیلگر'}: ${m.content}`)
    .join('\n');

  const systemInstruction = `You are the AI Trading Analyst inside CRYPTO SCOPE AI.
Respond strictly in clear, professional Persian (فارسی).
Rules:
- Base every answer strictly on the provided chart analysis report and verified live market context.
- Never invent indicator numbers or prices that were not observed.
- Never guarantee profits; remind the user of risk management and invalidation conditions when appropriate.
- If the user asks to explain in simple Persian ("توضیح به زبان ساده"), avoid heavy jargon and explain clearly step-by-step.`;

  const prompt = `ANALYSIS & MARKET CONTEXT:
${contextSummary}

CONVERSATION HISTORY:
${historyText || 'شروع گفتگو'}

USER QUESTION:
${question}`;

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      },
    })
  );

  return response.text || 'پاسخی از مدل دریافت نشد. لطفاً دوباره تلاش کنید.';
}
