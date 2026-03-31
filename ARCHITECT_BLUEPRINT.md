# 🏗️ EXPENSE TRACKER CLOUD — SENIOR ARCHITECT BLUEPRINT
## Task Assignment Document for Junior Implementation Agents

**Author:** Senior Architect  
**Project:** Expense Tracker Cloud (MoneyLens V2)  
**Stack:** React (Vite) · IndexedDB · Google Drive API · Gmail API · PWA  
**Hard Rule:** ZERO backend. Everything runs in the browser. The user's Google account IS the server.

---

# SECTION A — WHAT ARE "RULES" AND WHY THEY EXIST

## The Problem Rules Solve

When a user adds a transaction manually or imports from a bank statement, the description field contains messy text like `UPI/BENGALURU/gpay-121/SWIGGY/AXIS BANK/080329017536`. The user should NOT have to manually pick "Food & Dining" every single time they order from Swiggy. That's where **Rules** come in.

## How Rules Currently Work (Two Separate Systems — This Is A Problem)

### System 1: Hardcoded Auto-Categorization (constants/defaults.js)

```
const RULES = {
  SWIGGY: "Food & Dining",
  ZOMATO: "Food & Dining",
  AMAZON: "Shopping",
  NETFLIX: "Entertainment",
  SALARY: "Salary",
  ...
};
```

This is a static keyword-to-category map. When a bank statement is imported via the Statement Analyzer, the `autoCategory()` function runs the description through this dictionary. It's fast, but the user cannot customize it.

### System 2: User-Defined Rules (stored in `rules` state array)

```
{
  id: "rule_xyz",
  pattern: "swiggy",
  categoryId: "c1"    // → Food & Dining
}
```

These are rules the user creates in the Organize → Rules tab. When `handleSaveTx()` runs, it checks each new transaction's description against every rule's `pattern` using `.includes()`. If there's a match, it overrides the category.

### The Logic Gap (CRITICAL)

**These two systems don't talk to each other.** Here's what breaks:

1. User imports a bank statement → System 1 (hardcoded RULES) runs → categories assigned
2. User manually adds a transaction with description "Swiggy order" → System 2 (user rules) runs → categories assigned
3. But if the user creates a custom rule saying "swiggy" → "Snacks" (a custom category), and then imports a statement, System 1 runs FIRST and assigns "Food & Dining" — the user's custom rule is IGNORED during statement import
4. System 2 only runs inside `handleSaveTx()`, but the Statement Analyzer has its own `importProcessed()` flow that bypasses `handleSaveTx()` in the monolithic version

### What Needs to Change

**Merge into one unified pipeline.** Every transaction, regardless of source (manual entry, bank import, CSV upload, recurring auto-post), must pass through a single categorization pipeline:

```
Transaction In
      │
      ▼
┌─────────────────────┐
│ Step 1: User Rules   │  ← Check user-defined rules FIRST (highest priority)
│ (rules[] array)      │     User's intent always wins
└──────────┬──────────┘
           │ no match
           ▼
┌─────────────────────┐
│ Step 2: Smart Engine │  ← CATEGORY_RULES from statement-engine.js
│ (140+ keywords)      │     Covers banks, UPI, merchants, etc.
└──────────┬──────────┘
           │ no match
           ▼
┌─────────────────────┐
│ Step 3: Credit/Debit │  ← If credit and unmatched → "Other Income"
│ Fallback Heuristic   │     If debit and unmatched → "Others"
└──────────┬──────────┘
           │
           ▼
     Category Assigned
```

---

## TASK ASSIGNMENT: AGENT-RULES-001

**File to create:** `src/services/categorizationPipeline.js`

**What you must build:**

```js
// This is the ONLY function that assigns categories. Period.
// Every code path that creates a transaction calls this.

export function categorizeTransaction(tx, userRules, categories) {
  const desc = (tx.description || "").toLowerCase();
  
  // Priority 1: User-defined rules (from rules[] state)
  for (const rule of userRules) {
    if (desc.includes(rule.pattern.toLowerCase())) {
      return { ...tx, category: rule.categoryId };
    }
  }
  
  // Priority 2: Smart engine (from statement-engine.js CATEGORY_RULES)
  const smartMatch = smartCategorize(desc, tx.amount, tx.creditDebit === "Credit");
  if (smartMatch.name !== "Others") {
    const cat = categories.find(c => c.name === smartMatch.name);
    if (cat) return { ...tx, category: cat.id };
  }
  
  // Priority 3: Credit/Debit fallback
  if (tx.creditDebit === "Credit") {
    const incCat = categories.find(c => c.name === "Other Income" || c.type === "Income");
    if (incCat) return { ...tx, category: incCat.id };
  }
  
  // Final fallback
  return { ...tx, category: categories.find(c => c.name === "Others")?.id || "c13" };
}
```

