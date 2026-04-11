import { ASSET_TYPES } from "../constants/assetTypes.js";

// Financial Year starts April 1st, ends March 31st
export function getCurrentFY() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 is January
  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

export function getFYForDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) throw new Error("Invalid date provided for FY calculation");
  const year = d.getFullYear();
  const month = d.getMonth();
  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

// Days between two dates
function daysBetween(d1, d2) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) throw new Error("Invalid date for daysBetween");
  const diffTime = date2.getTime() - date1.getTime();
  if (diffTime < 0) throw new Error("Sell date cannot be before buy date");
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateTaxes(holdings, transactions, targetFY) {
  if (!targetFY) targetFY = getCurrentFY();

  // Split into buys and sells
  const buysByHolding = {};
  const sells = [];

  holdings.forEach(h => {
    buysByHolding[h.id] = [];
  });

  (transactions || []).filter(t => !t.deleted).sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(t => {
    if (t.type === "buy") {
      if (!buysByHolding[t.holdingId]) buysByHolding[t.holdingId] = [];
      buysByHolding[t.holdingId].push({ ...t, remainingQty: parseFloat(t.qty) || 1 }); 
      // some holdings like FD don't use qty, default to 1
    } else if (t.type === "sell") {
      sells.push(t);
    }
  });

  let stcgEquity = 0;
  let ltcgEquity = 0;
  let debtGains = 0;

  // Process sells (FIFO logic)
  sells.forEach(sellTx => {
    const sellFY = getFYForDate(sellTx.date);
    if (sellFY !== targetFY) return;

    const holding = holdings.find(h => h.id === sellTx.holdingId);
    if (!holding) return;

    const at = ASSET_TYPES.find(a => a.id === holding.type);
    const isEquity = at?.bucket === "equity" || at?.bucket === "dynamic" || holding.type === "stock" || holding.type === "mf";
    
    let sellQty = parseFloat(sellTx.qty) || 1;
    let realizedGain = 0;
    const sellPricePerUnit = (parseFloat(sellTx.price) || (parseFloat(sellTx.amount) / sellQty));

    const buys = buysByHolding[sellTx.holdingId] || [];
    
    // Default to a 1 transaction buy if no specific buys exist (e.g., initial creation)
    if (buys.length === 0) {
       buys.push({ date: holding.startDate, remainingQty: holding.qty, price: holding.purchasePrice });
    }

    for (const buy of buys) {
      if (sellQty <= 0) break;
      if (buy.remainingQty <= 0) continue;

      const qtyToMatch = Math.min(sellQty, buy.remainingQty);
      buy.remainingQty -= qtyToMatch;
      sellQty -= qtyToMatch;

      const buyPrice = parseFloat(buy.price);
      const gain = (sellPricePerUnit - buyPrice) * qtyToMatch;
      
      const holdingDays = daysBetween(buy.date, sellTx.date);
      
      if (isEquity) {
        if (holdingDays <= 365) {
          stcgEquity += gain;
        } else {
          ltcgEquity += gain;
        }
      } else {
        // Debt / Others
        debtGains += gain;
      }
    }
  });

  // Harvesting opportunities
  const opportunities = [];
  holdings.filter(h => !h.deleted && (h.type === "stock" || h.type === "mf")).forEach(h => {
    // Basic overall unrealised approx:
    const currentValue = h.qty * (h.currentPrice || h.purchasePrice);
    const unrealized = currentValue - h.principal;
    if (unrealized < -500) { // arbitrary threshold to suggest harvesting
      opportunities.push({
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        unrealizedLoss: unrealized
      });
    }
  });

  return {
    fy: targetFY,
    stcgEquity,
    ltcgEquity,
    debtGains,
    harvestingOpportunities: opportunities.sort((a,b) => a.unrealizedLoss - b.unrealizedLoss)
  };
}
