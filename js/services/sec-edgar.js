/* ===== SEC EDGAR SERVICE ===== */
const SecEdgarService = (() => {

  let tickerMap = null; // { AAPL: { cik: '0000320193', name: 'Apple Inc' }, ... }

  async function loadTickerMap() {
    if (tickerMap) return tickerMap;
    const cacheKey = 'sec_tickers';
    const cached = Utils.cacheGet(cacheKey);
    if (cached) { tickerMap = cached; return tickerMap; }

    try {
      const data = await Utils.fetchJSON(
        Config.CORS_PROXY + encodeURIComponent(Config.API.SEC_TICKERS_URL)
      );
      tickerMap = {};
      Object.values(data).forEach(entry => {
        const ticker = (entry.ticker || '').toUpperCase();
        if (ticker) {
          tickerMap[ticker] = {
            cik: String(entry.cik_str).padStart(10, '0'),
            name: entry.title || '',
          };
        }
      });
      Utils.cacheSet(cacheKey, tickerMap);
      return tickerMap;
    } catch (e) {
      console.warn('SEC ticker map load failed:', e);
      tickerMap = {};
      return tickerMap;
    }
  }

  async function resolveTicker(ticker) {
    const map = await loadTickerMap();
    const upper = ticker.toUpperCase().trim();
    if (map[upper]) return { ticker: upper, cik: map[upper].cik, name: map[upper].name };
    return null;
  }

  async function searchCompanies(query) {
    const map = await loadTickerMap();
    const q = query.toUpperCase().trim();
    const results = [];
    for (const [ticker, info] of Object.entries(map)) {
      if (ticker.startsWith(q) || info.name.toUpperCase().includes(q)) {
        results.push({ ticker, name: info.name, cik: info.cik });
        if (results.length >= 10) break;
      }
    }
    return results;
  }

  async function getCompanyFacts(cik) {
    const cacheKey = `sec_facts_${cik}`;
    try {
      const url = `${Config.API.SEC_EDGAR_BASE}/api/xbrl/companyfacts/CIK${cik}.json`;
      const data = await Utils.cachedFetch(
        cacheKey,
        Config.CORS_PROXY + encodeURIComponent(url)
      );
      return data;
    } catch (e) {
      console.warn('SEC company facts failed:', e);
      return null;
    }
  }

  function extractFact(facts, taxonomy, concept, unit = 'USD') {
    if (!facts || !facts.facts) return [];
    const taxData = facts.facts[taxonomy];
    if (!taxData || !taxData[concept]) return [];
    const conceptData = taxData[concept];
    const unitData = conceptData.units?.[unit] || conceptData.units?.['USD/shares'] || conceptData.units?.['pure'] || [];
    return unitData.sort((a, b) => (a.end || '').localeCompare(b.end || ''));
  }

  function getLatestFact(facts, taxonomy, concept, unit = 'USD') {
    const vals = extractFact(facts, taxonomy, concept, unit);
    // Filter for annual (10-K) or quarterly (10-Q) filings
    const quarterly = vals.filter(v => v.form === '10-Q' || v.form === '10-K');
    if (quarterly.length === 0) return vals.length > 0 ? vals[vals.length - 1] : null;
    return quarterly[quarterly.length - 1];
  }

  function getRecentQuarterlyFacts(facts, taxonomy, concept, unit = 'USD', limit = 20) {
    const vals = extractFact(facts, taxonomy, concept, unit);
    const quarterly = vals.filter(v => v.form === '10-Q' || v.form === '10-K');
    return quarterly.slice(-limit);
  }

  async function getFinancialData(cik) {
    const facts = await getCompanyFacts(cik);
    if (!facts) return null;

    const data = {
      revenue: getRecentQuarterlyFacts(facts, 'us-gaap', 'Revenues') 
        .concat(getRecentQuarterlyFacts(facts, 'us-gaap', 'RevenueFromContractWithCustomerExcludingAssessedTax')),
      netIncome: getRecentQuarterlyFacts(facts, 'us-gaap', 'NetIncomeLoss'),
      totalAssets: getRecentQuarterlyFacts(facts, 'us-gaap', 'Assets'),
      totalLiabilities: getRecentQuarterlyFacts(facts, 'us-gaap', 'Liabilities'),
      totalEquity: getRecentQuarterlyFacts(facts, 'us-gaap', 'StockholdersEquity'),
      longTermDebt: getRecentQuarterlyFacts(facts, 'us-gaap', 'LongTermDebt')
        .concat(getRecentQuarterlyFacts(facts, 'us-gaap', 'LongTermDebtNoncurrent')),
      operatingIncome: getRecentQuarterlyFacts(facts, 'us-gaap', 'OperatingIncomeLoss'),
      eps: getRecentQuarterlyFacts(facts, 'us-gaap', 'EarningsPerShareBasic', 'USD/shares'),
      shares: getRecentQuarterlyFacts(facts, 'us-gaap', 'CommonStockSharesOutstanding', 'shares')
        .concat(getRecentQuarterlyFacts(facts, 'us-gaap', 'EntityCommonStockSharesOutstanding', 'shares')),
      rawFacts: facts,
    };

    return data;
  }

  return {
    loadTickerMap, resolveTicker, searchCompanies,
    getCompanyFacts, extractFact, getLatestFact, getRecentQuarterlyFacts,
    getFinancialData,
  };
})();