**Where to integrate:**
- `handleSaveTx()` in App.jsx — replace the current inline rule matching
- `importProcessed()` in the Statement Analyzer — replace `autoCategory()`
- `recurringEngine.js` (new) — when auto-posting scheduled transactions
- Any future transaction source

**Test cases you must verify:**
1. User rule "netflix" → "Guilty Pleasures" (custom category) OVERRIDES the hardcoded "Entertainment" mapping
2. Bank statement with "SALARY/APR/2026" correctly gets "Salary" from smart engine when no user rule exists
3. A credit transaction with no matches gets "Other Income", not "Others"
4. A debit transaction with no matches gets "Others"
5. Rules are case-insensitive

---

# SECTION B — EMAIL SYSTEM (Budget Alerts + Year-End Summary)

## The Core Challenge: No Backend = No SMTP Server

You cannot `fetch("https://api.sendgrid.com/...")` from a browser without a backend proxy — CORS will block it, and you'd be exposing API keys in client-side code.

**The solution: Gmail API.**

The user is already authenticated with Google (for Drive). We extend the OAuth scope to include Gmail send permission. The user's OWN Gmail account sends the email TO THEMSELVES. No third-party email service. No backend.

## OAuth Scope Changes

**Current scope:**
```
https://www.googleapis.com/auth/drive.file
```

**New scope (add Gmail send):**
```
https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.send
```

The `gmail.send` scope ONLY allows sending emails — it cannot read the user's inbox. This is the minimum-privilege scope.

### TASK ASSIGNMENT: AGENT-AUTH-001

**File to modify:** `src/services/driveService.js`

Rename this file to `src/services/googleService.js` and update the token client:

```js
const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.send"
].join(" ");

// In initTokenClient:
scope: SCOPES,
```

**Also update:** `src/constants/config.js` to add:
```js
export const GOOGLE_SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.send";
```

**Google Cloud Console update required:**
- Go to APIs & Services → Library → Enable "Gmail API"
- The OAuth consent screen already has the app — just add the gmail.send scope
- Re-submit for verification if the app is already verified

---

## FEATURE B1: Budget Exceed Email Alert

### How It Works

```
User saves a transaction
        │
        ▼
budgetChecker.js runs
        │
        ▼
Calculates month-to-date spend per category
        │
        ▼
Compares against budget limits
        │
        ├── < 80%  → Do nothing
        ├── ≥ 80%  → Show amber toast in-app
        ├── ≥ 100% → Show red toast + Send email alert
        └── ≥ 120% → Show red toast + Send email with "CRITICAL" flag
```

### TASK ASSIGNMENT: AGENT-BUDGET-001

**File to create:** `src/services/budgetChecker.js`

```js
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
  const monthTx = transactions.filter(t => t.date?.startsWith(monthKey));

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

  return alerts;
}
```

**Where to call this:**

In `App.jsx`, inside `handleSaveTx()`, AFTER the transaction is saved:

```js
const handleSaveTx = (data) => {
  // ... existing save logic ...

  // Budget check (runs after state update via useEffect)
  // We use a ref to trigger this after the next render
  budgetCheckPending.current = true;
};

// In a useEffect that watches transactions:
useEffect(() => {
  if (!budgetCheckPending.current) return;
  budgetCheckPending.current = false;

  const alerts = checkBudgets(transactions, budgets, categories, tags);
  
  for (const alert of alerts) {
    if (alert.type === "warning") {
      notify(`⚠️ ${alert.budgetName}: ${alert.percentage}% of budget used`, "warning");
    }
    if (alert.type === "exceeded" || alert.type === "critical") {
      notify(`🚨 ${alert.budgetName}: Budget EXCEEDED by ₹${fmtAmt(alert.overshoot)}`, "error");
      
      // Send email alert (only if user has email enabled in settings)
      if (emailAlertsEnabled && user?.email) {
        sendBudgetAlertEmail(user.email, alert);
      }
    }
  }
}, [transactions]);
```

### TASK ASSIGNMENT: AGENT-EMAIL-001

**File to create:** `src/services/emailService.js`

