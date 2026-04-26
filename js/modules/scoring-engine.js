/* ===== SCORING ENGINE ===== */
const ScoringEngine = (() => {

  function calculateScore(data) {
    const result = {
      overall: 0,
      subscores: {},
      positiveDrivers: [],
      negativeDrivers: [],
      label: '',
    };

    const fundamentals = scoreFundamentals(data);
    const growth = scoreGrowth(data);
    const profitability = scoreProfitability(data);
    const risk = scoreRisk(data);
    const sentiment = scoreSentiment(data);

    result.subscores = {
      Fundamentals: fundamentals,
      Growth: growth,
      Profitability: profitability,
      Risk: risk,
      Sentiment: sentiment,
    };

    // Weighted average
    const weights = { Fundamentals: 0.25, Growth: 0.20, Profitability: 0.25, Risk: 0.15, Sentiment: 0.15 };
    let total = 0;
    for (const [k, v] of Object.entries(result.subscores)) {
      total += (v.score || 0) * (weights[k] || 0.2);
    }
    result.overall = Math.round(Math.max(0, Math.min(100, total)));
    result.label = Utils.scoreLabel(result.overall);

    // Collect drivers
    for (const sub of Object.values(result.subscores)) {
      result.positiveDrivers.push(...(sub.positive || []));
      result.negativeDrivers.push(...(sub.negative || []));
    }
    result.positiveDrivers = result.positiveDrivers.slice(0, 5);
    result.negativeDrivers = result.negativeDrivers.slice(0, 5);

    return result;
  }

  function scoreFundamentals(data) {
    const s = { score: 50, positive: [], negative: [] };
    const ratios = data.ratiosTTM || {};
    const overview = data.overview || {};
    const profile = data.profile || {};

    // P/E
    const pe = ratios.peRatioTTM || parseFloat(overview.PERatio);
    if (pe && pe > 0) {
      if (pe < 15) { s.score += 10; s.positive.push(`Low P/E ratio (${pe.toFixed(1)})`); }
      else if (pe < 25) { s.score += 5; s.positive.push(`Reasonable P/E (${pe.toFixed(1)})`); }
      else if (pe > 40) { s.score -= 10; s.negative.push(`Elevated P/E ratio (${pe.toFixed(1)})`); }
      else if (pe > 30) { s.score -= 5; s.negative.push(`High P/E (${pe.toFixed(1)})`); }
    }

    // P/B
    const pb = ratios.priceToBookRatioTTM || parseFloat(overview.PriceToBookRatio);
    if (pb && pb > 0) {
      if (pb < 2) { s.score += 5; s.positive.push(`Attractive P/B (${pb.toFixed(2)})`); }
      else if (pb > 10) { s.score -= 5; s.negative.push(`Very high P/B (${pb.toFixed(2)})`); }
    }

    // Dividend yield
    const dy = ratios.dividendYielTTM || ratios.dividendYieldTTM || parseFloat(overview.DividendYield);
    if (dy && dy > 0.02) { s.score += 5; s.positive.push(`Pays dividend (${(dy * 100).toFixed(1)}%)`); }

    // Market cap
    const mc = profile.marketCap || 0;
    if (mc > 100e9) { s.score += 5; s.positive.push('Large cap company'); }
    else if (mc < 2e9) { s.score -= 5; s.negative.push('Small cap — higher volatility risk'); }

    s.score = clamp(s.score);
    return s;
  }

  function scoreGrowth(data) {
    const s = { score: 50, positive: [], negative: [] };
    const income = data.incomeStatements || [];

    if (income.length >= 4) {
      const recent = income.slice(0, 4);
      const prior = income.slice(4, 8);

      if (recent.length && prior.length) {
        const recentRev = recent.reduce((a, q) => a + (q.revenue || 0), 0);
        const priorRev = prior.reduce((a, q) => a + (q.revenue || 0), 0);
        if (priorRev > 0) {
          const revGrowth = (recentRev - priorRev) / priorRev;
          if (revGrowth > 0.20) { s.score += 15; s.positive.push(`Strong revenue growth (${(revGrowth * 100).toFixed(1)}% YoY)`); }
          else if (revGrowth > 0.08) { s.score += 8; s.positive.push(`Solid revenue growth (${(revGrowth * 100).toFixed(1)}% YoY)`); }
          else if (revGrowth > 0) { s.score += 3; }
          else { s.score -= 10; s.negative.push(`Revenue declining (${(revGrowth * 100).toFixed(1)}% YoY)`); }
        }

        const recentNI = recent.reduce((a, q) => a + (q.netIncome || 0), 0);
        const priorNI = prior.reduce((a, q) => a + (q.netIncome || 0), 0);
        if (priorNI > 0) {
          const niGrowth = (recentNI - priorNI) / priorNI;
          if (niGrowth > 0.20) { s.score += 10; s.positive.push(`Strong earnings growth (${(niGrowth * 100).toFixed(1)}% YoY)`); }
          else if (niGrowth < -0.10) { s.score -= 10; s.negative.push(`Earnings declining (${(niGrowth * 100).toFixed(1)}% YoY)`); }
        }
      }
    }

    // Check analyst estimates from overview
    const overview = data.overview || {};
    const epsGrowth = parseFloat(overview.QuarterlyEarningsGrowthYOY);
    if (epsGrowth && epsGrowth > 0.10) { s.score += 5; }
    const revGrowthQ = parseFloat(overview.QuarterlyRevenueGrowthYOY);
    if (revGrowthQ && revGrowthQ > 0.10) { s.score += 5; }

    s.score = clamp(s.score);
    return s;
  }

  function scoreProfitability(data) {
    const s = { score: 50, positive: [], negative: [] };
    const ratios = data.ratiosTTM || {};
    const overview = data.overview || {};

    // ROE
    const roe = ratios.returnOnEquityTTM || parseFloat(overview.ReturnOnEquityTTM);
    if (roe != null) {
      if (roe > 0.20) { s.score += 15; s.positive.push(`Excellent ROE (${(roe * 100).toFixed(1)}%)`); }
      else if (roe > 0.12) { s.score += 8; s.positive.push(`Good ROE (${(roe * 100).toFixed(1)}%)`); }
      else if (roe < 0) { s.score -= 15; s.negative.push(`Negative ROE (${(roe * 100).toFixed(1)}%)`); }
      else if (roe < 0.05) { s.score -= 5; s.negative.push(`Weak ROE (${(roe * 100).toFixed(1)}%)`); }
    }

    // Net margin
    const margin = ratios.netProfitMarginTTM || parseFloat(overview.ProfitMargin);
    if (margin != null) {
      if (margin > 0.20) { s.score += 10; s.positive.push(`High profit margin (${(margin * 100).toFixed(1)}%)`); }
      else if (margin > 0.10) { s.score += 5; }
      else if (margin < 0) { s.score -= 10; s.negative.push('Operating at a loss'); }
      else if (margin < 0.05) { s.score -= 5; s.negative.push(`Thin margins (${(margin * 100).toFixed(1)}%)`); }
    }

    // Operating margin
    const opMargin = ratios.operatingProfitMarginTTM || parseFloat(overview.OperatingMarginTTM);
    if (opMargin && opMargin > 0.25) { s.score += 5; s.positive.push(`Strong operating margin (${(opMargin * 100).toFixed(1)}%)`); }

    // ROCE
    const roce = ratios.returnOnCapitalEmployedTTM;
    if (roce && roce > 0.15) { s.score += 5; s.positive.push(`Strong ROCE (${(roce * 100).toFixed(1)}%)`); }

    s.score = clamp(s.score);
    return s;
  }

  function scoreRisk(data) {
    const s = { score: 60, positive: [], negative: [] }; // Start slightly positive
    const ratios = data.ratiosTTM || {};
    const bs = data.balanceSheets?.[0] || {};

    // Debt/Equity
    const de = ratios.debtEquityRatioTTM || (bs.totalDebt && bs.totalStockholdersEquity ? bs.totalDebt / bs.totalStockholdersEquity : null);
    if (de != null) {
      if (de < 0.3) { s.score += 10; s.positive.push(`Very low leverage (D/E: ${de.toFixed(2)})`); }
      else if (de < 1) { s.score += 5; s.positive.push(`Manageable leverage (D/E: ${de.toFixed(2)})`); }
      else if (de > 3) { s.score -= 15; s.negative.push(`Very high leverage (D/E: ${de.toFixed(2)})`); }
      else if (de > 1.5) { s.score -= 8; s.negative.push(`Elevated debt (D/E: ${de.toFixed(2)})`); }
    }

    // Current ratio
    const cr = ratios.currentRatioTTM || (bs.totalCurrentAssets && bs.totalCurrentLiabilities ? bs.totalCurrentAssets / bs.totalCurrentLiabilities : null);
    if (cr != null) {
      if (cr > 2) { s.score += 5; s.positive.push(`Strong liquidity (CR: ${cr.toFixed(2)})`); }
      else if (cr < 1) { s.score -= 10; s.negative.push(`Liquidity concern (CR: ${cr.toFixed(2)})`); }
    }

    // Interest coverage
    const ic = ratios.interestCoverageTTM;
    if (ic != null) {
      if (ic > 10) { s.score += 5; s.positive.push('Strong interest coverage'); }
      else if (ic < 2) { s.score -= 10; s.negative.push(`Weak interest coverage (${ic.toFixed(1)}x)`); }
    }

    // FCF
    const cf = data.cashFlows?.[0];
    if (cf && cf.freeCashFlow != null) {
      if (cf.freeCashFlow > 0) { s.score += 5; s.positive.push(`Positive FCF (${Utils.fmtLargeNumber(cf.freeCashFlow)})`); }
      else { s.score -= 10; s.negative.push(`Negative FCF (${Utils.fmtLargeNumber(cf.freeCashFlow)})`); }
    }

    s.score = clamp(s.score);
    return s;
  }

  function scoreSentiment(data) {
    const s = { score: 50, positive: [], negative: [] };

    // Analyst recommendations
    const reco = data.recommendations?.[0];
    if (reco) {
      const buyStrength = (reco.strongBuy || 0) + (reco.buy || 0);
      const sellStrength = (reco.strongSell || 0) + (reco.sell || 0);
      const total = buyStrength + sellStrength + (reco.hold || 0);
      if (total > 0) {
        const buyPct = buyStrength / total;
        if (buyPct > 0.6) { s.score += 15; s.positive.push(`Strong analyst consensus (${Math.round(buyPct * 100)}% buy)`); }
        else if (buyPct > 0.4) { s.score += 5; }
        else if (buyPct < 0.2) { s.score -= 10; s.negative.push('Weak analyst sentiment'); }
      }
    }

    // Earnings surprises
    const earnings = data.earnings || [];
    if (earnings.length > 0) {
      const recent = earnings.slice(0, 4);
      const beats = recent.filter(e => e.actual > e.estimate).length;
      if (beats >= 3) { s.score += 10; s.positive.push(`Beat estimates ${beats}/4 recent quarters`); }
      else if (beats <= 1) { s.score -= 10; s.negative.push(`Missed estimates in ${4 - beats}/4 recent quarters`); }
    }

    // Target price from overview
    const overview = data.overview || {};
    const target = parseFloat(overview.AnalystTargetPrice);
    const price = data.quote?.price;
    if (target && price && price > 0) {
      const upside = (target - price) / price;
      if (upside > 0.2) { s.score += 10; s.positive.push(`${(upside * 100).toFixed(0)}% upside to target ($${target.toFixed(0)})`); }
      else if (upside < -0.1) { s.score -= 10; s.negative.push(`Below analyst target by ${Math.abs(upside * 100).toFixed(0)}%`); }
    }

    s.score = clamp(s.score);
    return s;
  }

  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

  return { calculateScore };
})();
