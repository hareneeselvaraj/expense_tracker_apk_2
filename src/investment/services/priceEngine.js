// src/investment/services/priceEngine.js

const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const PROXIES = [
  { name: "codetabs",   build: url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
  { name: "allorigins", build: url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: "corsproxy",  build: url => `https://corsproxy.io/?${encodeURIComponent(url)}` },
  { name: "direct",     build: url => url } // 4th fallback: direct fetch
];

async function fetchWithTimeout(url, ms = 7000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "Accept": "application/json" }
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function resilientFetch(targetUrl) {
  const errors = [];
  for (const proxy of PROXIES) {
    try {
      const res = await fetchWithTimeout(proxy.build(targetUrl));
      if (!res.ok) { errors.push(`${proxy.name}: HTTP ${res.status}`); continue; }
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); }
      catch { errors.push(`${proxy.name}: non-JSON`); continue; }
      if (json.chart?.result || json.quotes) return json;
      if (json.chart?.error) { errors.push(`yahoo: ${json.chart.error.description}`); continue; }
      errors.push(`${proxy.name}: unexpected shape`);
    } catch (err) {
      errors.push(`${proxy.name}: ${err.name === 'AbortError' ? 'timeout' : err.message}`);
    }
  }
  const e = new Error("All proxies failed");
  e.details = errors;
  throw e;
}

/**
 * Searches Yahoo Finance for a symbol using a name or ISIN.
 * Used when the exact Yahoo ticker is unknown.
 */
export async function searchYahooSymbol(query) {
  try {
    const targetUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${query}`;
    const data = await resilientFetch(targetUrl);
    
    if (data.quotes && data.quotes.length > 0) {
      // Prioritize NSE/BSE if multiple
      const ind = data.quotes.find(q => q.exchange === "NSI" || q.exchange === "BSE");
      return ind ? ind.symbol : data.quotes[0].symbol;
    }
  } catch (err) {
    console.warn("Yahoo search failed:", err);
  }
  return null;
}

/**
 * Fetches the live price for a given explicit Yahoo Finance symbol (e.g. RELIANCE.NS)
 */
export async function fetchLivePrice(symbol, force = false) {
  if (!symbol) return null;
  
  // 1. Check local cache
  const cacheKey = `price_cache_${symbol}`;
  if (force) localStorage.removeItem(cacheKey);
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
        return parsed.price;
      }
    } catch(e) {}
  }

  // 2. Fetch from Yahoo Finance chart endpoint via resilient proxy
  try {
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const data = await resilientFetch(targetUrl);
    
    const result = data.chart?.result?.[0];
    if (result && result.meta && result.meta.regularMarketPrice) {
      const price = result.meta.regularMarketPrice;
      
      // Save cache
      localStorage.setItem(cacheKey, JSON.stringify({
        price,
        symbol,
        timestamp: Date.now()
      }));
      
      return price;
    }
  } catch (err) {
    console.warn(`Live price fetch failed for ${symbol}:`, err);
  }
  
  // 3. Fallback: return null
  return null;
}

/**
 * Higher level function: given a query (like ISIN "INF846K01EW2" or stock "RELIANCE.NS"),
 * it automatically resolves the symbol if necessary and fetches the price.
 */
export async function getLivePriceSmart(query, { force = false } = {}) {
  const clean = String(query || "").trim().toUpperCase();
  if (!clean) return null;

  // Auto-append .NS if it looks like a plain NSE ticker (all letters, no dot)
  const guess = /^[A-Z0-9&-]+$/.test(clean) && !clean.includes(".")
    ? `${clean}.NS`
    : clean;

  if (guess.endsWith(".NS") || guess.endsWith(".BO")) {
    return await fetchLivePrice(guess, force);
  }
  
  // Otherwise, do a search to get the Yahoo symbol (e.g. for MFs via ISIN)
  const symbol = await searchYahooSymbol(clean);
  if (symbol) {
    return await fetchLivePrice(symbol, force);
  }
  
  return null;
}

export async function fetchMultiplePrices(queries = []) {
  const obj = {};
  for (const q of queries) {
    const p = await getLivePriceSmart(q);
    if (p) obj[q] = p;
  }
  return obj;
}

// Purity multipliers for gold
const PURITY_MAP = { "24k": 0.999, "22k": 0.916, "18k": 0.750 };
const TROY_OZ_TO_GRAMS = 31.1035;

/**
 * Fetches live gold price in ₹/gram for a given purity.
 * Strategy: Fetch gold USD/oz (GC=F) + USD/INR (USDINR=X), then convert.
 * Returns { pricePerGram, pricePerOzINR, usdInr } or null on failure.
 */
export async function fetchGoldPricePerGram(purity = "24k") {
  const cacheKey = `gold_price_cache`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
        const mult = PURITY_MAP[purity] || 1;
        return {
          pricePerGram: Math.round(parsed.basePerGram * mult),
          pricePerGram24k: Math.round(parsed.basePerGram),
          usdInr: parsed.usdInr
        };
      }
    } catch(e) {}
  }

  try {
    // Fetch gold in USD per troy ounce
    const goldUrl = `https://query1.finance.yahoo.com/v8/finance/chart/GC=F`;
    const goldData = await resilientFetch(goldUrl);
    const goldPriceUSD = goldData?.chart?.result?.[0]?.meta?.regularMarketPrice;

    // Fetch USD/INR exchange rate
    const fxUrl = `https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X`;
    const fxData = await resilientFetch(fxUrl);
    const usdInr = fxData?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (goldPriceUSD && usdInr) {
      const pricePerOzINR = goldPriceUSD * usdInr;
      const basePerGram = pricePerOzINR / TROY_OZ_TO_GRAMS; // 24k pure gold ₹/gram
      const mult = PURITY_MAP[purity] || 1;

      // Cache the base (24k) price
      localStorage.setItem(cacheKey, JSON.stringify({
        basePerGram,
        usdInr,
        timestamp: Date.now()
      }));

      return {
        pricePerGram: Math.round(basePerGram * mult),
        pricePerGram24k: Math.round(basePerGram),
        usdInr: Math.round(usdInr * 100) / 100
      };
    }
  } catch (err) {
    console.warn("Gold price fetch failed:", err);
  }

  return null;
}