This is the core Gmail API email sender. It constructs RFC 2822 email messages and sends them via the Gmail API.

```js
/**
 * Gmail Send Service
 * 
 * Sends emails using the authenticated user's Gmail account.
 * Requires: gmail.send OAuth scope
 * 
 * ARCHITECTURE NOTES:
 * - The Gmail API expects a base64url-encoded RFC 2822 message
 * - We construct the raw email string, encode it, and POST to Gmail
 * - The "from" address is always the authenticated user (Google enforces this)
 * - The "to" address is also the user — they email THEMSELVES
 * 
 * WHY THIS APPROACH:
 * - No backend needed
 * - No third-party email service
 * - No API keys exposed in client code
 * - User's own Gmail sends it — deliverability is guaranteed
 * - gmail.send scope cannot read inbox — privacy preserved
 */

// Convert string to base64url (Gmail API requirement)
function base64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Build RFC 2822 email with HTML body
function buildMimeMessage({ to, subject, htmlBody }) {
  const boundary = "boundary_" + Date.now();
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    `--${boundary}--`
  ];
  return lines.join("\r\n");
}

// Build RFC 2822 email with HTML body + CSV attachment
function buildMimeMessageWithAttachment({ to, subject, htmlBody, csvContent, csvFilename }) {
  const boundary = "boundary_" + Date.now();
  const csvBase64 = btoa(unescape(encodeURIComponent(csvContent)));
  
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    ``,
    `--${boundary}`,
    `Content-Type: text/csv; name="${csvFilename}"`,
    `Content-Disposition: attachment; filename="${csvFilename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    csvBase64,
    ``,
    `--${boundary}--`
  ];
  return lines.join("\r\n");
}

// Send email via Gmail API
export async function sendEmail(token, { to, subject, htmlBody, csvContent, csvFilename }) {
  let rawMessage;
  
  if (csvContent && csvFilename) {
    rawMessage = buildMimeMessageWithAttachment({ to, subject, htmlBody, csvContent, csvFilename });
  } else {
    rawMessage = buildMimeMessage({ to, subject, htmlBody });
  }

  const encoded = base64url(rawMessage);

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: encoded })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gmail API error ${res.status}: ${err.error?.message || "Unknown"}`);
  }

  return await res.json();
}
```

### TASK ASSIGNMENT: AGENT-EMAIL-002

**File to create:** `src/services/emailTemplates.js`

These are the HTML email templates. They must be INLINE CSS only — email clients don't support external stylesheets or `<style>` tags reliably.

