import { calcHoldingValue } from "./valuation.js";

export const calculateGoalProgress = (goal, activeHoldings) => {
  const linked = activeHoldings.filter(h => !h.deleted && (goal.linkedHoldingIds || []).includes(h.id));

  // Use calcHoldingValue for accurate value across all asset types
  const currentValue = linked.reduce((sum, h) => sum + calcHoldingValue(h), 0);

  const progressPct = (goal.targetAmount && goal.targetAmount > 0) ? (currentValue / goal.targetAmount) * 100 : 0;

  // Calculate months remaining (guard against missing targetDate)
  let monthsRemaining = 0;
  if (goal.targetDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ts = goal.targetDate.split("-");
    const target = new Date(parseInt(ts[0], 10), parseInt(ts[1], 10) - 1, parseInt(ts[2], 10));
    const diffTime = target.getTime() - today.getTime();
    monthsRemaining = diffTime > 0 ? diffTime / (1000 * 60 * 60 * 24 * 30.44) : 0;
  }

  const requiredMonthly = monthsRemaining > 0 ? Math.max(0, goal.targetAmount - currentValue) / monthsRemaining : 0;
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
