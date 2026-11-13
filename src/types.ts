export type TimeframeKey = '5m' | '15m' | '1h' | '4h' | '1D';

export type CombinedDecisionType =
  | 'STRONG BUY'
  | 'BUY'
  | 'WAIT'
  | 'SELL'
  | 'STRONG SELL'
  | 'NO TRADE';

export type ChartSignalType = 'BUY' | 'SELL' | 'HOLD' | 'NO TRADE';

export type DataSourceHealth = {
  name: string;
  status: 'online' | 'unavailable';
  message?: string;
  lastUpdated: string;
};

export interface GlobalMarketData {
  lastUpdated: string;
  sources: DataSourceHealth[];
  btc: {
    available: boolean;
    priceUsd?: number;
    change24h?: number;
    high24h?: number;
    low24h?: number;
    volume24hUsd?: number;
    fundingRate?: number;
    openInterestUsd?: number;
    error?: string;
  };
  eth: {
    available: boolean;
    priceUsd?: number;
    change24h?: number;
    high24h?: number;
    low24h?: number;
    volume24hUsd?: number;
    error?: string;
  };
  global: {
    available: boolean;
    totalMarketCapUsd?: number;
    totalMarketCapChange24h?: number;
    totalVolume24hUsd?: number;
    btcDominance?: number;
    ethDominance?: number;
    stablecoinMarketCapUsd?: number;
    stablecoinChange24h?: number;
    error?: string;
  };
  fearAndGreed: {
    available: boolean;
    value?: number;
    classification?: string;
    classificationFa?: string;
    previousValue?: number;
    history?: { value: number; date: string }[];
    error?: string;
  };
}

export interface TickerMarketSnapshot {
  symbol: string;
  pair: string;
  available: boolean;
  source?: string;
  priceUsd?: number;
  change24h?: number;
  high24h?: number;
  low24h?: number;
  volume24hUsd?: number;
  fundingRate?: number;
  openInterest?: number;
  marketCapUsd?: number;
  error?: string;
  fetchedAt: string;
}

export interface AnalyzedNewsItem {
  id: string;
  title: string;
  titleFa: string;
  summaryFa: string;
  source: string;
  url?: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impactScore: number; // -100 to +100
  credibility: 'high' | 'medium' | 'low';
  credibilityFa: string;
  verificationStatus: 'verified' | 'rumor' | 'developing';
  verificationStatusFa: string;
  shortTermImpactFa: string;
  longTermImpactFa: string;
  category: string;
  relatedAssets: string[];
}

export interface EconomicEvent {
  title: string;
  dateLabel: string;
  importance: 'high' | 'medium' | 'low';
  impactOnCryptoFa: string;
  status: string;
}

export interface NewsDashboardData {
  lastUpdated: string;
  selectedAsset: string;
  sources: DataSourceHealth[];
  overallNewsScore: number; // -100 to +100
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  marketSentimentSummaryFa: string;
  btcConditionSummaryFa: string;
  assetSpecificSummaryFa: string;
  latestNews: AnalyzedNewsItem[];
  topPositiveNews: AnalyzedNewsItem[];
  topNegativeNews: AnalyzedNewsItem[];
  upcomingEconomicEvents: EconomicEvent[];
  groundingUrls?: { title: string; uri: string }[];
}

export interface UploadedChartFrame {
  timeframe: TimeframeKey | 'auto';
  fileName: string;
  mimeType: string;
  base64Data: string;
  previewUrl: string;
}

export interface TimeframeAnalysisEntry {
  timeframe: TimeframeKey;
  provided: boolean;
  trend: string;
  bias: 'صعودی' | 'نزولی' | 'خنثی' | 'نامشخص';
  summary: string;
}

