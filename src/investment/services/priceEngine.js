// src/investment/services/priceEngine.js

const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const IS_DEV = import.meta.env.DEV;

// Build the URL for our OWN proxy — Vite in dev, Netlify Function in prod
function chartUrl(symbol) {
  return IS_DEV
    ? `/yahoo/chart/${encodeURIComponent(symbol)}`
    : `/.netlify/functions/yahoo-proxy?path=chart/${encodeURIComponent(symbol)}`;
}

function searchUrl(query) {
  return IS_DEV
    ? `/yahoo/search?q=${encodeURIComponent(query)}`
    : `/.netlify/functions/yahoo-proxy?path=search&query=q=${encodeURIComponent(query)}`;
}

async function fetchWithTimeout(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function searchYahooSymbol(query) {
  try {
    const data = await fetchWithTimeout(searchUrl(query));
    if (data.quotes && data.quotes.length > 0) {
      const ind = data.quotes.find(q => q.exchange === "NSI" || q.exchange === "BSE");
      return ind ? ind.symbol : data.quotes[0].symbol;
    }
  } catch (err) {
    console.warn("Yahoo search failed:", err.message);
    throw err;
  }
  return null;
}

export async function fetchLivePrice(symbol, force = false) {
  if (!symbol) return null;

  const cacheKey = `price_cache_${symbol}`;
  if (force) localStorage.removeItem(cacheKey);
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) return parsed.price;
    } catch (e) {}
  }

  try {
    const data = await fetchWithTimeout(chartUrl(symbol));
    const result = data.chart?.result?.[0];
    if (result?.meta?.regularMarketPrice) {
      const price = result.meta.regularMarketPrice;
      localStorage.setItem(cacheKey, JSON.stringify({ price, symbol, timestamp: Date.now() }));
      return price;
    }
    if (data.chart?.error) {
      console.warn(`Yahoo error for ${symbol}:`, data.chart.error.description);
    }
  } catch (err) {
    console.warn(`Live price fetch failed for ${symbol}:`, err.message);
    throw err;
  }
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
    const goldData = await fetchWithTimeout(chartUrl("GC=F"));
    const goldPriceUSD = goldData?.chart?.result?.[0]?.meta?.regularMarketPrice;

    // Fetch USD/INR exchange rate
    const fxData = await fetchWithTimeout(chartUrl("USDINR=X"));
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
    console.warn("Gold price fetch failed:", err.message);
    throw err;
  }

  return null;
}
