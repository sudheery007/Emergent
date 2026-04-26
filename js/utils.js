/* ===== EMERGENT UTILITIES ===== */
const Utils = (() => {

  /* --- Number Formatting --- */
  function fmtCurrency(n, decimals = 2) {
    if (n == null || isNaN(n)) return '—';
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function fmtPercent(n, decimals = 1) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toFixed(decimals) + '%';
  }

  function fmtLargeNumber(n) {
    if (n == null || isNaN(n)) return '—';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1e12) return sign + (abs / 1e12).toFixed(2) + 'T';
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
    return sign + abs.toFixed(2);
  }

  function fmtRatio(n, decimals = 2) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toFixed(decimals);
  }

  /* --- Date Formatting --- */
  function fmtDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function fmtQuarter(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `Q${q} ${d.getFullYear()}`;
  }

  /* --- Caching --- */
  function cacheGet(key) {
    const raw = localStorage.getItem(Config.STORAGE_KEYS.CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > Config.LIMITS.CACHE_TTL) {
      localStorage.removeItem(Config.STORAGE_KEYS.CACHE_PREFIX + key);
      return null;
    }
    return data;
  }

  function cacheSet(key, data) {
    localStorage.setItem(Config.STORAGE_KEYS.CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  }

  function clearCache() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(Config.STORAGE_KEYS.CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }

  /* --- Fetch Helper --- */
  async function fetchJSON(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
    try {
      const resp = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { 'Accept': 'application/json', ...(options.headers || {}) },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      return await resp.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function cachedFetch(cacheKey, url, options = {}) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    const data = await fetchJSON(url, options);
    cacheSet(cacheKey, data);
    return data;
  }

  /* --- Toast --- */
  function toast(message, duration = 3000) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration);
  }

  /* --- DOM Helpers --- */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'className') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v);
    });
    children.forEach(c => {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  }

  /* --- Sanitize --- */
  function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* --- Debounce --- */
  function debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  /* --- Color for score --- */
  function scoreColor(score) {
    if (score >= 70) return 'var(--green)';
    if (score >= 40) return 'var(--gold-400)';
    return 'var(--red)';
  }

  function scoreLabel(score) {
    if (score >= 80) return 'Strong Buy';
    if (score >= 65) return 'Buy';
    if (score >= 50) return 'Hold';
    if (score >= 35) return 'Underperform';
    return 'Sell';
  }

  return {
    fmtCurrency, fmtPercent, fmtLargeNumber, fmtRatio, fmtDate, fmtQuarter,
    cacheGet, cacheSet, clearCache,
    fetchJSON, cachedFetch,
    toast, $, $$, el, sanitize, debounce,
    scoreColor, scoreLabel,
  };
})();
