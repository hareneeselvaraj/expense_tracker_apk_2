const openDB = () => new Promise((res, rej) => {
  const r = indexedDB.open("ExpenseTrackerDB", 1);
  r.onupgradeneeded = e => e.target.result.createObjectStore("data");
  r.onsuccess = e => res(e.target.result);
  r.onerror = e => rej(e.target.error);
});

export const dbGet = async k => { const db = await openDB(); return new Promise((res,rej) => { const r=db.transaction("data","readonly").objectStore("data").get(k); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); };

export const dbSet = async (k,v) => { const db = await openDB(); return new Promise((res,rej) => { const tx=db.transaction("data","readwrite"); tx.objectStore("data").put(v,k); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); };

// ── Investment Module ────────────────────────────────────────────────────────
export const DEFAULT_INVEST_PREFS = {
  goldRatePer10g: 75000,
  livePriceStaleMinutes: 15,
  autoLinkExpenses: true,
  defaultExchange: "NSE",
};

const DEFAULT_INVEST_DATA = {
  holdings: [],
  transactions: [],
  prefs: DEFAULT_INVEST_PREFS,
  meta: { version: 1, lastPriceRefresh: null },
};

export const getInvestData = async () => {
  const data = await dbGet("investData");
  return data || { ...DEFAULT_INVEST_DATA };
};

export const setInvestData = async (data) => dbSet("investData", data);

export const getAppMode = async () => (await dbGet("appMode")) || "expense";
export const setAppMode = async (mode) => dbSet("appMode", mode);