```js
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
  const emoji = isExceeded ? "🚨" : "⚠️";
  const title = isExceeded 
    ? `Budget Exceeded: ${alert.budgetName}` 
    : `Budget Warning: ${alert.budgetName}`;

  return {
    subject: `${emoji} ${title} — Expense Tracker`,
    htmlBody: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0e1a; padding: 32px 16px; color: #e2e8f0;">
        <div style="max-width: 480px; margin: 0 auto;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-size: 40px; margin-bottom: 8px;">${emoji}</div>
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
                <td style="padding: 8px 0; text-align: right; color: ${accentColor}; font-size: 18px; font-weight: 800; font-family: 'JetBrains Mono', monospace;">₹${fmtAmt(alert.spent)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Budget Limit</td>
                <td style="padding: 8px 0; text-align: right; color: #e2e8f0; font-size: 18px; font-weight: 800; font-family: 'JetBrains Mono', monospace;">₹${fmtAmt(alert.limit)}</td>
              </tr>
              ${isExceeded ? `
              <tr>
                <td style="padding: 8px 0; border-top: 1px solid #1e293b; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Over By</td>
                <td style="padding: 8px 0; border-top: 1px solid #1e293b; text-align: right; color: #ff5252; font-size: 22px; font-weight: 900; font-family: 'JetBrains Mono', monospace;">₹${fmtAmt(alert.overshoot)}</td>
              </tr>` : `
              <tr>
                <td style="padding: 8px 0; border-top: 1px solid #1e293b; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Remaining</td>
                <td style="padding: 8px 0; border-top: 1px solid #1e293b; text-align: right; color: #00e676; font-size: 22px; font-weight: 900; font-family: 'JetBrains Mono', monospace;">₹${fmtAmt(alert.remaining)}</td>
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
  //             accountBalances: [{name, balance}],
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
          ${m.income - m.expense >= 0 ? '+' : ''}₹${fmtAmt(m.income - m.expense)}
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
      <td style="padding: 6px 0; text-align: right; color: #94a3b8; font-size: 13px; font-weight: 700; font-family: monospace;">₹${fmtAmt(cat.amount)}</td>
      <td style="padding: 6px 0; text-align: right; color: #64748b; font-size: 11px; font-weight: 600; width: 50px;">${cat.percentage}%</td>
    </tr>
  `).join("");

  return {
    subject: `📊 Your ${year} Financial Year in Review — Expense Tracker`,
    htmlBody: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0e1a; padding: 32px 16px; color: #e2e8f0;">
        <div style="max-width: 520px; margin: 0 auto;">
          
          <!-- Hero -->
          <div style="text-align: center; margin-bottom: 40px; padding: 40px 20px; background: linear-gradient(135deg, #111827, #0f172a); border-radius: 24px; border: 1px solid #1e293b;">
            <div style="font-size: 56px; margin-bottom: 12px;">📊</div>
            <h1 style="font-size: 28px; font-weight: 900; margin: 0; color: #00e5ff; letter-spacing: -0.5px;">${year} Financial Summary</h1>
            <p style="color: #94a3b8; font-size: 14px; margin: 12px 0 0;">Hi ${userName || "there"}, here's your complete financial year in review.</p>
            <p style="color: #64748b; font-size: 12px; margin: 4px 0 0;">${summary.txCount} transactions tracked this year</p>
          </div>

          <!-- Big Numbers -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="background: #111827; border-radius: 16px 0 0 16px; padding: 20px; text-align: center; border: 1px solid #1e293b; border-right: none; width: 50%;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Total Income</div>
                <div style="color: #00e676; font-size: 22px; font-weight: 900; font-family: 'JetBrains Mono', monospace;">₹${fmtAmt(summary.totalIncome)}</div>
              </td>
              <td style="background: #111827; border-radius: 0 16px 16px 0; padding: 20px; text-align: center; border: 1px solid #1e293b; border-left: none; width: 50%;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Total Expenses</div>
                <div style="color: #ff5252; font-size: 22px; font-weight: 900; font-family: 'JetBrains Mono', monospace;">₹${fmtAmt(summary.totalExpense)}</div>
              </td>
            </tr>
          </table>

          <!-- Savings Card -->
          <div style="background: #111827; border: 1px solid #00e5ff22; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
            <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Net Savings</div>
            <div style="color: ${summary.netSavings >= 0 ? '#00e676' : '#ff5252'}; font-size: 36px; font-weight: 900; font-family: 'JetBrains Mono', monospace; letter-spacing: -1px;">
              ${summary.netSavings >= 0 ? '+' : ''}₹${fmtAmt(Math.abs(summary.netSavings))}
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
                <div style="color: #b388ff; font-size: 20px; font-weight: 900; font-family: monospace; margin-top: 4px;">₹${fmtAmt(summary.totalInvest)}</div>
              </div>
              <div style="font-size: 32px;">💎</div>
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
```

---

### TASK ASSIGNMENT: AGENT-EMAIL-003

**File to create:** `src/services/budgetEmailSender.js`

