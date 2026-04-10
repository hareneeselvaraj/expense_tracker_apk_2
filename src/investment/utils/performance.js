// Simple XIRR approximation (Newton-Raphson method) for analyzing annualized returns
export const calculateXIRR = (cashflows, guess = 0.1) => {
  if (!cashflows || cashflows.length < 2) return 0;
  
  const xnpv = (rate, flows) => {
    let npv = 0;
    const t0 = new Date(flows[0].date).getTime();
    for (let i = 0; i < flows.length; i++) {
      const t = new Date(flows[i].date).getTime();
      const years = (t - t0) / (1000 * 60 * 60 * 24 * 365);
      npv += flows[i].amount / Math.pow(1 + rate, years);
    }
    return npv;
  };

  let limit = 100;
  let rate = guess;
  while (limit > 0) {
    const v1 = xnpv(rate, cashflows);
    const v2 = xnpv(rate + 0.0001, cashflows);
    const deriv = (v2 - v1) / 0.0001;
    const nextRate = rate - v1 / deriv;
    if (Math.abs(nextRate - rate) < 0.00001) return nextRate;
    rate = nextRate;
    limit--;
  }
  return rate; // Fallback or best effort
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
  }).filter(h => h.val > 0 && h.cost > 0);

  const best = [...mapped].sort((a,b) => b.pctGain - a.pctGain).slice(0, 3);
  const worst = [...mapped].sort((a,b) => a.pctGain - b.pctGain).slice(0, 3);
  return { best, worst };
};

export const detectDrift = (holdings, targetAllocation = { equity: 60, debt: 30, gold: 10, cash: 0 }) => {
  let totals = { equity: 0, debt: 0, gold: 0, cash: 0 };
  let grandTotal = 0;

  holdings.forEach(h => {
    const val = (h.qty !== undefined && h.currentPrice !== undefined) ? (h.qty * h.currentPrice) : (h.currentPrice || h.principal || 0);
    grandTotal += val;
    // rough bucket assignment
    if (["stock", "mf"].includes(h.type)) totals.equity += val;
    else if (["fd", "rd", "bond", "ppf", "epf"].includes(h.type)) totals.debt += val;
    else if (h.type === "gold") totals.gold += val;
    else totals.cash += val;
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
