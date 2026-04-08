/**
 * Year-End Summary Service
 * 
 * WHEN IT RUNS:
 * - On app load, checks if current month is December (month === 11)
 * - Also checks: is it the 15th or later? (gives user time to add December transactions)
 * - If both true AND we haven't sent for this year → trigger the summary
 * 
 * THE USER CAN ALSO TRIGGER THIS MANUALLY from Settings
 * (button: "Send Year Summary Email")
 * 
 * WHAT IT SENDS:
 * 1. A beautifully formatted HTML email with:
 *    - Total income, expense, investments
 *    - Net savings + savings rate percentage
 *    - Monthly income vs expense mini-chart (HTML bars)
 *    - Top 6 spending categories with percentages
 *    - Total transaction count
 * 
 * 2. A CSV attachment with EVERY transaction for the year:
 *    Date, Description, Amount, Type, Credit/Debit, Category, Tags, Account, Notes
 * 
 * WHY CSV AND NOT PDF:
 * - CSV can be imported into Excel, Google Sheets, or any accounting tool
 * - The user gets a portable, machine-readable record of their finances
 * - PDF is good for viewing but terrible for re-processing
 * - We include BOTH: the email body IS the visual summary, the CSV IS the raw data
 */

import { sendEmail } from "./emailService.js";
import { buildYearEndSummaryEmail } from "./emailTemplates.js";
import { dbGet, dbSet } from "./localDb.js";
import { fmtAmt } from "../utils/format.js";

// Build the summary object from raw transaction data
export function buildYearSummary(transactions, categories, tags, accounts, year) {
  const yearTx = transactions.filter(t => !t.deleted && t.date?.startsWith(String(year)));
  
  const totalIncome = yearTx
    .filter(t => t.creditDebit === "Credit" && t.txType !== "Investment")
    .reduce((s, t) => s + (t.amount || 0), 0);
  
  const totalExpense = yearTx
    .filter(t => t.creditDebit === "Debit" && t.txType !== "Investment")
    .reduce((s, t) => s + (t.amount || 0), 0);
  
  const totalInvest = yearTx
    .filter(t => t.txType === "Investment")
    .reduce((s, t) => s + (t.amount || 0), 0);
  
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Monthly breakdown
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyBreakdown = monthNames.map((month, idx) => {
    const monthKey = `${year}-${String(idx + 1).padStart(2, '0')}`;
    const monthTx = yearTx.filter(t => t.date?.startsWith(monthKey));
    return {
      month,
      income: monthTx.filter(t => t.creditDebit === "Credit").reduce((s, t) => s + (t.amount || 0), 0),
      expense: monthTx.filter(t => t.creditDebit === "Debit").reduce((s, t) => s + (t.amount || 0), 0)
    };
  });

  // Top categories by expense
  const catSpend = {};
  yearTx.filter(t => t.creditDebit === "Debit").forEach(t => {
    const cat = categories.find(c => c.id === t.category);
    const name = cat?.name || "Others";
    const color = cat?.color || "#94a3b8";
    if (!catSpend[name]) catSpend[name] = { name, color, amount: 0 };
    catSpend[name].amount += (t.amount || 0);
  });
  const topCategories = Object.values(catSpend)
    .sort((a, b) => b.amount - a.amount)
    .map(c => ({
      ...c,
      percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0
    }));

  return {
    totalIncome,
    totalExpense,
    totalInvest,
    netSavings,
    savingsRate,
    topCategories,
    monthlyBreakdown,
    txCount: yearTx.length
  };
}

// Build CSV content for attachment
export function buildYearCSV(transactions, categories, tags, accounts, year) {
  const yearTx = transactions
    .filter(t => !t.deleted && t.date?.startsWith(String(year)))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const header = "Date,Description,Amount,Type,Credit/Debit,Category,Tags,Account,Notes";
  
  const rows = yearTx.map(t => {
    const cat = categories.find(c => c.id === t.category)?.name || "Others";
    const txTags = (t.tags || []).map(tid => tags.find(tg => tg.id === tid)?.name || "").filter(Boolean).join("; ");
    const acc = accounts.find(a => a.id === t.accountId)?.name || "";
    
    // CSV escape: wrap in quotes if contains comma, quote, or newline
    const esc = (val) => {
      const str = String(val || "").replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    };
    
    return [
      t.date,
      esc(t.description),
      t.amount,
      t.txType || "Expense",
      t.creditDebit || "Debit",
      esc(cat),
      esc(txTags),
      esc(acc),
      esc(t.notes || "")
    ].join(",");
  });

  return [header, ...rows].join("\n");
}

// Check and send year-end email
export async function checkAndSendYearEndEmail(transactions, categories, tags, accounts, user, getToken) {
  if (!user?.email) return false;
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed, December = 11
  const day = now.getDate();
  
  // Only auto-trigger in December, from the 15th onward
  if (month !== 11 || day < 15) return false;
  
  // Check if already sent for this year
  const sentYears = (await dbGet("yearend_emails_sent")) || {};
  if (sentYears[year]) return false;
  
  // Build summary + CSV
  const summary = buildYearSummary(transactions, categories, tags, accounts, year);
  
  // Don't send if there are zero transactions
  if (summary.txCount === 0) return false;
  
  const csvContent = buildYearCSV(transactions, categories, tags, accounts, year);
  const { subject, htmlBody } = buildYearEndSummaryEmail(summary, user.name?.split(" ")[0], year);
  
  try {
    const token = await getToken();
    await sendEmail(token, {
      to: user.email,
      subject,
      htmlBody,
      csvContent,
      csvFilename: `Expense_Tracker_${year}_Full_Year.csv`
    });
    
    // Mark as sent
    sentYears[year] = new Date().toISOString();
    await dbSet("yearend_emails_sent", sentYears);
    
    return true;
  } catch (err) {
    console.error("Year-end email failed:", err);
    return false;
  }
}

// Manual trigger (from Settings page)
export async function sendYearEndEmailManual(transactions, categories, tags, accounts, user, getToken, year) {
  if (!user?.email) throw new Error("No email address found");
  
  const summary = buildYearSummary(transactions, categories, tags, accounts, year);
  if (summary.txCount === 0) throw new Error("No transactions found for " + year);
  
  const csvContent = buildYearCSV(transactions, categories, tags, accounts, year);
  const { subject, htmlBody } = buildYearEndSummaryEmail(summary, user.name?.split(" ")[0], year);
  
  const token = await getToken();
  await sendEmail(token, {
    to: user.email,
    subject,
    htmlBody,
    csvContent,
    csvFilename: `Expense_Tracker_${year}_Full_Year.csv`
  });
  
  // Mark as sent
  const sentYears = (await dbGet("yearend_emails_sent")) || {};
  sentYears[year] = new Date().toISOString();
  await dbSet("yearend_emails_sent", sentYears);
}
