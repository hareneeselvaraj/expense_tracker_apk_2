export const calculateGoalProgress = (goal, activeHoldings) => {
  const linked = activeHoldings.filter(h => (goal.linkedHoldingIds || []).includes(h.id));
  
  // Calculate current value of linked holdings
  const currentValue = linked.reduce((sum, h) => {
    if (h.qty !== undefined && h.currentPrice !== undefined) return sum + (h.qty * h.currentPrice);
    if (h.currentPrice !== undefined) return sum + h.currentPrice;
    return sum + (h.principal || 0);
  }, 0);

  const progressPct = (goal.targetAmount && goal.targetAmount > 0) ? (currentValue / goal.targetAmount) * 100 : 0;
  
  // Calculate months remaining
  const today = new Date();
  const target = new Date(goal.targetDate);
  const diffTime = target.getTime() - today.getTime();
  const monthsRemaining = diffTime > 0 ? diffTime / (1000 * 60 * 60 * 24 * 30.44) : 0;
  
  const requiredMonthly = monthsRemaining > 0 ? (goal.targetAmount - currentValue) / monthsRemaining : 0;
  const onTrack = (goal.monthlyContribution || 0) >= requiredMonthly;

  return {
    currentValue,
    progressPct: Math.min(progressPct, 100),
    monthsRemaining: Math.max(0, Math.ceil(monthsRemaining)),
    requiredMonthly: Math.max(0, requiredMonthly),
    onTrack
  };
};
