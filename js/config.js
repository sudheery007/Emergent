/* ===== EMERGENT CONFIGURATION ===== */
const Config = (() => {
  const STORAGE_KEYS = {
    FMP_KEY: 'emergent_fmp_key',
    FINNHUB_KEY: 'emergent_finnhub_key',
    AV_KEY: 'emergent_av_key',
    PORTFOLIO: 'emergent_portfolio',
    RECENT: 'emergent_recent',
    CACHE_PREFIX: 'emergent_cache_',
    USAGE: 'emergent_usage',
  };

  const API = {
    SEC_EDGAR_BASE: 'https://data.sec.gov',
    SEC_EFTS_BASE: 'https://efts.sec.gov/LATEST',
    SEC_TICKERS_URL: 'https://www.sec.gov/files/company_tickers.json',
    FMP_BASE: 'https://financialmodelingprep.com/api/v3',
    FINNHUB_BASE: 'https://finnhub.io/api/v1',
    AV_BASE: 'https://www.alphavantage.co/query',
  };

  const LIMITS = {
    FMP_DAILY: 250,
    FINNHUB_PER_MIN: 60,
    AV_DAILY: 25,
    CACHE_TTL: 3600000, // 1 hour
    RECENT_MAX: 12,
  };

  const SEC_HEADERS = {};
  const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

  function getKey(name) {
    return localStorage.getItem(STORAGE_KEYS[name]) || '';
  }

  function setKey(name, value) {
    localStorage.setItem(STORAGE_KEYS[name], value);
  }

  function hasKey(name) {
    const k = getKey(name);
    return k && k.trim().length > 0;
  }

  function getUsage() {
    const raw = localStorage.getItem(STORAGE_KEYS.USAGE);
    if (!raw) return { date: '', fmp: 0, finnhub: 0, av: 0 };
    const data = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (data.date !== today) return { date: today, fmp: 0, finnhub: 0, av: 0 };
    return data;
  }

  function incrementUsage(service) {
    const usage = getUsage();
    usage.date = new Date().toISOString().slice(0, 10);
    usage[service] = (usage[service] || 0) + 1;
    localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(usage));
    return usage;
  }

  return { STORAGE_KEYS, API, LIMITS, SEC_HEADERS, CORS_PROXY, getKey, setKey, hasKey, getUsage, incrementUsage };
})();
