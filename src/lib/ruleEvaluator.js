export function evalCondition(c, tx) {
  const val = (c.val || "").toLowerCase().trim();

  switch (c.type) {
    case 'merchant': {
      // the existing app doesn't have merchant, it uses description
      const m = (tx.merchant || tx.description || "").toLowerCase();
      if (c.op === 'contains')     return m.includes(val);
      if (c.op === 'not_contains') return !m.includes(val);
      if (c.op === 'starts_with')  return m.startsWith(val);
      if (c.op === 'equals')       return m === val;
      return false;
    }
    case 'description': {
      const d = (tx.description || "").toLowerCase();
      if (c.op === 'contains')     return d.includes(val);
      if (c.op === 'not_contains') return !d.includes(val);
      if (c.op === 'equals')       return d === val;
      return false;
    }
    case 'amount_gt':  return tx.amount > parseFloat(c.val || "0");
    case 'amount_lt':  return tx.amount < parseFloat(c.val || "0");
    case 'amount_eq':  return tx.amount === parseFloat(c.val || "0");
    case 'category':   return tx.category === c.val;
    case 'day_of_week': {
      const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const dateObj = new Date(tx.date);
      return days[dateObj.getDay()] === val;
    }
    case 'recurring':  return !!tx.recurringId || !!tx.is_recurring === (c.val === 'true');
    default:           return false;
  }
}

// Returns true if the transaction matches the rule
export function matchesRule(rule, tx) {
  if (!rule.enabled || !rule.conditions || !rule.conditions.length) return false;
  const results = rule.conditions.map(c => evalCondition(c, tx));
  return rule.logic === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);
}

// Returns all matching rules for a transaction (sorted by priority)
export function getMatchingRules(rules, tx) {
  return (rules || [])
    .filter(r => r.enabled)
    .sort((a, b) => a.priority - b.priority)
    .filter(r => matchesRule(r, tx));
}
