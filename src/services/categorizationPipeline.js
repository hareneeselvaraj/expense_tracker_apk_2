import { categorizeTransaction as smartCategorize } from "../../statement-engine.js";

// This function now only handles Smart Engine and fallback defaults.
// User rules are applied later in App.jsx via useRuleEngine.
export function categorizeTransaction(tx, categories) {
  // If the transaction already has a valid category assigned (not from a raw CSV import), keep it.
  if (tx.category && categories.some(c => c.id === tx.category)) {
    return tx;
  }

  const desc = (tx.description || "").toLowerCase();
  
  // Priority 2: Smart engine (from statement-engine.js)
  const smartMatch = smartCategorize(desc, tx.amount, tx.creditDebit === "Credit");
  if (smartMatch.name !== "Others") {
    const cat = categories.find(c => c.name === smartMatch.name);
    if (cat) return { ...tx, category: cat.id };
  }
  
  // Priority 3: Credit/Debit fallback
  if (tx.creditDebit === "Credit") {
    const incCat = categories.find(c => c.name === "Other Income" || c.name === "Salary" || c.type === "Income");
    if (incCat) return { ...tx, category: incCat.id };
  }
  
  // Final fallback
  return { ...tx, category: categories.find(c => c.name === "Others")?.id || "c13" };
}
