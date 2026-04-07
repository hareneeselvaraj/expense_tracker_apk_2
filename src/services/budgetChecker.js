/**
 * Budget Checker Service
 * 
 * Called after every transaction save.
 * Compares month-to-date spend against budget limits.
 * Returns an array of alert objects.
 * 
 * IMPORTANT: This function is PURE — no side effects.
 * The caller (App.jsx) decides whether to show toasts, send emails, etc.
 */

export function checkBudgets(transactions, budgets, categories, tags) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const alerts = [];

  // Get this month's transactions
  const monthTx = transactions.filter(t => t.date?.startsWith(monthKey) && !t.deleted);

  for (const budget of budgets) {
    let spent = 0;
    let budgetName = "";
    let budgetColor = "";

    if (budget.categoryId) {
      // Category budget
      const cat = categories.find(c => c.id === budget.categoryId);
      if (!cat) continue;
      budgetName = cat.name;
      budgetColor = cat.color;
      spent = monthTx
        .filter(t => t.category === budget.categoryId && t.creditDebit === "Debit")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    } else if (budget.tagId) {
      // Tag budget
      const tag = tags.find(t => t.id === budget.tagId);
      if (!tag) continue;
      budgetName = `#${tag.name}`;
      budgetColor = tag.color;
      spent = monthTx
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
