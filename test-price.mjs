// Polyfill for testing outside browser
globalThis.fetch = fetch;
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = v; }
};

import { getLivePriceSmart } from './src/investment/services/priceEngine.js';

async function run() {
  console.log("Fetching RELIANCE.NS...");
  let p1 = await getLivePriceSmart("RELIANCE.NS");
  console.log("RELIANCE.NS Price:", p1);

  console.log("Fetching ISIN INF846K01EW2 (SBI Small Cap MF)...");
  let p2 = await getLivePriceSmart("INF846K01EW2");
  console.log("SBI Small Cap MF Price:", p2);
}

run();
