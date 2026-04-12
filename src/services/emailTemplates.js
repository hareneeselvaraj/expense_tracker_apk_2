/**
 * Email Template Builder
 * 
 * All templates use inline CSS only.
 * Tested against: Gmail, Outlook, Apple Mail
 * 
 * COLOR SYSTEM:
 * - Background: #0a0e1a (dark navy, matches app theme)
 * - Card: #111827
 * - Primary: #00e5ff
 * - Income: #00e676
 * - Expense: #ff5252
 * - Text: #e2e8f0
 * - Subtext: #94a3b8
 */

import { fmtAmt } from "../utils/format.js";

export function buildBudgetAlertEmail(alert, userName) {
  const isExceeded = alert.type === "exceeded" || alert.type === "critical";
  const accentColor = isExceeded ? "#ff5252" : "#ffab00";
  const title = isExceeded 
    ? `Budget Exceeded: ${alert.budgetName}` 
    : `Budget Warning: ${alert.budgetName}`;

  return {
    subject: `${title} — Expense Tracker`,
    htmlBody: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0e1a; padding: 32px 16px; color: #e2e8f0;">
        <div style="max-width: 480px; margin: 0 auto;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: ${accentColor};">${title}</h1>
            <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">Hi ${userName || "there"}, your Expense Tracker flagged this:</p>
          </div>

          <!-- Alert Card -->
          <div style="background: #111827; border: 1px solid ${accentColor}33; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
            
            <!-- Category Badge -->
            <div style="display: inline-block; background: ${alert.budgetColor || accentColor}22; color: ${alert.budgetColor || accentColor}; border: 1px solid ${alert.budgetColor || accentColor}44; border-radius: 8px; padding: 4px 12px; font-size: 12px; font-weight: 700; margin-bottom: 16px;">
              ${alert.budgetName}
            </div>

            <!-- Progress Bar -->
            <div style="background: #1e293b; border-radius: 8px; height: 12px; overflow: hidden; margin-bottom: 16px;">
              <div style="background: ${accentColor}; height: 100%; width: ${Math.min(alert.percentage, 100)}%; border-radius: 8px;"></div>
            </div>

            <!-- Numbers -->
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Spent</td>
                <td style="padding: 8px 0; text-align: right; color: ${accentColor}; font-size: 18px; font-weight: 800; font-family: 'JetBrains Mono', monospace;">${fmtAmt(alert.spent)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Budget Limit</td>
                <td style="padding: 8px 0; text-align: right; color: #e2e8f0; font-size: 18px; font-weight: 800; font-family: 'JetBrains Mono', monospace;">${fmtAmt(alert.limit)}</td>
              </tr>
              ${isExceeded ? `
              <tr>
                <td style="padding: 8px 0; border-top: 1px solid #1e293b; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Over By</td>
                <td style="padding: 8px 0; border-top: 1px solid #1e293b; text-align: right; color: #ff5252; font-size: 22px; font-weight: 900; font-family: 'JetBrains Mono', monospace;">${fmtAmt(alert.overshoot)}</td>
              </tr>` : `
              <tr>
                <td style="padding: 8px 0; border-top: 1px solid #1e293b; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Remaining</td>
                <td style="padding: 8px 0; border-top: 1px solid #1e293b; text-align: right; color: #00e676; font-size: 22px; font-weight: 900; font-family: 'JetBrains Mono', monospace;">${fmtAmt(alert.remaining)}</td>
              </tr>`}
            </table>
          </div>

          <!-- Usage percentage -->
          <div style="text-align: center; color: #94a3b8; font-size: 48px; font-weight: 900; font-family: 'JetBrains Mono', monospace; letter-spacing: -2px;">
            ${alert.percentage}%
          </div>
          <div style="text-align: center; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 32px;">
            of monthly budget used
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #1e293b;">
            <p style="color: #475569; font-size: 11px; margin: 0;">Sent by Expense Tracker Cloud · Your data never leaves your device</p>
          </div>
        </div>
      </div>
    `
  };
}


export function buildYearEndSummaryEmail(summary, userName, year) {
  // summary = { totalIncome, totalExpense, totalInvest, netSavings, savingsRate,
  //             topCategories: [{name, color, amount, percentage}],
  //             monthlyBreakdown: [{month, income, expense}],
  //             txCount }

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  
  // Build monthly bars (pure HTML table, no CSS grid — email-safe)
  const maxMonthly = Math.max(...summary.monthlyBreakdown.map(m => Math.max(m.income, m.expense)), 1);
  
  const monthlyRowsHtml = summary.monthlyBreakdown.map(m => {
    const incWidth = Math.max(Math.round((m.income / maxMonthly) * 100), 2);
    const expWidth = Math.max(Math.round((m.expense / maxMonthly) * 100), 2);
    return `
      <tr>
        <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 11px; font-weight: 700; width: 36px;">${m.month}</td>
        <td style="padding: 4px 0;">
          <div style="background: #00e67633; border-radius: 4px; height: 8px; width: ${incWidth}%; margin-bottom: 3px;"></div>
          <div style="background: #ff525233; border-radius: 4px; height: 8px; width: ${expWidth}%;"></div>
        </td>
        <td style="padding: 4px 0 4px 8px; text-align: right; font-size: 11px; color: ${m.income - m.expense >= 0 ? '#00e676' : '#ff5252'}; font-weight: 700; font-family: monospace; width: 70px;">
          ${m.income - m.expense >= 0 ? '+' : ''}${fmtAmt(m.income - m.expense)}
        </td>
      </tr>
    `;
  }).join("");

  const topCatsHtml = summary.topCategories.slice(0, 6).map(cat => `
    <tr>
      <td style="padding: 6px 0;">
        <div style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${cat.color}; margin-right: 8px; vertical-align: middle;"></div>
        <span style="color: #e2e8f0; font-size: 13px; font-weight: 600;">${cat.name}</span>
      </td>
      <td style="padding: 6px 0; text-align: right; color: #94a3b8; font-size: 13px; font-weight: 700; font-family: monospace;">${fmtAmt(cat.amount)}</td>
      <td style="padding: 6px 0; text-align: right; color: #64748b; font-size: 11px; font-weight: 600; width: 50px;">${cat.percentage}%</td>
    </tr>
  `).join("");

  return {
    subject: `Your ${year} Financial Year in Review — Expense Tracker`,
    htmlBody: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0e1a; padding: 32px 16px; color: #e2e8f0;">
        <div style="max-width: 520px; margin: 0 auto;">
          
          <!-- Hero -->
          <div style="text-align: center; margin-bottom: 40px; padding: 40px 20px; background: linear-gradient(135deg, #111827, #0f172a); border-radius: 24px; border: 1px solid #1e293b;">
            <h1 style="font-size: 28px; font-weight: 900; margin: 0; color: #00e5ff; letter-spacing: -0.5px;">${year} Financial Summary</h1>
            <p style="color: #94a3b8; font-size: 14px; margin: 12px 0 0;">Hi ${userName || "there"}, here's your complete financial year in review.</p>
            <p style="color: #64748b; font-size: 12px; margin: 4px 0 0;">${summary.txCount} transactions tracked this year</p>
          </div>

          <!-- Big Numbers -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="background: #111827; border-radius: 16px 0 0 16px; padding: 20px; text-align: center; border: 1px solid #1e293b; border-right: none; width: 50%;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Total Income</div>
                <div style="color: #00e676; font-size: 22px; font-weight: 900; font-family: 'JetBrains Mono', monospace;">${fmtAmt(summary.totalIncome)}</div>
              </td>
              <td style="background: #111827; border-radius: 0 16px 16px 0; padding: 20px; text-align: center; border: 1px solid #1e293b; border-left: none; width: 50%;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Total Expenses</div>
                <div style="color: #ff5252; font-size: 22px; font-weight: 900; font-family: 'JetBrains Mono', monospace;">${fmtAmt(summary.totalExpense)}</div>
              </td>
            </tr>
          </table>

          <!-- Savings Card -->
          <div style="background: #111827; border: 1px solid #00e5ff22; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
            <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Net Savings</div>
            <div style="color: ${summary.netSavings >= 0 ? '#00e676' : '#ff5252'}; font-size: 36px; font-weight: 900; font-family: 'JetBrains Mono', monospace; letter-spacing: -1px;">
              ${summary.netSavings >= 0 ? '+' : ''}${fmtAmt(Math.abs(summary.netSavings))}
            </div>
            <div style="color: #00e5ff; font-size: 14px; font-weight: 700; margin-top: 8px;">
              ${summary.savingsRate}% savings rate
            </div>
          </div>

          <!-- Investments -->
          ${summary.totalInvest > 0 ? `
          <div style="background: #111827; border: 1px solid #6366f133; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">Total Invested</div>
                <div style="color: #b388ff; font-size: 20px; font-weight: 900; font-family: monospace; margin-top: 4px;">${fmtAmt(summary.totalInvest)}</div>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Monthly Breakdown -->
          <div style="background: #111827; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <div style="color: #e2e8f0; font-size: 14px; font-weight: 800; margin-bottom: 16px;">Monthly Flow</div>
            <div style="display: flex; gap: 12px; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 8px; height: 8px; border-radius: 2px; background: #00e67633;"></div>
                <span style="color: #94a3b8; font-size: 10px; font-weight: 700;">Income</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 8px; height: 8px; border-radius: 2px; background: #ff525233;"></div>
                <span style="color: #94a3b8; font-size: 10px; font-weight: 700;">Expense</span>
              </div>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              ${monthlyRowsHtml}
            </table>
          </div>

          <!-- Top Categories -->
          <div style="background: #111827; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <div style="color: #e2e8f0; font-size: 14px; font-weight: 800; margin-bottom: 16px;">Top Spending Categories</div>
            <table style="width: 100%; border-collapse: collapse;">
              ${topCatsHtml}
            </table>
          </div>

          <!-- CTA -->
          <div style="text-align: center; margin-bottom: 32px;">
            <p style="color: #94a3b8; font-size: 13px; margin-bottom: 16px;">Your complete transaction CSV is attached below.</p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #1e293b;">
            <p style="color: #475569; font-size: 11px; margin: 0;">Expense Tracker Cloud · ${year} Year-End Report</p>
            <p style="color: #334155; font-size: 10px; margin: 4px 0 0;">Your data is stored in your Google Drive. We have zero access to it.</p>
          </div>
        </div>
      </div>
    `
  };
}
