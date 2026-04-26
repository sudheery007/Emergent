/* ===== PORTFOLIO MANAGER ===== */
const PortfolioManager = (() => {

  let holdings = [];

  function load() {
    const raw = localStorage.getItem(Config.STORAGE_KEYS.PORTFOLIO);
    holdings = raw ? JSON.parse(raw) : [];
    return holdings;
  }

  function save() {
    localStorage.setItem(Config.STORAGE_KEYS.PORTFOLIO, JSON.stringify(holdings));
  }

  function getHoldings() {
    if (holdings.length === 0) load();
    return holdings;
  }

  function addHolding(ticker, shares, costBasis) {
    ticker = ticker.toUpperCase().trim();
    if (!ticker || !shares) return false;
    const existing = holdings.find(h => h.ticker === ticker);
    if (existing) {
      existing.shares = parseFloat(shares);
      if (costBasis) existing.costBasis = parseFloat(costBasis);
    } else {
      holdings.push({
        ticker,
        shares: parseFloat(shares),
        costBasis: costBasis ? parseFloat(costBasis) : null,
      });
    }
    save();
    return true;
  }

  function removeHolding(ticker) {
    holdings = holdings.filter(h => h.ticker !== ticker.toUpperCase());
    save();
  }

  function clearAll() {
    holdings = [];
    save();
  }

  function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const results = [];
    const headerLine = lines[0].toLowerCase();
    const hasHeader = headerLine.includes('ticker') || headerLine.includes('symbol') || headerLine.includes('shares');
    const start = hasHeader ? 1 : 0;

    for (let i = start; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.trim().replace(/"/g, ''));
      if (parts.length >= 2) {
        const ticker = parts[0].toUpperCase();
        const shares = parseFloat(parts[1]);
        const costBasis = parts.length >= 3 ? parseFloat(parts[2]) : null;
        if (ticker && !isNaN(shares) && shares > 0) {
          results.push({ ticker, shares, costBasis: isNaN(costBasis) ? null : costBasis });
        }
      }
    }
    return results;
  }

  function importCSV(csvText) {
    const parsed = parseCSV(csvText);
    parsed.forEach(h => addHolding(h.ticker, h.shares, h.costBasis));
    return parsed.length;
  }

  function isHeld(ticker) {
    return holdings.some(h => h.ticker === ticker.toUpperCase());
  }

  function getWeight(ticker) {
    const total = holdings.reduce((a, h) => a + (h.shares * (h.costBasis || 1)), 0);
    if (total === 0) return 0;
    const h = holdings.find(h => h.ticker === ticker.toUpperCase());
    if (!h) return 0;
    return (h.shares * (h.costBasis || 1)) / total;
  }

  function getTotalValue() {
    return holdings.reduce((a, h) => a + (h.shares * (h.costBasis || 1)), 0);
  }

  function analyzePortfolioFit(ticker, profile) {
    const result = {
      isHeld: isHeld(ticker),
      currentWeight: getWeight(ticker),
      sectorExposure: 0,
      recommendation: '',
      reasoning: '',
      suggestedSize: null,
      fitBadge: 'neutral',
    };

    if (holdings.length === 0) {
      result.recommendation = 'No portfolio loaded';
      result.reasoning = 'Upload or add holdings to get portfolio context analysis.';
      return result;
    }

    const sector = profile?.sector || '';

    // Count sector exposure
    // Note: without real-time sector data for all holdings, we approximate
    const sameTickerHoldings = holdings.filter(h => h.ticker === ticker.toUpperCase());

    if (result.isHeld) {
      result.recommendation = 'Already Held';
      result.reasoning = `${ticker.toUpperCase()} is in your portfolio at ~${(result.currentWeight * 100).toFixed(1)}% weight. Consider whether current position sizing reflects your conviction level.`;
      result.fitBadge = 'neutral';
    } else {
      // Simple diversification check
      const numHoldings = holdings.length;
      if (numHoldings < 5) {
        result.recommendation = 'Consider Adding';
        result.reasoning = `Your portfolio has only ${numHoldings} holdings. Adding ${ticker.toUpperCase()} could improve diversification.`;
        result.fitBadge = 'good';
        result.suggestedSize = Math.min(0.15, 1 / (numHoldings + 1));
      } else if (numHoldings < 15) {
        result.recommendation = 'Potential Addition';
        result.reasoning = `With ${numHoldings} holdings, there is room for ${ticker.toUpperCase()} if it meets your quality criteria.`;
        result.fitBadge = 'good';
        result.suggestedSize = Math.min(0.10, 1 / (numHoldings + 1));
      } else {
        result.recommendation = 'Concentrated Portfolio';
        result.reasoning = `You already have ${numHoldings} positions. Adding ${ticker.toUpperCase()} may over-diversify unless replacing a weaker holding.`;
        result.fitBadge = 'concern';
        result.suggestedSize = 0.03;
      }
    }

    return result;
  }

  return {
    load, getHoldings, addHolding, removeHolding, clearAll,
    parseCSV, importCSV, isHeld, getWeight, getTotalValue,
    analyzePortfolioFit,
  };
})();
