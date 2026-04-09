// src/investment/utils/valuation.js

export function calcHoldingValue(h) {
  const princ = h.principal || 0;
  let val = princ;

  if (["fd", "rd", "bond"].includes(h.type) && (h.interestRate || h.couponRate) && h.startDate) {
    const today = new Date();
    const start = new Date(h.startDate);
    if (today > start) {
      const years = (today - start) / (1000 * 60 * 60 * 24 * 365);
      if (h.type === "fd") {
        let n = 1;
        if (h.compoundingFreq === "monthly") n = 12;
        else if (h.compoundingFreq === "quarterly") n = 4;
        else if (h.compoundingFreq === "halfyearly") n = 2;
        val = princ * Math.pow(1 + (h.interestRate / 100) / n, n * years);
      } else if (h.type === "rd") {
        // Approximate RD interest: assume mean investment duration is halfway
        val = princ * Math.pow(1 + (h.interestRate / 100) / 4, 4 * Math.max(0, years / 2));
      } else if (h.type === "bond") {
        // Simple interest added to the principal
        val = princ + (princ * ((h.couponRate || h.interestRate) / 100) * years);
      }
    }
  } else if (h.qty !== undefined && h.currentPrice !== undefined) {
    val = h.qty * h.currentPrice;
  } else if (h.currentPrice !== undefined) {
    val = h.currentPrice;
  }
  
  return val;
}
