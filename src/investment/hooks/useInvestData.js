import { useCallback } from "react";
import { uid } from "../../utils/id.js";

export function useInvestData(investData, setInvestData) {
  
  const saveHolding = useCallback((holding, initialTx) => {
    setInvestData(prev => {
      const isNew = !prev.holdings.some(h => h.id === holding.id);
      const newData = { ...prev };
      if (isNew) {
        newData.holdings = [holding, ...(prev.holdings || [])];
        if (initialTx) newData.transactions = [initialTx, ...(prev.transactions || [])];
      } else {
        newData.holdings = prev.holdings.map(h => h.id === holding.id ? holding : h);
      }
      return newData;
    });
  }, [setInvestData]);

  const deleteHolding = useCallback((holdingId) => {
    const now = new Date().toISOString();
    setInvestData(prev => ({
      ...prev,
      holdings: (prev.holdings || []).map(h => h.id === holdingId ? { ...h, deleted: true, updatedAt: now } : h),
      transactions: (prev.transactions || []).map(t => t.holdingId === holdingId ? { ...t, deleted: true, updatedAt: now } : t)
    }));
  }, [setInvestData]);

  const saveGoal = useCallback((goal) => {
    setInvestData(prev => {
      const isNew = !prev.goals?.some(g => g.id === goal.id);
      const goals = prev.goals || [];
      return {
        ...prev,
        goals: isNew ? [goal, ...goals] : goals.map(g => g.id === goal.id ? goal : g)
      };
    });
  }, [setInvestData]);

  const deleteGoal = useCallback((goalId) => {
    const now = new Date().toISOString();
    setInvestData(prev => ({
      ...prev,
      goals: (prev.goals || []).map(g => g.id === goalId ? { ...g, deleted: true, updatedAt: now } : g)
    }));
  }, [setInvestData]);

  return { saveHolding, deleteHolding, saveGoal, deleteGoal };
}
