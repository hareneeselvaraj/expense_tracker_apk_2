export const selectActiveHoldings = (data) => (data?.holdings || []).filter(h => !h.deleted);
export const selectActiveGoals = (data) => (data?.goals || []).filter(g => !g.deleted);
export const selectActiveTransactions = (data) => (data?.transactions || []).filter(t => !t.deleted);