export interface ChartAnalysisReport {
  id: string;
  createdAt: string;
  identification: {
    symbol: string;
    coinNameFa: string;
    exchange: string;
    detectedTimeframe: string;
    currentPriceText: string;
    verifiedLivePriceUsd?: number;
    priceVerified: boolean;
    visibleIndicators: string[];
    needsUserInput: boolean;
    missingInfoQuestions: string[];
    chartQualityNote: string;
  };
  decisionEngine: {
    finalDecision: CombinedDecisionType;
    finalDecisionFa: string;
    chartSignal: ChartSignalType;
    chartSignalFa: string;
    confidenceScore: number; // 0-100
    bullishProbability: number; // 0-100
    bearishProbability: number; // 0-100
    weightedBreakdown: {
      technicalWeight: 45;
      technicalScore: number; // -100 to +100
      newsWeight: 30;
      newsScore: number; // -100 to +100
      marketWeight: 25;
      marketScore: number; // -100 to +100
      combinedScore: number; // -100 to +100
    };
    moduleDisagreements: string;
    decisionReasons: string[];
    confirmationConditions: string[];
    invalidationConditions: string[];
    riskDisclaimer: string;
  };
  riskManagement: {
    hasSufficientPriceData: boolean;
    isEstimated: boolean;
    estimationNote: string;
    entryZone: string;
    stopLoss: string;
    takeProfit1: string;
    takeProfit2: string;
    takeProfit3: string;
    riskRewardRatio: string;
    invalidationLevel: string;
    numericLevels?: {
      current?: number | null;
      entryLow?: number | null;
      entryHigh?: number | null;
      stopLoss?: number | null;
      tp1?: number | null;
      tp2?: number | null;
      tp3?: number | null;
      invalidation?: number | null;
    };
  };
  technicalAnalysis: {
    overallTrend: string;
    marketStructure: string;
    supportLevels: string[];
    resistanceLevels: string[];
    rsi: string;
    macd: string;
    movingAverages: string;
    bollingerBands: string;
    volumeAnalysis: string;
    candlestickPatterns: string;
    chartPatterns: string;
    breakoutPossibilities: string;
    divergences: string;
    fibonacciRetracement: string;
    priceAction: string;
    liquidityZones: string;
    momentum: string;
    bullishFactors: string[];
    bearishFactors: string[];
  };
  multiTimeframe: TimeframeAnalysisEntry[];
  newsAndFundamental: {
    impactScore: number; // -100 to +100
    last24hSummary: string;
    last7dSummary: string;
    last30dSummary: string;
    positiveNewsImpact: string;
    negativeNewsImpact: string;
    neutralNewsImpact: string;
    partnershipsAndUpdates: string;
    listingsAndDelistings: string;
    regulatoryDevelopments: string;
    securityIncidents: string;
    tokenUnlocksAndSupply: string;
    institutionalAndEtf: string;
    rumorsVsVerified: string;
    shortTermImpact: string;
    longTermImpact: string;
    items: AnalyzedNewsItem[];
  };
  marketConditions: {
    overallMarketTrend: string;
    btcDirectionAndAltcoinImpact: string;
    ethTrend: string;
    btcDominanceAnalysis: string;
    totalMarketCapAnalysis: string;
    fearAndGreedAnalysis: string;
    marketVolatilityAndVolume: string;
    stablecoinMovements: string;
    altcoinStrength: string;
    liquidationsFundingOi: string;
    macroAndFedEvents: string;
    inflationAndEmployment: string;
    geopoliticalRisks: string;
  };
  liveSnapshotUsed?: {
    globalMarket?: GlobalMarketData;
    tickerSnapshot?: TickerMarketSnapshot | null;
  };
  groundingUrls?: { title: string; uri: string }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AnalysisHistoryEntry {
  id: string;
  createdAt: string;
  symbol: string;
  timeframe: string;
  finalDecision: CombinedDecisionType;
  finalDecisionFa: string;
  confidenceScore: number;
  combinedScore: number;
  thumbnailDataUrl: string;
  report: ChartAnalysisReport;
}
