import { useCallback } from 'react';
import { getMatchingRules } from '../lib/ruleEvaluator.js';

export function useRuleEngine(rules, setTransactions, setRules, notify) {

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
          case 'notify':
            // Send a browser notification if permission is granted
            if (notify) notify(action.detail || `Rule "${rule.name}" matched`, 'info');
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Rule Matched', { body: action.detail || `Rule "${rule.name}" matched a transaction`, icon: '/favicon.ico' });
            }
            break;
          case 'approve':
            patch.approved = true;
            break;
        }
      }
    }

    if (tags.size) patch.tags = Array.from(tags);
    return { ...patch, updatedAt: new Date().toISOString() };
  }, [rules, notify]);

  // Run all rules against ALL transactions (bulk backfill)
  // Also updates match_count on each rule
  const runAllRules = useCallback((transactions) => {
    const matchCounts = {};
    let updatedCount = 0;

    setTransactions(prev => {
      const next = prev.map(tx => {
        if (tx.deleted) return tx;
        const matching = getMatchingRules(rules, tx);
        if (!matching.length) return tx;

        // Track match counts per rule
        matching.forEach(r => { matchCounts[r.id] = (matchCounts[r.id] || 0) + 1; });

        let patch = { ...tx };
        const tags = new Set(tx.tags || []);

        for (const rule of matching) {
          for (const action of rule.actions || []) {
            switch (action.type) {
              case 'categorize': patch.category = action.detail; break;
              case 'tag': tags.add(action.detail); break;
              case 'flag': patch.flagged = true; break;
              case 'exclude': patch.excluded_from_budget = true; break;
              case 'approve': patch.approved = true; break;
            }
          }
        }

        if (tags.size) patch.tags = Array.from(tags);
        updatedCount++;
        return { ...patch, updatedAt: new Date().toISOString() };
      });
      return next;
    });

    // Update match_count on each rule
    if (setRules && Object.keys(matchCounts).length > 0) {
      setRules(prev => prev.map(r => matchCounts[r.id] 
        ? { ...r, match_count: (r.match_count || 0) + matchCounts[r.id], last_run: new Date().toISOString(), updatedAt: new Date().toISOString() } 
        : r
      ));
    }

    return updatedCount;
  }, [rules, setTransactions, setRules]);

  return { applyRulesToTx, runAllRules };
}
