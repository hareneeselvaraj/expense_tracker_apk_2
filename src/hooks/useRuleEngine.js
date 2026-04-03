import { useCallback } from 'react';
import { getMatchingRules } from '../lib/ruleEvaluator.js';

export function useRuleEngine(rules, setTransactions) {

  // Run all rules against a single transaction and apply actions.
  // Returns a modified transaction if matched, otherwise undefined.
  const applyRulesToTx = useCallback((tx) => {
    const matching = getMatchingRules(rules, tx);
    if (!matching.length) return undefined;

    let patch = { ...tx };
    const tags = new Set(tx.tags || []);

    for (const rule of matching) {
      for (const action of rule.actions || []) {
        switch (action.type) {
          case 'categorize':
            patch.category = action.detail;
            break;
          case 'tag':
            tags.add(action.detail);
            break;
          case 'flag':
            patch.flagged = true;
            break;
          case 'exclude':
             patch.excluded_from_budget = true;
            break;
        }
      }
    }

    if (tags.size) patch.tags = Array.from(tags);
    return patch;
  }, [rules]);

  // Run all rules against ALL transactions (bulk backfill)
  const runAllRules = useCallback((transactions) => {
     let updatedCount = 0;
     setTransactions(prev => {
        const next = prev.map(tx => {
           const patch = applyRulesToTx(tx);
           if (patch) {
              updatedCount++;
              return { ...tx, ...patch };
           }
           return tx;
        });
        return next;
     });
     return updatedCount;
  }, [applyRulesToTx, setTransactions]);

  return { applyRulesToTx, runAllRules };
}

