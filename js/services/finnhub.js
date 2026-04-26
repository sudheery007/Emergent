/* ===== FINNHUB SERVICE ===== */
const FinnhubService = (() => {

  function apiUrl(endpoint, params = {}) {
    const key = Config.getKey('FINNHUB_KEY');
    if (!key) return null;
    const url = new URL(`${Config.API.FINNHUB_BASE}/${endpoint}`);
    url.searchParams.set('token', key);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  }

  function track() { Config.incrementUsage('finnhub'); }

  async function getCompanyProfile(ticker) {
    const url = apiUrl('stock/profile2', { symbol: ticker });
    if (!url) return null;
    try {
      track();
      return await Utils.cachedFetch(`fh_profile_${ticker}`, url);
    } catch (e) { console.warn('Finnhub profile failed:', e); return null; }
  }

  async function getEarnings(ticker) {
    const url = apiUrl('stock/earnings', { symbol: ticker });
    if (!url) return [];
    try {
      track();
      return await Utils.cachedFetch(`fh_earnings_${ticker}`, url) || [];
    } catch (e) { console.warn('Finnhub earnings failed:', e); return []; }
  }

  async function getRecommendations(ticker) {
    const url = apiUrl('stock/recommendation', { symbol: ticker });
    if (!url) return [];
    try {
      track();
      return await Utils.cachedFetch(`fh_reco_${ticker}`, url) || [];
    } catch (e) { console.warn('Finnhub recommendations failed:', e); return []; }
  }

  async function getEarningsCalendar(ticker) {
    const url = apiUrl('stock/earnings', { symbol: ticker });
    if (!url) return [];
    try {
      track();
      return await Utils.cachedFetch(`fh_ecal_${ticker}`, url) || [];
    } catch (e) { return []; }
  }

  async function getInsiderTransactions(ticker) {
    const url = apiUrl('stock/insider-transactions', { symbol: ticker });
    if (!url) return null;
    try {
      track();
      return await Utils.cachedFetch(`fh_insider_${ticker}`, url);
    } catch (e) { console.warn('Finnhub insider tx failed:', e); return null; }
  }

  async function getOwnership(ticker) {
    const url = apiUrl('stock/ownership', { symbol: ticker });
    if (!url) return null;
    try {
      track();
      return await Utils.cachedFetch(`fh_ownership_${ticker}`, url);
    } catch (e) { console.warn('Finnhub ownership failed:', e); return null; }
  }

  async function getBasicFinancials(ticker) {
    const url = apiUrl('stock/metric', { symbol: ticker, metric: 'all' });
    if (!url) return null;
    try {
      track();
      return await Utils.cachedFetch(`fh_metrics_${ticker}`, url);
    } catch (e) { console.warn('Finnhub metrics failed:', e); return null; }
  }

  async function getCompanyNews(ticker, fromDate, toDate) {
    const from = fromDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = toDate || new Date().toISOString().slice(0, 10);
    const url = apiUrl('company-news', { symbol: ticker, from, to });
    if (!url) return [];
    try {
      track();
      return await Utils.cachedFetch(`fh_news_${ticker}`, url) || [];
    } catch (e) { return []; }
  }

  return {
    getCompanyProfile, getEarnings, getRecommendations, getEarningsCalendar,
    getInsiderTransactions, getOwnership, getBasicFinancials, getCompanyNews,
  };
})();
