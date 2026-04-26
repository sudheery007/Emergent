/* ===== FINANCIAL MODELING PREP SERVICE (STABLE API) ===== */
const FMPService = (() => {

  const STABLE_BASE = 'https://financialmodelingprep.com/stable';

  function apiUrl(endpoint, params = {}) {
    const key = Config.getKey('FMP_KEY');
    if (!key) return null;
    const url = new URL(`${STABLE_BASE}/${endpoint}`);
    url.searchParams.set('apikey', key);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    return url.toString();
  }

  function track() { Config.incrementUsage('fmp'); }

  async function getProfile(ticker) {
    const url = apiUrl('profile', { symbol: ticker });
    if (!url) return null;
    try {
      track();
      const data = await Utils.cachedFetch(`fmp_profile_${ticker}`, url);
      return Array.isArray(data) ? data[0] || null : data;
    } catch (e) { console.warn('FMP profile failed:', e); return null; }
  }

  async function getQuote(ticker) {
    const url = apiUrl('quote', { symbol: ticker });
    if (!url) return null;
    try {
      track();
      const data = await Utils.fetchJSON(url); // Don't cache quotes
      return Array.isArray(data) ? data[0] || null : data;
    } catch (e) { console.warn('FMP quote failed:', e); return null; }
  }

  async function getIncomeStatement(ticker, period = 'quarter', limit = 20) {
    const url = apiUrl('income-statement', { symbol: ticker, period, limit });
    if (!url) return [];
    try {
      track();
      return await Utils.cachedFetch(`fmp_income_${ticker}_${period}_${limit}`, url) || [];
    } catch (e) { console.warn('FMP income statement failed:', e); return []; }
  }

  async function getBalanceSheet(ticker, period = 'quarter', limit = 20) {
    const url = apiUrl('balance-sheet-statement', { symbol: ticker, period, limit });
    if (!url) return [];
    try {
      track();
      return await Utils.cachedFetch(`fmp_bs_${ticker}_${period}_${limit}`, url) || [];
    } catch (e) { console.warn('FMP balance sheet failed:', e); return []; }
  }

  async function getCashFlow(ticker, period = 'quarter', limit = 20) {
    const url = apiUrl('cash-flow-statement', { symbol: ticker, period, limit });
    if (!url) return [];
    try {
      track();
      return await Utils.cachedFetch(`fmp_cf_${ticker}_${period}_${limit}`, url) || [];
    } catch (e) { console.warn('FMP cash flow failed:', e); return []; }
  }

  async function getKeyMetrics(ticker, period = 'quarter', limit = 20) {
    const url = apiUrl('key-metrics', { symbol: ticker, limit });
    if (!url) return [];
    try {
      track();
      return await Utils.cachedFetch(`fmp_metrics_${ticker}_${period}_${limit}`, url) || [];
    } catch (e) { console.warn('FMP key metrics failed:', e); return []; }
  }

  async function getRatios(ticker, period = 'quarter', limit = 20) {
    const url = apiUrl('ratios', { symbol: ticker, period, limit });
    if (!url) return [];
    try {
      track();
      return await Utils.cachedFetch(`fmp_ratios_${ticker}_${period}_${limit}`, url) || [];
    } catch (e) { console.warn('FMP ratios failed:', e); return []; }
  }

  async function getRatiosTTM(ticker) {
    const url = apiUrl('ratios-ttm', { symbol: ticker });
    if (!url) return null;
    try {
      track();
      const data = await Utils.cachedFetch(`fmp_ratios_ttm_${ticker}`, url);
      return Array.isArray(data) ? data[0] || null : data;
    } catch (e) { console.warn('FMP ratios TTM failed:', e); return null; }
  }

  async function getEnterpriseValue(ticker, period = 'quarter', limit = 4) {
    const url = apiUrl('enterprise-values', { symbol: ticker, period, limit });
    if (!url) return [];
    try {
      track();
      return await Utils.cachedFetch(`fmp_ev_${ticker}_${period}`, url) || [];
    } catch (e) { console.warn('FMP EV failed:', e); return []; }
  }

  async function searchTicker(query) {
    const url = apiUrl('search-name', { query, limit: '10' });
    if (!url) return [];
    try {
      track();
      return await Utils.fetchJSON(url) || [];
    } catch (e) { console.warn('FMP search failed:', e); return []; }
  }

  async function getStockPeers(ticker) {
    const url = apiUrl('stock_peers', { symbol: ticker });
    if (!url) return [];
    try {
      track();
      const data = await Utils.cachedFetch(`fmp_peers_${ticker}`, url);
      return Array.isArray(data) && data[0]?.peersList ? data[0].peersList : [];
    } catch (e) { return []; }
  }

  return {
    getProfile, getQuote, getIncomeStatement, getBalanceSheet, getCashFlow,
    getKeyMetrics, getRatios, getRatiosTTM, getEnterpriseValue, searchTicker,
    getStockPeers,
  };
})();
