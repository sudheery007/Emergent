/* ===== DATA ORCHESTRATOR ===== */
const DataOrchestrator = (() => {

  async function fetchAllData(ticker, onProgress) {
    const result = {
      ticker: ticker.toUpperCase(),
      profile: null,
      quote: null,
      incomeStatements: [],
      balanceSheets: [],
      cashFlows: [],
      keyMetrics: [],
      ratios: [],
      ratiosTTM: null,
      earnings: [],
      recommendations: [],
      ownership: null,
      overview: null,
      secFacts: null,
      finnhubMetrics: null,
      errors: [],
    };

    const steps = [
      'Resolving ticker...',
      'Fetching company profile...',
      'Fetching financial statements...',
      'Fetching ratios & metrics...',
      'Fetching earnings data...',
      'Fetching ownership data...',
      'Compiling analysis...',
    ];

    let stepIdx = 0;
    const progress = (msg) => {
      if (onProgress) onProgress(msg || steps[stepIdx] || 'Processing...', stepIdx, steps);
      stepIdx++;
    };

    // Step 1: Resolve ticker via SEC
    progress();
    const secInfo = await SecEdgarService.resolveTicker(ticker);
    if (secInfo) {
      result.secCik = secInfo.cik;
      result.secName = secInfo.name;
    }

    // Step 2: Company profile & quote
    progress();
    const [fmpProfile, fmpQuote, fhProfile, avOverview] = await Promise.all([
      FMPService.getProfile(ticker),
      FMPService.getQuote(ticker),
      FinnhubService.getCompanyProfile(ticker),
      AlphaVantageService.getOverview(ticker),
    ]);

    result.profile = mergeProfile(fmpProfile, fhProfile, avOverview, secInfo);
    result.quote = fmpQuote;
    result.overview = avOverview;

    // Step 3: Financial statements
    progress();
    const [income, balance, cashFlow] = await Promise.all([
      FMPService.getIncomeStatement(ticker),
      FMPService.getBalanceSheet(ticker),
      FMPService.getCashFlow(ticker),
    ]);
    result.incomeStatements = income || [];
    result.balanceSheets = balance || [];
    result.cashFlows = cashFlow || [];

    // Step 4: Ratios & metrics
    progress();
    const [metrics, ratios, ratiosTTM, fhMetrics] = await Promise.all([
      FMPService.getKeyMetrics(ticker),
      FMPService.getRatios(ticker),
      FMPService.getRatiosTTM(ticker),
      FinnhubService.getBasicFinancials(ticker),
    ]);
    result.keyMetrics = metrics || [];
    result.ratios = ratios || [];
    result.ratiosTTM = ratiosTTM;
    result.finnhubMetrics = fhMetrics;

    // Step 5: Earnings & recommendations
    progress();
    const [fhEarnings, fhReco, avEarnings] = await Promise.all([
      FinnhubService.getEarnings(ticker),
      FinnhubService.getRecommendations(ticker),
      AlphaVantageService.getEarnings(ticker),
    ]);
    result.earnings = fhEarnings || [];
    result.recommendations = fhReco || [];
    result.avEarnings = avEarnings;

    // Step 6: Ownership & SEC facts
    progress();
    const [ownership, secFacts] = await Promise.all([
      FinnhubService.getOwnership(ticker),
      secInfo ? SecEdgarService.getFinancialData(secInfo.cik) : Promise.resolve(null),
    ]);
    result.ownership = ownership;
    result.secFacts = secFacts;

    // Step 7: Done
    progress();

    return result;
  }

  function mergeProfile(fmp, fh, av, sec) {
    const p = {};
    // Prefer FMP stable API, fallback to Finnhub, then AV, then SEC
    p.name = fmp?.companyName || fh?.name || av?.Name || sec?.name || '';
    p.ticker = fmp?.symbol || fh?.ticker || av?.Symbol || '';
    p.exchange = fmp?.exchange || fmp?.exchangeShortName || fh?.exchange || av?.Exchange || '';
    p.sector = fmp?.sector || fh?.finnhubIndustry || av?.Sector || '';
    p.industry = fmp?.industry || fh?.finnhubIndustry || av?.Industry || '';
    p.description = fmp?.description || av?.Description || '';
    p.marketCap = fmp?.marketCap || fmp?.mktCap || (fh?.marketCapitalization ? fh.marketCapitalization * 1e6 : 0) || parseFloat(av?.MarketCapitalization) || 0;
    p.logo = fh?.logo || fmp?.image || '';
    p.website = fmp?.website || fh?.weburl || '';
    p.country = fmp?.country || fh?.country || av?.Country || '';
    p.employees = fmp?.fullTimeEmployees || av?.FullTimeEmployees || '';
    p.ipoDate = fmp?.ipoDate || fh?.ipo || '';
    p.currency = fmp?.currency || fh?.currency || av?.Currency || 'USD';
    return p;
  }

  return { fetchAllData };
})();