This wires the budget checker to the email service. Handles deduplication (don't spam the user with 10 emails if they add 10 transactions in a row).

```js
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
```

---

## FEATURE B2: Year-End Financial Summary Email (December)

### How It Works

```
User opens app in December (any day)
        │
        ▼
yearEndChecker runs (useEffect on app load)
        │
        ▼
Has the user already received the year-end email for this year?
  │                          │
  ├── YES → Do nothing       │
  │                          │
  └── NO ──────────────────► Build year summary object
                                    │
                                    ▼
                             Generate CSV of all transactions for the year
                                    │
                                    ▼
                             Build beautiful HTML email with summary stats
                                    │
                                    ▼
                             Attach the CSV to the email
                                    │
                                    ▼
                             Send via Gmail API
                                    │
                                    ▼
                             Mark this year as "sent" in IndexedDB
                                    │
                                    ▼
                             Show in-app confirmation:
                             "📊 Your 2026 Financial Summary
                              has been sent to your email!"
```

### TASK ASSIGNMENT: AGENT-YEAREND-001

**File to create:** `src/services/yearEndService.js`

```js
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
  const yearTx = transactions.filter(t => t.date?.startsWith(String(year)));
  
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
    .filter(t => t.date?.startsWith(String(year)))
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
```

### TASK ASSIGNMENT: AGENT-YEAREND-002

**Integration in App.jsx:**

Add this useEffect to auto-trigger the year-end email:

```js
// Year-end email auto-trigger
useEffect(() => {
  if (!ready || !user) return;
  
  const getToken = () => driveService.getDriveToken(CLIENT_ID, driveTokenRef);
  
  checkAndSendYearEndEmail(transactions, categories, tags, accounts, user, getToken)
    .then(sent => {
      if (sent) {
        notify("📊 Your year-end financial summary has been emailed to you!");
      }
    })
    .catch(err => {
      console.error("Year-end email check failed:", err);
      // Silent failure — this is a background feature
    });
}, [ready, user]); // Only run once on app load when user is available
```

### TASK ASSIGNMENT: AGENT-YEAREND-003

**Integration in Settings page:**

Add a "Send Year Summary" button in the Settings page:

```jsx
// In SettingsPage component, add a new section:

<div style={{background:C.card, borderRadius:24, border:`1px solid ${C.border}`, padding:20}}>
  <div style={{color:C.sub, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".1em", marginBottom:16}}>
    Email Reports
  </div>
  
  {/* Year selector */}
  <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}>
    <select 
      value={selectedYear} 
      onChange={e => setSelectedYear(parseInt(e.target.value))}
      style={{background:C.input, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 16px", color:C.text, fontSize:14, fontWeight:700}}
    >
      {/* Show years that have transactions */}
      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  </div>

  <button 
    onClick={handleSendYearSummary} 
    disabled={sendingEmail}
    style={{
      width:"100%", padding:"14px 20px", background:"linear-gradient(135deg, #00e5ff, #6366f1)",
      border:"none", borderRadius:16, color:"#000", fontSize:14, fontWeight:800,
      cursor: sendingEmail ? "wait" : "pointer", opacity: sendingEmail ? 0.6 : 1
    }}
  >
    {sendingEmail ? "Sending..." : `📊 Email ${selectedYear} Financial Summary`}
  </button>
  
  <div style={{color:C.sub, fontSize:11, marginTop:8, textAlign:"center"}}>
    Sends a summary email with CSV attachment to {user?.email}
  </div>
</div>
```

---

# SECTION C — PWA SETUP

### Why PWA Matters for Email Features

The year-end email trigger needs to fire in December even if the user doesn't open the app regularly. A PWA with a service worker can:
1. Run background sync to check dates
2. Show push notifications ("Your year-end summary is ready — tap to send")
3. Cache the app for offline use

### TASK ASSIGNMENT: AGENT-PWA-001

**File to create:** `public/manifest.json`

```json
{
  "name": "Expense Tracker Cloud",
  "short_name": "ExpTracker",
  "description": "Your private financial command center",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#020408",
  "theme_color": "#00e5ff",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**File to create:** `public/sw.js`

```js
const CACHE_NAME = "expense-tracker-v2";
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Install: precache shell
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API calls, cache-first for assets
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  
  // Never cache Google API calls
  if (url.hostname.includes("googleapis.com") || url.hostname.includes("google.com")) {
    return;
  }
  
  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      });
      return cached || fetched;
    })
  );
});

// Periodic sync for year-end check (where supported)
self.addEventListener("periodicsync", e => {
  if (e.tag === "year-end-check") {
    e.waitUntil(checkYearEndFromSW());
  }
});

async function checkYearEndFromSW() {
  const now = new Date();
  if (now.getMonth() !== 11 || now.getDate() < 15) return;
  
  // Notify the main app to check
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: "YEAR_END_CHECK" });
  });
}
```

**Modify:** `index.html` — add manifest link and SW registration:

```html
<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#00e5ff" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</head>
<body>
  <div id="root"></div>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  </script>
