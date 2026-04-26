/* ===== ALPHA VANTAGE SERVICE ===== */
const AlphaVantageService = (() => {

  function apiUrl(fnName, params = {}) {
    const key = Config.getKey('AV_KEY');
    if (!key) return null;
    const url = new URL(Config.API.AV_BASE);
    url.searchParams.set('function', fnName);
    url.searchParams.set('apikey', key);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  }

  function track() { Config.incrementUsage('av'); }

  async function getOverview(ticker) {
    const url = apiUrl('OVERVIEW', { symbol: ticker });
    if (!url) return null;
    try {
      track();
      const data = await Utils.cachedFetch(`av_overview_${ticker}`, url);
      if (data?.Note || data?.Information) { console.warn('AV rate limit'); return null; }
      return data;
    } catch (e) { console.warn('AV overview failed:', e); return null; }
  }

  async function getEarnings(ticker) {
    const url = apiUrl('EARNINGS', { symbol: ticker });
    if (!url) return null;
    try {
      track();
      const data = await Utils.cachedFetch(`av_earnings_${ticker}`, url);
      if (data?.Note || data?.Information) return null;
      return data;
    } catch (e) { console.warn('AV earnings failed:', e); return null; }
  }

  async function getIncomeStatement(ticker) {
    const url = apiUrl('INCOME_STATEMENT', { symbol: ticker });
    if (!url) return null;
    try {
      track();
      const data = await Utils.cachedFetch(`av_income_${ticker}`, url);
      if (data?.Note || data?.Information) return null;
      return data;
    } catch (e) { console.warn('AV income failed:', e); return null; }
  }

  async function getBalanceSheet(ticker) {
    const url = apiUrl('BALANCE_SHEET', { symbol: ticker });
    if (!url) return null;
    try {
      track();
      const data = await Utils.cachedFetch(`av_balance_${ticker}`, url);
      if (data?.Note || data?.Information) return null;
      return data;
    } catch (e) { return null; }
  }

  async function getCashFlow(ticker) {
    const url = apiUrl('CASH_FLOW', { symbol: ticker });
    if (!url) return null;
    try {
      track();
      const data = await Utils.cachedFetch(`av_cashflow_${ticker}`, url);
      if (data?.Note || data?.Information) return null;
      return data;
    } catch (e) { return null; }
  }

  return { getOverview, getEarnings, getIncomeStatement, getBalanceSheet, getCashFlow };
})();
