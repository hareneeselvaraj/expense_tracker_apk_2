/**
 * recurringEngine.js — Processes recurring transaction templates.
 * On app load, checks for due recurring transactions and auto-posts or queues them.
 */
import { uid } from "../utils/id.js";
import { todayISO } from "../utils/format.js";

/**
 * Advance a date to the next occurrence based on frequency.
 */
export function advanceDate(dateStr, frequency) {
  // Parsing "YYYY-MM-DD" strictly defaults to UTC midnight in JS.
  const d = new Date(dateStr);
  switch (frequency) {
    case "daily":    d.setUTCDate(d.getUTCDate() + 1); break;
    case "weekly":   d.setUTCDate(d.getUTCDate() + 7); break;
    case "biweekly": d.setUTCDate(d.getUTCDate() + 14); break;
    case "monthly":  d.setUTCMonth(d.getUTCMonth() + 1); break;
    case "yearly":   d.setUTCFullYear(d.getUTCFullYear() + 1); break;
    default:         d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d.toISOString().split("T")[0];
}

/**
 * Process all recurring templates and return:
 * - newTransactions: auto-posted transactions to add
 * - pendingReminders: templates that are due but not auto-posted
 * - updatedTemplates: templates with advanced nextDue dates
 */
export function processRecurring(templates = []) {
  const today = todayISO();
  const newTransactions = [];
  const pendingReminders = [];
  const updatedTemplates = [];

  templates.forEach(tmpl => {
    let current = { ...tmpl };
    
    // Skip if no nextDue or if it's ended or paused
    if (!current.nextDue || current.paused) {
      updatedTemplates.push(current);
      return;
    }
    if (current.endDate && current.nextDue > current.endDate) {
      updatedTemplates.push(current);
      return;
    }

    // Process all due dates up to today
    while (current.nextDue <= today) {
      if (current.endDate && current.nextDue > current.endDate) break;

      if (current.autoPost) {
        // Auto-create the transaction
        newTransactions.push({
          ...current.templateTx,
          id: uid(),
          date: current.nextDue,
          updatedAt: new Date().toISOString(),
          recurringId: current.id
        });
      } else {
        pendingReminders.push({
          ...current,
          dueDate: current.nextDue
        });
      }

      current = {
        ...current,
        nextDue: advanceDate(current.nextDue, current.frequency)
      };
    }

    updatedTemplates.push(current);
  });

  return { newTransactions, pendingReminders, updatedTemplates };
}

/**
 * Get upcoming recurring transactions for the next N days (for Dashboard).
 */
export function getUpcoming(templates = [], days = 7) {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  const futureISO = futureDate.toISOString().split("T")[0];

  return templates
    .filter(t => t.nextDue && t.nextDue <= futureISO)
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue));
}

/**
 * Create a blank recurring template.
 */
export function blankRecurring() {
  return {
    id: uid(),
    templateTx: {
      description: "",
      amount: "",
      creditDebit: "Debit",
      txType: "Expense",
      category: "c13",
      tags: [],
      accountId: "",
      notes: ""
    },
    frequency: "monthly",
    startDate: todayISO(),
    endDate: null,
    nextDue: todayISO(),
    autoPost: true
  };
}
