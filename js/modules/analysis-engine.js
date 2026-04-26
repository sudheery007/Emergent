/* ===== ANALYSIS ENGINE ===== */
const AnalysisEngine = (() => {

  function generateAnalysis(data) {
    return {
      bullCase: generateBullCase(data),
      bearCase: generateBearCase(data),
      financialRatios: generateFinancialRatios(data),
      quarterlyResults: generateQuarterlyResults(data),
      earningsHighlights: generateEarningsHighlights(data),
      redFlags: generateRedFlags(data),
      ownership: generateOwnership(data),
    };
  }

  /* --- Bull Case --- */
  function generateBullCase(data) {
    const points = [];
    const profile = data.profile || {};
    const income = data.incomeStatements || [];
    const ratios = data.ratiosTTM || {};
    const overview = data.overview || {};
    const bs = data.balanceSheets?.[0] || {};

    // Revenue growth
    if (income.length >= 8) {
      const recentRev = income.slice(0, 4).reduce((a, q) => a + (q.revenue || 0), 0);
      const priorRev = income.slice(4, 8).reduce((a, q) => a + (q.revenue || 0), 0);
      if (priorRev > 0) {
        const g = (recentRev - priorRev) / priorRev;
        if (g > 0.05) points.push(`Revenue growing at ${(g * 100).toFixed(1)}% YoY, demonstrating continued demand for products/services.`);
      }
    }

    // Profitability
    const margin = ratios.netProfitMarginTTM || parseFloat(overview.ProfitMargin);
    if (margin > 0.15) points.push(`Net profit margin of ${(margin * 100).toFixed(1)}% indicates strong pricing power and operational efficiency.`);

    const roe = ratios.returnOnEquityTTM || parseFloat(overview.ReturnOnEquityTTM);
    if (roe > 0.15) points.push(`ROE of ${(roe * 100).toFixed(1)}% shows effective use of shareholder capital to generate returns.`);

    // Market position
    if (profile.marketCap > 100e9) points.push(`Market cap of ${Utils.fmtLargeNumber(profile.marketCap)} — a dominant large-cap position providing stability and market influence.`);
    else if (profile.marketCap > 10e9) points.push(`Solid mid-to-large-cap position with ${Utils.fmtLargeNumber(profile.marketCap)} market cap offers both stability and growth potential.`);

    // Cash flow
    const cf = data.cashFlows?.[0];
    if (cf && cf.freeCashFlow > 0) points.push(`Generating positive free cash flow (${Utils.fmtLargeNumber(cf.freeCashFlow)}), supporting reinvestment, buybacks, or dividends.`);

    // Low leverage
    const de = ratios.debtEquityRatioTTM;
    if (de != null && de < 0.5) points.push(`Conservative balance sheet with D/E of ${de.toFixed(2)} provides financial flexibility.`);

    // Analyst sentiment
    const reco = data.recommendations?.[0];
    if (reco) {
      const buys = (reco.strongBuy || 0) + (reco.buy || 0);
      const total = buys + (reco.hold || 0) + (reco.sell || 0) + (reco.strongSell || 0);
      if (total > 0 && buys / total > 0.5) points.push(`${Math.round(buys / total * 100)}% of analyst ratings are Buy or Strong Buy, reflecting positive institutional sentiment.`);
    }

    // Earnings beats
    const earnings = data.earnings || [];
    const recentBeats = earnings.slice(0, 4).filter(e => e.actual > e.estimate).length;
    if (recentBeats >= 3) points.push(`Consistently beating earnings estimates (${recentBeats}/4 recent quarters), signaling strong execution.`);

    // Dividend
    const dy = ratios.dividendYielTTM || ratios.dividendYieldTTM || parseFloat(overview.DividendYield);
    if (dy > 0.02) points.push(`Provides ${(dy * 100).toFixed(1)}% dividend yield, attractive for income-oriented investors.`);

    // Target price upside
    const target = parseFloat(overview.AnalystTargetPrice);
    const price = data.quote?.price;
    if (target && price && target > price) {
      points.push(`Analyst target price of $${target.toFixed(0)} implies ${((target - price) / price * 100).toFixed(0)}% upside from current levels.`);
    }

    if (points.length === 0) points.push('Insufficient data to generate a bull case. Consider adding API keys in Settings for richer analysis.');
    return points;
  }

  /* --- Bear Case --- */
  function generateBearCase(data) {
    const points = [];
    const income = data.incomeStatements || [];
    const ratios = data.ratiosTTM || {};
    const overview = data.overview || {};
    const bs = data.balanceSheets?.[0] || {};

    // Revenue decline
    if (income.length >= 8) {
      const recentRev = income.slice(0, 4).reduce((a, q) => a + (q.revenue || 0), 0);
      const priorRev = income.slice(4, 8).reduce((a, q) => a + (q.revenue || 0), 0);
      if (priorRev > 0) {
        const g = (recentRev - priorRev) / priorRev;
        if (g < 0) points.push(`Revenue declining at ${(g * 100).toFixed(1)}% YoY, suggesting weakening demand or competitive pressure.`);
      }
    }

    // High valuation
    const pe = ratios.peRatioTTM || parseFloat(overview.PERatio);
    if (pe > 35) points.push(`Elevated P/E of ${pe.toFixed(1)}x leaves limited margin of safety; any earnings miss could trigger a correction.`);

    // Margin pressure
    if (income.length >= 8) {
      const recentMargin = income[0]?.netIncome && income[0]?.revenue ? income[0].netIncome / income[0].revenue : null;
      const priorMargin = income[4]?.netIncome && income[4]?.revenue ? income[4].netIncome / income[4].revenue : null;
      if (recentMargin != null && priorMargin != null && recentMargin < priorMargin - 0.03) {
        points.push(`Margins contracting — net margin dropped from ${(priorMargin * 100).toFixed(1)}% to ${(recentMargin * 100).toFixed(1)}%, indicating cost pressures.`);
      }
    }

    // High debt
    const de = ratios.debtEquityRatioTTM;
    if (de > 1.5) points.push(`High leverage with D/E of ${de.toFixed(2)} increases financial risk, especially in a rising rate environment.`);

    // Weak ROE
    const roe = ratios.returnOnEquityTTM || parseFloat(overview.ReturnOnEquityTTM);
    if (roe != null && roe < 0.08 && roe >= 0) points.push(`Weak ROE of ${(roe * 100).toFixed(1)}% suggests the company is not efficiently deploying capital.`);
    if (roe != null && roe < 0) points.push(`Negative ROE (${(roe * 100).toFixed(1)}%) — the company is destroying shareholder value.`);

    // Earnings misses
    const earnings = data.earnings || [];
    const recentMisses = earnings.slice(0, 4).filter(e => e.actual < e.estimate).length;
    if (recentMisses >= 2) points.push(`Missed earnings estimates in ${recentMisses}/4 recent quarters, raising execution concerns.`);

    // Analyst downgrades
    const reco = data.recommendations?.[0];
    if (reco) {
      const sells = (reco.sell || 0) + (reco.strongSell || 0);
      const total = sells + (reco.buy || 0) + (reco.strongBuy || 0) + (reco.hold || 0);
      if (total > 0 && sells / total > 0.2) points.push(`${Math.round(sells / total * 100)}% of analysts rate Sell or Strong Sell.`);
    }

    // Negative FCF
    const cf = data.cashFlows?.[0];
    if (cf && cf.freeCashFlow < 0) points.push(`Negative free cash flow (${Utils.fmtLargeNumber(cf.freeCashFlow)}) — may need to raise capital or cut spending.`);

    // Downside to target
    const target = parseFloat(overview.AnalystTargetPrice);
    const price = data.quote?.price;
    if (target && price && target < price) {
      points.push(`Current price above analyst target ($${target.toFixed(0)}), suggesting ${((price - target) / price * 100).toFixed(0)}% downside risk.`);
    }

    if (points.length === 0) points.push('No significant bear-case signals detected from available data. Verify with additional sources.');
    return points;
  }

  /* --- Financial Ratios --- */
  function generateFinancialRatios(data) {
    const ratios = data.ratiosTTM || {};
    const overview = data.overview || {};
    const metrics = data.keyMetrics?.[0] || {};
    const bs = data.balanceSheets?.[0] || {};
    const income = data.incomeStatements?.[0] || {};

    const items = [];

    function addRatio(label, value, note, quality) {
      items.push({ label, value, note, quality });
    }

    // Valuation
    const pe = ratios.peRatioTTM || parseFloat(overview.PERatio);
    if (pe != null) addRatio('P/E Ratio', Utils.fmtRatio(pe), pe < 20 ? 'Below market avg' : pe > 35 ? 'Premium valuation' : 'In line with market', pe < 25 ? 'good' : pe > 35 ? 'bad' : 'warn');

    const pb = ratios.priceToBookRatioTTM || parseFloat(overview.PriceToBookRatio);
    if (pb != null) addRatio('P/B Ratio', Utils.fmtRatio(pb), pb < 3 ? 'Reasonable' : 'Asset premium', pb < 3 ? 'good' : pb > 8 ? 'bad' : 'warn');

    const ps = ratios.priceToSalesRatioTTM;
    if (ps != null) addRatio('P/S Ratio', Utils.fmtRatio(ps), ps < 3 ? 'Low' : 'Premium', ps < 5 ? 'good' : 'warn');

    const evEbitda = ratios.enterpriseValueOverEBITDATTM || parseFloat(overview.EVToEBITDA);
    if (evEbitda != null) addRatio('EV/EBITDA', Utils.fmtRatio(evEbitda), evEbitda < 12 ? 'Value range' : 'Growth premium', evEbitda < 15 ? 'good' : 'warn');

    // Profitability
    const roe = ratios.returnOnEquityTTM || parseFloat(overview.ReturnOnEquityTTM);
    if (roe != null) addRatio('ROE', Utils.fmtPercent(roe * 100), roe > 0.15 ? 'Strong' : roe < 0 ? 'Negative' : 'Moderate', roe > 0.12 ? 'good' : roe < 0 ? 'bad' : 'warn');

    const roce = ratios.returnOnCapitalEmployedTTM;
    if (roce != null) addRatio('ROCE', Utils.fmtPercent(roce * 100), roce > 0.15 ? 'Efficient' : 'Below avg', roce > 0.12 ? 'good' : 'warn');

    const roa = ratios.returnOnAssetsTTM || parseFloat(overview.ReturnOnAssetsTTM);
    if (roa != null) addRatio('ROA', Utils.fmtPercent(roa * 100), roa > 0.08 ? 'Strong' : 'Low', roa > 0.05 ? 'good' : 'warn');

    const npm = ratios.netProfitMarginTTM || parseFloat(overview.ProfitMargin);
    if (npm != null) addRatio('Net Margin', Utils.fmtPercent(npm * 100), npm > 0.15 ? 'High margin' : npm < 0 ? 'Loss-making' : 'Moderate', npm > 0.10 ? 'good' : npm < 0 ? 'bad' : 'warn');

    const opm = ratios.operatingProfitMarginTTM || parseFloat(overview.OperatingMarginTTM);
    if (opm != null) addRatio('Op. Margin', Utils.fmtPercent(opm * 100), opm > 0.20 ? 'Strong operations' : 'Moderate', opm > 0.15 ? 'good' : opm < 0.05 ? 'bad' : 'warn');

    // Leverage
    const de = ratios.debtEquityRatioTTM;
    if (de != null) addRatio('Debt/Equity', Utils.fmtRatio(de), de < 0.5 ? 'Conservative' : de > 2 ? 'High leverage' : 'Moderate', de < 1 ? 'good' : de > 2 ? 'bad' : 'warn');

    const cr = ratios.currentRatioTTM;
    if (cr != null) addRatio('Current Ratio', Utils.fmtRatio(cr), cr > 1.5 ? 'Liquid' : cr < 1 ? 'Tight liquidity' : 'Adequate', cr > 1.5 ? 'good' : cr < 1 ? 'bad' : 'warn');

    const ic = ratios.interestCoverageTTM;
    if (ic != null && ic < 1000) addRatio('Int. Coverage', Utils.fmtRatio(ic, 1) + 'x', ic > 5 ? 'Well covered' : ic < 2 ? 'Tight' : 'Adequate', ic > 5 ? 'good' : ic < 2 ? 'bad' : 'warn');

    // Cash flow
    const fcfYield = ratios.freeCashFlowPerShareTTM && data.quote?.price ? ratios.freeCashFlowPerShareTTM / data.quote.price : null;
    if (fcfYield != null) addRatio('FCF Yield', Utils.fmtPercent(fcfYield * 100), fcfYield > 0.05 ? 'Attractive' : 'Low', fcfYield > 0.03 ? 'good' : 'warn');

    // Dividend
    const dy = ratios.dividendYielTTM || ratios.dividendYieldTTM || parseFloat(overview.DividendYield);
    if (dy != null) addRatio('Div. Yield', Utils.fmtPercent(dy * 100), dy > 0.03 ? 'Above avg' : dy === 0 ? 'No dividend' : 'Moderate', dy > 0.02 ? 'good' : 'warn');

    const payout = ratios.payoutRatioTTM;
    if (payout != null) addRatio('Payout Ratio', Utils.fmtPercent(payout * 100), payout < 0.6 ? 'Sustainable' : 'High payout', payout < 0.7 ? 'good' : 'bad');

    return items;
  }

  /* --- Quarterly Results --- */
  function generateQuarterlyResults(data) {
    const income = data.incomeStatements || [];
    const headers = ['Quarter', 'Revenue', 'Gross Profit', 'Op. Income', 'Net Income', 'EPS'];
    const rows = [];

    income.slice(0, 20).forEach(q => {
      rows.push({
        quarter: Utils.fmtQuarter(q.date),
        revenue: Utils.fmtLargeNumber(q.revenue),
        grossProfit: Utils.fmtLargeNumber(q.grossProfit),
        opIncome: Utils.fmtLargeNumber(q.operatingIncome),
        netIncome: Utils.fmtLargeNumber(q.netIncome),
        eps: q.eps != null ? '$' + q.eps.toFixed(2) : '—',
      });
    });

    return { headers, rows };
  }

  /* --- Earnings Highlights --- */
  function generateEarningsHighlights(data) {
    const highlights = [];
    const earnings = data.earnings || [];
    const overview = data.overview || {};

    // Earnings surprises
    if (earnings.length > 0) {
      highlights.push({
        title: 'Recent Earnings Surprises',
        items: earnings.slice(0, 8).map(e => ({
          period: e.period || '—',
          actual: e.actual != null ? `$${e.actual.toFixed(2)}` : '—',
          estimate: e.estimate != null ? `$${e.estimate.toFixed(2)}` : '—',
          surprise: e.actual != null && e.estimate != null ? `${((e.actual - e.estimate) / Math.abs(e.estimate) * 100).toFixed(1)}%` : '—',
          beat: e.actual > e.estimate,
        })),
      });
    }

    // Next earnings from AV
    const avEarnings = data.avEarnings;
    if (avEarnings?.quarterlyEarnings?.length) {
      const next = avEarnings.quarterlyEarnings[0];
      highlights.push({
        title: 'Latest Quarterly Earnings',
        text: `Reported EPS: $${next.reportedEPS || '—'} | Estimated: $${next.estimatedEPS || '—'} | Surprise: ${next.surprisePercentage || '—'}%`,
      });
    }

    // Forward estimates from overview
    if (overview.ForwardPE) {
      highlights.push({
        title: 'Forward Estimates',
        text: `Forward P/E: ${parseFloat(overview.ForwardPE).toFixed(1)} | EPS Estimate (Current Yr): $${overview.EPSEstimateCurrentYear || '—'} | EPS Estimate (Next Yr): $${overview.EPSEstimateNextYear || '—'}`,
      });
    }

    // Analyst target
    if (overview.AnalystTargetPrice) {
      highlights.push({
        title: 'Analyst Target',
        text: `Consensus target: $${parseFloat(overview.AnalystTargetPrice).toFixed(2)} | High: $${overview.AnalystHighTargetPrice || '—'} | Low: $${overview.AnalystLowTargetPrice || '—'}`,
      });
    }

    // Recommendations summary
    const reco = data.recommendations || [];
    if (reco.length > 0) {
      const latest = reco[0];
      highlights.push({
        title: 'Analyst Recommendations',
        text: `Strong Buy: ${latest.strongBuy || 0} | Buy: ${latest.buy || 0} | Hold: ${latest.hold || 0} | Sell: ${latest.sell || 0} | Strong Sell: ${latest.strongSell || 0}`,
      });
    }

    if (highlights.length === 0) {
      highlights.push({ title: 'No Earnings Data', text: 'Earnings data unavailable. Add Finnhub or Alpha Vantage API keys for earnings coverage.' });
    }

    return highlights;
  }

  /* --- Red Flags --- */
  function generateRedFlags(data) {
    const flags = [];
    const income = data.incomeStatements || [];
    const bs = data.balanceSheets || [];
    const cf = data.cashFlows || [];
    const ratios = data.ratiosTTM || {};

    // Rising debt
    if (bs.length >= 4) {
      const recentDebt = bs[0]?.totalDebt || 0;
      const priorDebt = bs[3]?.totalDebt || 0;
      if (priorDebt > 0 && recentDebt > priorDebt * 1.3) {
        flags.push({ severity: 'high', title: 'Rising Debt', description: `Total debt increased ${((recentDebt - priorDebt) / priorDebt * 100).toFixed(0)}% over the last year (${Utils.fmtLargeNumber(priorDebt)} → ${Utils.fmtLargeNumber(recentDebt)}).` });
      }
    }

    // Margin deterioration
    if (income.length >= 8) {
      const recentMargin = income[0]?.revenue ? income[0].netIncome / income[0].revenue : null;
      const priorMargin = income[4]?.revenue ? income[4].netIncome / income[4].revenue : null;
      if (recentMargin != null && priorMargin != null && recentMargin < priorMargin - 0.05) {
        flags.push({ severity: 'high', title: 'Margin Deterioration', description: `Net margin contracted from ${(priorMargin * 100).toFixed(1)}% to ${(recentMargin * 100).toFixed(1)}% over the past year.` });
      }
    }

    // Negative FCF
    if (cf.length > 0 && cf[0]?.freeCashFlow < 0) {
      flags.push({ severity: 'medium', title: 'Negative Free Cash Flow', description: `FCF is ${Utils.fmtLargeNumber(cf[0].freeCashFlow)}. The company is burning cash and may need external financing.` });
    }

    // Very high leverage
    const de = ratios.debtEquityRatioTTM;
    if (de > 3) {
      flags.push({ severity: 'high', title: 'Excessive Leverage', description: `Debt-to-equity ratio of ${de.toFixed(2)} is significantly above safe levels.` });
    }

    // Declining revenue
    if (income.length >= 8) {
      const recentRev = income.slice(0, 4).reduce((a, q) => a + (q.revenue || 0), 0);
      const priorRev = income.slice(4, 8).reduce((a, q) => a + (q.revenue || 0), 0);
      if (priorRev > 0 && recentRev < priorRev * 0.95) {
        flags.push({ severity: 'medium', title: 'Revenue Decline', description: `Annual revenue down ${((priorRev - recentRev) / priorRev * 100).toFixed(1)}% year-over-year.` });
      }
    }

    // Low interest coverage
    const ic = ratios.interestCoverageTTM;
    if (ic != null && ic < 2 && ic > -1000) {
      flags.push({ severity: 'high', title: 'Weak Interest Coverage', description: `Interest coverage of ${ic.toFixed(1)}x. Company may struggle to service debt.` });
    }

    // Negative equity
    if (bs.length > 0 && bs[0]?.totalStockholdersEquity < 0) {
      flags.push({ severity: 'high', title: 'Negative Shareholder Equity', description: `Book value is negative (${Utils.fmtLargeNumber(bs[0].totalStockholdersEquity)}), indicating liabilities exceed assets.` });
    }

    // Share dilution
    if (bs.length >= 4) {
      const recentShares = income[0]?.weightedAverageShsOut || 0;
      const priorShares = income[3]?.weightedAverageShsOut || 0;
      if (priorShares > 0 && recentShares > priorShares * 1.05) {
        flags.push({ severity: 'medium', title: 'Share Dilution', description: `Share count increased ${((recentShares - priorShares) / priorShares * 100).toFixed(1)}% over last year, diluting existing shareholders.` });
      }
    }

    // Earnings misses
    const earnings = data.earnings || [];
    const recentMisses = earnings.slice(0, 4).filter(e => e.actual < e.estimate).length;
    if (recentMisses >= 3) {
      flags.push({ severity: 'medium', title: 'Repeated Earnings Misses', description: `Missed consensus estimates in ${recentMisses} of the last 4 quarters.` });
    }

    // Sort by severity
    const order = { high: 0, medium: 1, low: 2 };
    flags.sort((a, b) => (order[a.severity] || 2) - (order[b.severity] || 2));

    return flags;
  }

  /* --- Ownership --- */
  function generateOwnership(data) {
    const result = { institutional: [], summary: null };
    const ownership = data.ownership;

    if (ownership?.ownership?.length) {
      result.institutional = ownership.ownership.slice(0, 10).map(o => ({
        name: o.name || 'Unknown',
        shares: o.share || 0,
        pct: o.percentage ? (o.percentage * 100).toFixed(2) + '%' : '—',
        change: o.change || 0,
      }));
    }

    // Summary from overview
    const overview = data.overview || {};
    if (overview.InstitutionShareFloat || overview.PercentInsidersOwn || overview.PercentInstitutions) {
      result.summary = {
        insiderPct: overview.PercentInsidersOwn ? parseFloat(overview.PercentInsidersOwn) : null,
        institutionalPct: overview.PercentInstitutions ? parseFloat(overview.PercentInstitutions) : null,
        sharesFloat: overview.SharesFloat ? parseFloat(overview.SharesFloat) : null,
        sharesOutstanding: overview.SharesOutstanding ? parseFloat(overview.SharesOutstanding) : null,
      };
    }

    return result;
  }

  return { generateAnalysis };
})();
