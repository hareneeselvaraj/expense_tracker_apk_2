export const calculateGoalProgress = (goal, activeHoldings) => {
  const linked = activeHoldings.filter(h => (goal.linkedHoldingIds || []).includes(h.id));
  
  // Calculate current value of linked holdings
  const currentValue = linked.reduce((sum, h) => {
    if (h.calculatedValue !== undefined) return sum + h.calculatedValue;
    if (h.qty !== undefined && h.currentPrice !== undefined) return sum + (h.qty * h.currentPrice);
    return sum + (h.principal || 0);
  }, 0);

  const progressPct = (goal.targetAmount && goal.targetAmount > 0) ? (currentValue / goal.targetAmount) * 100 : 0;
  
  // Calculate months remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ts = goal.targetDate.split("-");
  const target = new Date(ts[0], ts[1] - 1, ts[2]);
  const diffTime = target.getTime() - today.getTime();
  const monthsRemaining = diffTime > 0 ? diffTime / (1000 * 60 * 60 * 24 * 30.44) : 0;
  
  const requiredMonthly = monthsRemaining > 0 ? (goal.targetAmount - currentValue) / monthsRemaining : 0;
  const isComplete = currentValue >= (goal.targetAmount || 1);
  const onTrack = isComplete ? true : ((goal.monthlyContribution || 0) > 0 && (goal.monthlyContribution || 0) >= (requiredMonthly * 0.95));

  return {
    currentValue,
    progressPct: Math.min(progressPct, 100),
    monthsRemaining: Math.max(0, Math.ceil(monthsRemaining)),
    requiredMonthly: Math.max(0, requiredMonthly),
    onTrack
  };
};
