/**
 * Budget Email Sender
 * 
 * DEDUPLICATION LOGIC:
 * - Store a "last email sent" timestamp per budget in IndexedDB
 * - Only send ONE email per budget per 24-hour period
 * - This prevents: user adds 5 transactions → 5 budget exceed emails
 * 
 * ARCHITECTURE:
 * - This is the COORDINATOR between budgetChecker and emailService
 * - budgetChecker is pure (computes alerts)
 * - emailService is pure (sends emails)
 * - This module manages the WHEN and IF
 */

import { checkBudgets } from "./budgetChecker.js";
import { sendEmail } from "./emailService.js";
import { buildBudgetAlertEmail } from "./emailTemplates.js";
import { dbGet, dbSet } from "./localDb.js";

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function processBudgetAlerts(transactions, budgets, categories, tags, user, getToken) {
  if (!user?.email) return [];
  
  const alerts = checkBudgets(transactions, budgets, categories, tags);
  const exceededAlerts = alerts.filter(a => a.type === "exceeded" || a.type === "critical");
  
  if (exceededAlerts.length === 0) return alerts;

  // Load cooldown map
  const cooldowns = (await dbGet("budget_email_cooldowns")) || {};
  const now = Date.now();
  const emailsToSend = [];

  for (const alert of exceededAlerts) {
    const key = `budget_${alert.budgetName}`;
    const lastSent = cooldowns[key] || 0;
    
    if (now - lastSent > COOLDOWN_MS) {
      emailsToSend.push(alert);
      cooldowns[key] = now;
    }
  }

  if (emailsToSend.length === 0) return alerts;

  // Save updated cooldowns BEFORE attempting to send
  // (prevents retry-spam if send fails partway through)
  await dbSet("budget_email_cooldowns", cooldowns);

  // Send emails (fire-and-forget, don't block the UI)
  try {
    const token = await getToken();
    for (const alert of emailsToSend) {
      const { subject, htmlBody } = buildBudgetAlertEmail(alert, user.name?.split(" ")[0]);
      await sendEmail(token, {
        to: user.email,
        subject,
        htmlBody
      });
    }
  } catch (err) {
    console.error("Budget email send failed:", err);
    // Don't throw — email failure should never break the app
    // The in-app toast already alerted the user
  }

  return alerts;
}