</body>
```

---

# SECTION D — COMPLETE DEPENDENCY MAP

## New Files to Create

```
src/
├── services/
│   ├── categorizationPipeline.js   ← AGENT-RULES-001
│   ├── googleService.js            ← AGENT-AUTH-001 (rename driveService.js)
│   ├── emailService.js             ← AGENT-EMAIL-001
│   ├── emailTemplates.js           ← AGENT-EMAIL-002
│   ├── budgetChecker.js            ← AGENT-BUDGET-001
│   ├── budgetEmailSender.js        ← AGENT-EMAIL-003
│   └── yearEndService.js           ← AGENT-YEAREND-001
├── hooks/
│   └── useEmailAlerts.js           ← AGENT-YEAREND-002 (optional: extract to hook)
public/
├── manifest.json                   ← AGENT-PWA-001
├── sw.js                           ← AGENT-PWA-001
├── icon-192.png                    ← Design team
└── icon-512.png                    ← Design team
```

## Files to Modify

```
src/constants/config.js             ← Add GOOGLE_SCOPES
src/App.jsx                         ← Wire budget checker, year-end hook, email settings
src/pages/Settings.jsx              ← Add email report section + toggle
index.html                          ← Add manifest, theme-color, SW registration
```

## Google Cloud Console Changes

```
1. Enable Gmail API            (APIs & Services → Library → Gmail API → Enable)
2. Add gmail.send scope        (OAuth consent screen → Scopes → Add gmail.send)
3. Re-verify if needed         (If app is already verified, scope change requires re-review)
```

---

# SECTION E — EXECUTION ORDER & DEPENDENCIES

```
Week 1:
  ├── AGENT-RULES-001 (categorizationPipeline.js)     — No dependencies
  ├── AGENT-AUTH-001  (googleService.js + scope)       — No dependencies  
  └── AGENT-PWA-001   (manifest + service worker)      — No dependencies

Week 2:
  ├── AGENT-EMAIL-001 (emailService.js)                — Depends on AGENT-AUTH-001
  ├── AGENT-EMAIL-002 (emailTemplates.js)              — No dependencies (pure HTML)
  └── AGENT-BUDGET-001 (budgetChecker.js)              — No dependencies (pure logic)

Week 3:
  ├── AGENT-EMAIL-003 (budgetEmailSender.js)           — Depends on EMAIL-001 + BUDGET-001
  ├── AGENT-YEAREND-001 (yearEndService.js)            — Depends on EMAIL-001 + EMAIL-002
  └── AGENT-YEAREND-002 (App.jsx integration)          — Depends on YEAREND-001

Week 4:
  ├── AGENT-YEAREND-003 (Settings page UI)             — Depends on YEAREND-001
  ├── Integration testing                               — All agents complete
  └── Google verification re-submission                 — Depends on scope changes
```

---

# SECTION F — SETTINGS STATE ADDITIONS

Add these to App.jsx state:

```js
// Email preferences (persisted in IndexedDB alongside other data)
const [emailPrefs, setEmailPrefs] = useState({
  budgetAlerts: true,      // Send email when budget exceeded
  yearEndSummary: true,    // Auto-send December summary
  // Future: weeklyDigest, monthlyReport, etc.
});
```

These preferences are stored in the main IndexedDB data blob and synced to Drive along with everything else.

The Settings page should have toggles:

```
📧 Email Notifications
─────────────────────────────────────
Budget exceed alerts          [ON/OFF]
Sends an email to {user.email} when
any category budget is exceeded.

Year-end financial summary    [ON/OFF]
Automatically emails your full year
summary with CSV in December.

📊 Manual Reports
─────────────────────────────────────
[  📊 Email 2026 Financial Summary  ]
Sends summary + CSV to {user.email}
```

---

# SECTION G — EDGE CASES EVERY AGENT MUST HANDLE

1. **Gmail API quota**: 100 emails/day for consumer accounts. Budget alerts have a 24hr cooldown per budget, and year-end is once per year — we will never hit this limit. But add a try-catch anyway.

2. **Token expired during email send**: The `getToken()` helper handles re-auth. But if the user's Google session is completely dead (e.g., they changed their password), the Gmail send will fail with a 401. Catch this and show: "Please sign in again to send emails."

3. **User has no transactions in December**: Don't send an empty year-end email. The `txCount === 0` check handles this.

4. **User switches Google accounts**: The email always goes to the SIGNED IN account's email. If they sign out and sign into a different Google account, the email goes to the new account. This is correct behavior.

5. **Multiple devices**: The year-end email "sent" flag is stored in IndexedDB (local). If the user has two devices, both might try to send. This is acceptable — receiving two summary emails is harmless. To prevent this more elegantly, store the flag in the Drive backup file.

6. **App opened on Dec 31 at 11:55 PM**: The check runs on `year = now.getFullYear()`. If the app is open across midnight, the year won't change until the next app load. This is fine.

7. **CSV encoding**: Some Excel versions don't auto-detect UTF-8 CSV. Prepend a BOM (`\uFEFF`) to the CSV content to force UTF-8 detection.

---

**End of Architect Blueprint. Each AGENT-* task is self-contained with clear inputs, outputs, dependencies, and test cases. Execute in the order specified in Section E.**
