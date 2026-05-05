/**
 * Budget Checker Service
 * 
 * Called after every transaction save.
 * Compares period-to-date spend against budget limits.
 * Supports both weekly and monthly budget periods.
 * Returns an array of alert objects.
 * 
 * IMPORTANT: This function is PURE — no side effects.
 * The caller (App.jsx) decides whether to show toasts, send emails, etc.
 */

import { startOfWeek, toISO } from "../utils/format.js";

/**
 * Get the date range [from, to] for a budget period containing "now".
 */
function getPeriodRange(period) {
  const now = new Date();
  if (period === "weekly") {
    const mon = startOfWeek(now);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return [toISO(mon), toISO(sun)];
  }
  // Default: monthly
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = n => String(n).padStart(2, '0');
  const from = `${y}-${pad(m + 1)}-01`;
  const to = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
  return [from, to];
}

export function checkBudgets(transactions, budgets, categories, tags) {
  const alerts = [];

  // Pre-compute period ranges to avoid recalculating for each budget
  const monthRange = getPeriodRange("monthly");
  const weekRange = getPeriodRange("weekly");

  for (const budget of budgets) {
    const period = budget.period || "monthly";
    const [from, to] = period === "weekly" ? weekRange : monthRange;

    // Get transactions in this period
    const periodTx = transactions.filter(t =>
      t.date >= from && t.date <= to && !t.deleted
    );

    let spent = 0;
    let budgetName = "";
    let budgetColor = "";

    if (budget.categoryId) {
      // Category budget
      const cat = categories.find(c => c.id === budget.categoryId && !c.deleted);
      if (!cat) continue;
      budgetName = cat.name;
      budgetColor = cat.color;
      spent = periodTx
        .filter(t => t.category === budget.categoryId && t.creditDebit === "Debit")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    } else if (budget.tagId) {
      // Tag budget
      const tag = tags.find(t => t.id === budget.tagId && !t.deleted);
      if (!tag) continue;
      budgetName = `#${tag.name}`;
      budgetColor = tag.color;
      spent = periodTx
        .filter(t => (t.tags || []).includes(budget.tagId) && t.creditDebit === "Debit")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    }

    const limit = budget.amount || 0;
    if (limit <= 0) continue;

    const percentage = Math.round((spent / limit) * 100);

    if (percentage >= 120) {
      alerts.push({
        type: "critical",
        budgetName,
        budgetColor,
        spent,
        limit,
        percentage,
        period,
        overshoot: spent - limit
      });
    } else if (percentage >= 100) {
      alerts.push({
        type: "exceeded",
        budgetName,
        budgetColor,
        spent,
        limit,
        percentage,
        period,
        overshoot: spent - limit
      });
    } else if (percentage >= 80) {
      alerts.push({
        type: "warning",
        budgetName,
        budgetColor,
        spent,
        limit,
        percentage,
        period,
        remaining: limit - spent
      });
    }
  }

  // Preserve existing getter functionality for the front-end by ensuring getActiveAlerts logic fits here
  return alerts;
}

export function getActiveAlerts(transactions, budgets, categories, tags) {
  return checkBudgets(transactions, budgets, categories, tags);
}
