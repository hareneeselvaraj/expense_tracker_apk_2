import { ASSET_TYPES } from "../constants/assetTypes.js";
import { calcHoldingValue } from "./valuation.js";

// Simple XIRR approximation (Newton-Raphson method) for analyzing annualized returns
export const calculateXIRR = (cashflows, guess = 0.1) => {
  if (!cashflows || cashflows.length < 2) return 0;

  // Filter out invalid dates
  const validFlows = cashflows.filter(f => f.date && !isNaN(new Date(f.date).getTime()));
  if (validFlows.length < 2) return 0;

  const xnpv = (rate, flows) => {
    let npv = 0;
    const t0 = new Date(flows[0].date).getTime();
    for (let i = 0; i < flows.length; i++) {
      const t = new Date(flows[i].date).getTime();
      const years = (t - t0) / (1000 * 60 * 60 * 24 * 365);
      const denom = Math.pow(1 + rate, years);
      if (!isFinite(denom) || denom === 0) return NaN;
      npv += flows[i].amount / denom;
    }
    return npv;
  };

  let limit = 100;
  let rate = guess;
  while (limit > 0) {
    const v1 = xnpv(rate, validFlows);
    const v2 = xnpv(rate + 0.0001, validFlows);
    if (!isFinite(v1) || !isFinite(v2)) return 0;
    const deriv = (v2 - v1) / 0.0001;
    if (Math.abs(deriv) < 1e-12) return 0; // Avoid division by zero
    const nextRate = rate - v1 / deriv;
    if (!isFinite(nextRate)) return 0;
    if (Math.abs(nextRate - rate) < 0.00001) return nextRate;
    rate = nextRate;
    limit--;
  }
  return isFinite(rate) ? rate : 0;
};

export const getTopMovers = (holdings) => {
  // Assumes holdings have `currentPrice` and a hypothetical `previousClose` or `costPrice` basis.
  // We'll calculate lifetime absolute / % gain as placeholders right now for the analytics.
  const mapped = holdings.map(h => {
    const cost = h.principal || 0;
    const val = (h.qty !== undefined && h.currentPrice !== undefined) ? (h.qty * h.currentPrice) : (h.currentPrice || cost);
    const absGain = val - cost;
    const pctGain = cost > 0 ? (absGain / cost) * 100 : 0;
    return { ...h, val, absGain, pctGain };
  }).filter(h => h.val > 0 && (h.principal || 0) > 0);

  const ESILON = 0.001;
  const best = [...mapped].filter(h => h.pctGain > ESILON).sort((a,b) => (b.pctGain - a.pctGain) || (b.absGain - a.absGain) || (a.id || "").localeCompare(b.id || "")).slice(0, 3);
  const worst = [...mapped].filter(h => h.pctGain < -ESILON).sort((a,b) => (a.pctGain - b.pctGain) || (a.absGain - b.absGain) || (a.id || "").localeCompare(b.id || "")).slice(0, 3);
  return { best, worst };
};

export const detectDrift = (holdings, targetAllocation = { equity: 60, debt: 30, gold: 10, cash: 0 }) => {
  let totals = { equity: 0, debt: 0, gold: 0, cash: 0 };
  let grandTotal = 0;

  // Map ASSET_TYPES buckets to drift buckets
  const BUCKET_MAP = {
    equity: "equity",
    dynamic: "equity", // MFs counted as equity for allocation
    fd: "debt",
    govtSavings: "debt",
    debt: "debt",
    gold: "gold",
  };

  holdings.forEach(h => {
    const val = calcHoldingValue(h);
    grandTotal += val;
    const at = ASSET_TYPES.find(a => a.id === h.type);
    const driftBucket = BUCKET_MAP[at?.bucket] || "cash";
    totals[driftBucket] = (totals[driftBucket] || 0) + val;
  });

  if (grandTotal === 0) return null;

  const actuals = {
    equity: totals.equity / grandTotal * 100,
    debt: totals.debt / grandTotal * 100,
    gold: totals.gold / grandTotal * 100,
    cash: totals.cash / grandTotal * 100
  };

  const drifts = [];
  Object.keys(targetAllocation).forEach(k => {
    const diff = actuals[k] - targetAllocation[k];
    if (Math.abs(diff) > 10) {
      drifts.push({ bucket: k, actual: actuals[k], target: targetAllocation[k], drift: diff });
    }
  });

  return { actuals, drifts, total: grandTotal };
};
