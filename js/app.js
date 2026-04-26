/* ===== EMERGENT APP ===== */
(() => {
  'use strict';

  /* ===== STATE ===== */
  let currentView = 'search';
  let currentTicker = null;
  let currentData = null;
  let currentScore = null;
  let currentAnalysis = null;

  /* ===== DOM REFS ===== */
  const $ = Utils.$;
  const $$ = Utils.$$;

  /* ===== NAVIGATION ===== */
  function switchView(view) {
    currentView = view;
    $$('.view').forEach(v => v.classList.remove('active'));
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    const viewEl = $(`#view-${view}`);
    const navBtn = $(`#nav-${view}`);
    if (viewEl) viewEl.classList.add('active');
    if (navBtn) navBtn.classList.add('active');
  }

  function initNavigation() {
    $$('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view) switchView(view);
      });
    });
  }

  /* ===== SEARCH ===== */
  function initSearch() {
    const input = $('#search-input');
    const btn = $('#search-btn');
    const suggestionsEl = $('#search-suggestions');

    // Analyze on click or Enter
    btn.addEventListener('click', () => analyzeStock(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') analyzeStock(input.value);
    });

    // Search suggestions — try FMP first (reliable), fallback to SEC
    const debouncedSearch = Utils.debounce(async (query) => {
      if (query.length < 1) { suggestionsEl.style.display = 'none'; return; }
      try {
        let results = [];
        // Try FMP search first (no CORS issues)
        if (Config.hasKey('FMP_KEY')) {
          const fmpResults = await FMPService.searchTicker(query);
          results = (fmpResults || []).map(r => ({
            ticker: r.symbol || '',
            name: r.name || r.currency || '',
          }));
        }
        // Fallback to SEC EDGAR
        if (results.length === 0) {
          results = await SecEdgarService.searchCompanies(query);
        }
        if (results.length === 0) { suggestionsEl.style.display = 'none'; return; }
        suggestionsEl.innerHTML = results.map(r =>
          `<div class="suggestion-item" data-ticker="${Utils.sanitize(r.ticker)}">
            <span class="suggestion-ticker">${Utils.sanitize(r.ticker)}</span>
            <span class="suggestion-name">${Utils.sanitize(r.name)}</span>
          </div>`
        ).join('');
        suggestionsEl.style.display = 'block';
        suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            input.value = item.dataset.ticker;
            suggestionsEl.style.display = 'none';
            analyzeStock(item.dataset.ticker);
          });
        });
      } catch (e) {
        suggestionsEl.style.display = 'none';
      }
    }, 250);

    input.addEventListener('input', () => debouncedSearch(input.value.trim()));
    input.addEventListener('blur', () => setTimeout(() => suggestionsEl.style.display = 'none', 200));

    // Quick tickers
    $$('.quick-ticker').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.dataset.ticker;
        analyzeStock(btn.dataset.ticker);
      });
    });

    // Load recent
    loadRecent();
  }

  /* ===== RECENT SEARCHES ===== */
  function loadRecent() {
    const raw = localStorage.getItem(Config.STORAGE_KEYS.RECENT);
    const recent = raw ? JSON.parse(raw) : [];
    const container = $('#recent-list');
    const section = $('#recent-searches');
    if (recent.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    container.innerHTML = recent.map(r =>
      `<div class="recent-item" data-ticker="${Utils.sanitize(r.ticker)}">
        <span class="ri-ticker">${Utils.sanitize(r.ticker)}</span>
        <span class="ri-score" style="background:${r.score >= 65 ? 'var(--green-bg)' : r.score >= 40 ? 'var(--gold-100)' : 'var(--red-bg)'}; color:${r.score >= 65 ? 'var(--green)' : r.score >= 40 ? 'var(--gold-600)' : 'var(--red)'};">${r.score}/100</span>
      </div>`
    ).join('');
    container.querySelectorAll('.recent-item').forEach(item => {
      item.addEventListener('click', () => analyzeStock(item.dataset.ticker));
    });
  }

  function saveRecent(ticker, score) {
    const raw = localStorage.getItem(Config.STORAGE_KEYS.RECENT);
    let recent = raw ? JSON.parse(raw) : [];
    recent = recent.filter(r => r.ticker !== ticker);
    recent.unshift({ ticker, score, date: new Date().toISOString() });
    recent = recent.slice(0, Config.LIMITS.RECENT_MAX);
    localStorage.setItem(Config.STORAGE_KEYS.RECENT, JSON.stringify(recent));
    loadRecent();
  }

  /* ===== ANALYZE STOCK ===== */
  async function analyzeStock(ticker) {
    if (!ticker || !ticker.trim()) { Utils.toast('Please enter a ticker'); return; }
    ticker = ticker.toUpperCase().trim();

    // Check if at least one API key is configured (SEC EDGAR works without keys)
    if (!Config.hasKey('FMP_KEY') && !Config.hasKey('FINNHUB_KEY') && !Config.hasKey('AV_KEY')) {
      Utils.toast('Add at least one API key in Settings for full analysis');
    }

    switchView('analysis');
    showLoading(true);
    currentTicker = ticker;

    try {
      // Fetch all data
      currentData = await DataOrchestrator.fetchAllData(ticker, (msg, step, steps) => {
        updateLoaderStatus(msg, step, steps);
      });

      if (!currentData.profile?.name && !currentData.quote) {
        showLoading(false);
        Utils.toast('No data found for ' + ticker);
        switchView('search');
        return;
      }

      // Score
      currentScore = ScoringEngine.calculateScore(currentData);

      // Analysis
      currentAnalysis = AnalysisEngine.generateAnalysis(currentData);

      // Render
      renderCompanyHeader();
      renderScoreCard();
      renderBullBear();
      renderFinancials();
      renderQuarterly();
      renderEarnings();
      renderRedFlags();
      renderOwnership();

      // Portfolio context
      renderPortfolioFit();

      // Save to recent
      saveRecent(ticker, currentScore.overall);

      showLoading(false);
      $('#analysis-content').style.display = 'block';

    } catch (e) {
      console.error('Analysis failed:', e);
      showLoading(false);
      Utils.toast('Analysis failed: ' + e.message);
      switchView('search');
    }
  }

  /* ===== LOADING ===== */
  function showLoading(show) {
    $('#analysis-loading').style.display = show ? 'flex' : 'none';
    if (!show) return;
    $('#analysis-content').style.display = 'none';
  }

  function updateLoaderStatus(msg, step, steps) {
    $('#loader-status').textContent = msg;
    const stepsEl = $('#loader-steps');
    stepsEl.innerHTML = steps.map((s, i) =>
      `<span class="loader-step ${i < step ? 'done' : i === step ? 'active' : ''}">${i < step ? '✓' : '○'} ${s}</span>`
    ).join('');
  }

  /* ===== RENDER: Company Header ===== */
  function renderCompanyHeader() {
    const p = currentData.profile || {};
    const q = currentData.quote || {};

    $('#company-name').textContent = p.name || currentTicker;
    $('#company-ticker').textContent = p.ticker || currentTicker;
    $('#company-sector').textContent = p.sector || '—';
    $('#company-exchange').textContent = p.exchange || '—';
    $('#company-logo').textContent = (p.ticker || currentTicker).slice(0, 2);

    if (p.logo) {
      $('#company-logo').innerHTML = `<img src="${Utils.sanitize(p.logo)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:inherit;" onerror="this.parentNode.textContent='${Utils.sanitize((p.ticker || currentTicker).slice(0, 2))}'">`;
    }

    $('#current-price').textContent = q.price ? Utils.fmtCurrency(q.price) : '—';
    const change = q.changesPercentage || q.change;
    if (change != null) {
      const isUp = change >= 0;
      const changeEl = $('#price-change');
      changeEl.textContent = `${isUp ? '+' : ''}${typeof q.changesPercentage === 'number' ? q.changesPercentage.toFixed(2) + '%' : Utils.fmtCurrency(change)}`;
      changeEl.className = `price-change ${isUp ? 'up' : 'down'}`;
    }
  }

  /* ===== RENDER: Score Card ===== */
  function renderScoreCard() {
    const score = currentScore;
    if (!score) return;

    // Ring animation
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (score.overall / 100) * circumference;
    const ring = $('#score-ring-fill');
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference;
    ring.style.stroke = Utils.scoreColor(score.overall);
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = offset;
    });

    $('#ai-score-value').textContent = score.overall;
    $('#score-subtitle').textContent = score.label;

    // Subscores
    const subscoresEl = $('#subscores');
    subscoresEl.innerHTML = Object.entries(score.subscores).map(([name, sub]) => `
      <div class="subscore-row">
        <span class="subscore-label">${name}</span>
        <div class="subscore-bar"><div class="subscore-fill" style="width:${sub.score}%;background:${Utils.scoreColor(sub.score)}"></div></div>
        <span class="subscore-val">${sub.score}</span>
      </div>
    `).join('');

    // Drivers
    $('#positive-drivers-list').innerHTML = score.positiveDrivers.map(d => `<li>${Utils.sanitize(d)}</li>`).join('');
    $('#negative-drivers-list').innerHTML = score.negativeDrivers.map(d => `<li>${Utils.sanitize(d)}</li>`).join('');
  }

  /* ===== RENDER: Bull / Bear ===== */
  function renderBullBear() {
    const a = currentAnalysis;
    if (!a) return;
    $('#bull-case-list').innerHTML = a.bullCase.map(p => `<li>${Utils.sanitize(p)}</li>`).join('');
    $('#bear-case-list').innerHTML = a.bearCase.map(p => `<li>${Utils.sanitize(p)}</li>`).join('');
  }

  /* ===== RENDER: Financials ===== */
  function renderFinancials() {
    const items = currentAnalysis?.financialRatios || [];
    const grid = $('#ratios-grid');
    grid.innerHTML = items.map(r => `
      <div class="ratio-card">
        <div class="ratio-label">${Utils.sanitize(r.label)}</div>
        <div class="ratio-value ratio-${r.quality}">${r.value}</div>
        <div class="ratio-note">${Utils.sanitize(r.note)}</div>
      </div>
    `).join('');
  }

  /* ===== RENDER: Quarterly ===== */
  function renderQuarterly() {
    const q = currentAnalysis?.quarterlyResults;
    if (!q) return;
    $('#quarterly-thead').innerHTML = `<tr>${q.headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    $('#quarterly-tbody').innerHTML = q.rows.map(r => `
      <tr>
        <td><strong>${r.quarter}</strong></td>
        <td>${r.revenue}</td>
        <td>${r.grossProfit}</td>
        <td>${r.opIncome}</td>
        <td>${r.netIncome}</td>
        <td>${r.eps}</td>
      </tr>
    `).join('');
  }

  /* ===== RENDER: Earnings ===== */
  function renderEarnings() {
    const highlights = currentAnalysis?.earningsHighlights || [];
    const container = $('#earnings-content');
    container.innerHTML = highlights.map(h => {
      let content = '';
      if (h.items) {
        content = `<table class="data-table">
          <thead><tr><th>Period</th><th>Actual</th><th>Estimate</th><th>Surprise</th></tr></thead>
          <tbody>${h.items.map(i => `
            <tr>
              <td>${Utils.sanitize(i.period)}</td>
              <td>${i.actual}</td>
              <td>${i.estimate}</td>
              <td style="color:${i.beat ? 'var(--green)' : 'var(--red)'}">${i.surprise}</td>
            </tr>
          `).join('')}</tbody>
        </table>`;
      } else if (h.text) {
        content = `<p>${Utils.sanitize(h.text)}</p>`;
      }
      return `<div class="earning-card"><h4>${Utils.sanitize(h.title)}</h4>${content}</div>`;
    }).join('');
  }

  /* ===== RENDER: Red Flags ===== */
  function renderRedFlags() {
    const flags = currentAnalysis?.redFlags || [];
    const container = $('#red-flags-content');
    if (flags.length === 0) {
      container.innerHTML = '<div class="no-flags">✓ No significant red flags detected</div>';
      return;
    }
    container.innerHTML = flags.map(f => `
      <div class="flag-item">
        <span class="flag-icon flag-severity-${f.severity}">${f.severity === 'high' ? '⚠' : f.severity === 'medium' ? '⚡' : 'ℹ'}</span>
        <div class="flag-text">
          <h4>${Utils.sanitize(f.title)} <span class="flag-severity-badge flag-${f.severity}-badge">${f.severity}</span></h4>
          <p>${Utils.sanitize(f.description)}</p>
        </div>
      </div>
    `).join('');
  }

  /* ===== RENDER: Ownership ===== */
  function renderOwnership() {
    const own = currentAnalysis?.ownership;
    if (!own) return;
    const container = $('#ownership-content');
    let html = '';

    // Summary
    if (own.summary) {
      html += '<div class="ownership-card"><h4>Ownership Summary</h4>';
      if (own.summary.insiderPct != null) {
        html += `<div class="ownership-bar-row">
          <span class="ownership-bar-label">Insider</span>
          <div class="ownership-bar"><div class="ownership-bar-fill" style="width:${Math.min(own.summary.insiderPct, 100)}%"></div></div>
          <span class="ownership-bar-val">${own.summary.insiderPct.toFixed(1)}%</span>
        </div>`;
      }
      if (own.summary.institutionalPct != null) {
        html += `<div class="ownership-bar-row">
          <span class="ownership-bar-label">Institutional</span>
          <div class="ownership-bar"><div class="ownership-bar-fill" style="width:${Math.min(own.summary.institutionalPct, 100)}%"></div></div>
          <span class="ownership-bar-val">${own.summary.institutionalPct.toFixed(1)}%</span>
        </div>`;
      }
      if (own.summary.sharesOutstanding) {
        html += `<p style="margin-top:.5rem;font-size:.82rem;color:var(--mid-gray);">Shares Outstanding: ${Utils.fmtLargeNumber(own.summary.sharesOutstanding)} | Float: ${Utils.fmtLargeNumber(own.summary.sharesFloat)}</p>`;
      }
      html += '</div>';
    }

    // Top holders
    if (own.institutional.length > 0) {
      html += '<div class="ownership-card"><h4>Top Institutional Holders</h4><table class="data-table"><thead><tr><th>Name</th><th>Shares</th><th>%</th></tr></thead><tbody>';
      own.institutional.forEach(h => {
        html += `<tr><td>${Utils.sanitize(h.name)}</td><td>${Utils.fmtLargeNumber(h.shares)}</td><td>${h.pct}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }

    if (!html) html = '<div class="ownership-card"><p>Ownership data unavailable. Add a Finnhub or Alpha Vantage API key for institutional ownership data.</p></div>';
    container.innerHTML = html;
  }

  /* ===== ANALYSIS TABS ===== */
  function initAnalysisTabs() {
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = $(`#panel-${btn.dataset.tab}`);
        if (panel) panel.classList.add('active');
      });
    });
  }

  /* ===== PORTFOLIO VIEW ===== */
  function initPortfolio() {
    PortfolioManager.load();

    // CSV upload
    const uploadZone = $('#upload-zone');
    const fileInput = $('#csv-file-input');

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleCSVFile(file);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) handleCSVFile(fileInput.files[0]);
    });

    // Manual entry
    $('#add-holding-btn').addEventListener('click', () => {
      const ticker = $('#manual-ticker').value;
      const shares = $('#manual-shares').value;
      const cost = $('#manual-cost').value;
      if (!ticker || !shares) { Utils.toast('Enter ticker and shares'); return; }
      PortfolioManager.addHolding(ticker, shares, cost || null);
      $('#manual-ticker').value = '';
      $('#manual-shares').value = '';
      $('#manual-cost').value = '';
      renderHoldings();
      Utils.toast(`${ticker.toUpperCase()} added to portfolio`);
    });

    // Clear
    $('#clear-portfolio-btn').addEventListener('click', () => {
      PortfolioManager.clearAll();
      renderHoldings();
      Utils.toast('Portfolio cleared');
    });

    renderHoldings();
  }

  function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const count = PortfolioManager.importCSV(text);
      renderHoldings();
      Utils.toast(`Imported ${count} holdings`);
    };
    reader.readAsText(file);
  }

  function renderHoldings() {
    const holdings = PortfolioManager.getHoldings();
    const section = $('#holdings-section');
    const tbody = $('#holdings-tbody');

    if (holdings.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    const total = PortfolioManager.getTotalValue();

    tbody.innerHTML = holdings.map(h => {
      const weight = total > 0 ? ((h.shares * (h.costBasis || 1)) / total * 100).toFixed(1) : '—';
      return `<tr>
        <td><strong>${Utils.sanitize(h.ticker)}</strong></td>
        <td>${h.shares}</td>
        <td>${h.costBasis ? Utils.fmtCurrency(h.costBasis) : '—'}</td>
        <td>${weight}%</td>
        <td><button class="btn-outline-sm remove-holding" data-ticker="${Utils.sanitize(h.ticker)}">✕</button></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.remove-holding').forEach(btn => {
      btn.addEventListener('click', () => {
        PortfolioManager.removeHolding(btn.dataset.ticker);
        renderHoldings();
      });
    });
  }

  function renderPortfolioFit() {
    const container = $('#portfolio-context');
    const content = $('#portfolio-fit-content');

    if (!currentTicker || PortfolioManager.getHoldings().length === 0) {
      container.style.display = 'none';
      return;
    }

    const fit = PortfolioManager.analyzePortfolioFit(currentTicker, currentData?.profile);
    container.style.display = 'block';

    let html = `<h4>${currentTicker} — Portfolio Fit</h4>`;
    html += `<p><span class="fit-badge fit-${fit.fitBadge}">${Utils.sanitize(fit.recommendation)}</span></p>`;
    html += `<p>${Utils.sanitize(fit.reasoning)}</p>`;

    if (fit.isHeld) {
      html += `<p>Current weight: <strong>${(fit.currentWeight * 100).toFixed(1)}%</strong></p>`;
    }

    if (fit.suggestedSize) {
      html += `<p>Suggested position size: <strong>${(fit.suggestedSize * 100).toFixed(0)}%</strong> of portfolio</p>`;
    }

    content.innerHTML = html;
  }

  /* ===== SETTINGS ===== */
  function initSettings() {
    // Load saved keys
    $('#setting-fmp-key').value = Config.getKey('FMP_KEY');
    $('#setting-finnhub-key').value = Config.getKey('FINNHUB_KEY');
    $('#setting-av-key').value = Config.getKey('AV_KEY');

    // Save
    $('#save-settings-btn').addEventListener('click', () => {
      Config.setKey('FMP_KEY', $('#setting-fmp-key').value.trim());
      Config.setKey('FINNHUB_KEY', $('#setting-finnhub-key').value.trim());
      Config.setKey('AV_KEY', $('#setting-av-key').value.trim());
      updateApiStatus();
      Utils.toast('Settings saved');
    });

    // Clear cache
    $('#clear-cache-btn').addEventListener('click', () => {
      Utils.clearCache();
      Utils.toast('Cache cleared');
    });

    updateApiStatus();
    updateUsageBars();
  }

  function updateApiStatus() {
    const hasAny = Config.hasKey('FMP_KEY') || Config.hasKey('FINNHUB_KEY') || Config.hasKey('AV_KEY');
    const dot = Utils.$('.status-dot');
    const text = Utils.$('.status-text');
    if (hasAny) {
      dot.style.background = 'var(--green)';
      text.textContent = 'Ready';
    } else {
      dot.style.background = 'var(--amber)';
      text.textContent = 'No API keys';
    }
  }

  function updateUsageBars() {
    const usage = Config.getUsage();

    const fmpPct = Math.min((usage.fmp / Config.LIMITS.FMP_DAILY) * 100, 100);
    $('#fmp-usage').style.width = fmpPct + '%';
    $('#fmp-usage-text').textContent = `${usage.fmp}/${Config.LIMITS.FMP_DAILY}`;

    const fhPct = Math.min((usage.finnhub / Config.LIMITS.FINNHUB_PER_MIN) * 100, 100);
    $('#finnhub-usage').style.width = fhPct + '%';
    $('#finnhub-usage-text').textContent = `${usage.finnhub}/${Config.LIMITS.FINNHUB_PER_MIN}`;

    const avPct = Math.min((usage.av / Config.LIMITS.AV_DAILY) * 100, 100);
    $('#av-usage').style.width = avPct + '%';
    $('#av-usage-text').textContent = `${usage.av}/${Config.LIMITS.AV_DAILY}`;
  }

  /* ===== INIT ===== */
  function init() {
    initNavigation();
    initSearch();
    initAnalysisTabs();
    initPortfolio();
    initSettings();

    // Preload SEC ticker map
    SecEdgarService.loadTickerMap();
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
