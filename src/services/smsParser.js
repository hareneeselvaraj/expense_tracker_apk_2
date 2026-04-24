/**
 * SMS Parser for Indian Bank Messages
 * Parses debit/credit SMS from major Indian banks and extracts transaction details.
 * 
 * Tested with real SMS from:
 * - ICICI (ICICIT-S): "ICICI Bank Acct XX053 debited for Rs 100.00 on 24-Apr-26; YASWANTHRAM credited."
 * - HDFC (HDFCBK-T): "Sent Rs.9560.00 From HDFC Bank A/C *4410 To QUALITY CAR CAREJOEKENCIL On 22/04/26 Ref 121994807441"
 * - HDFC (HDFCBK-S): "Update! INR 9,527.00 deposited in HDFC Bank A/c XX4410 on 22-APR-26 for SWEEP-IN CREDIT"
 * - HDFC Credit: "Credit Alert! Rs.10000.00 credited to HDFC Bank A/c XX4410 on 22-04-26 from VPA adselvarajhema-1@okaxis"
 */

import { uid } from "../utils/id.js";
import { todayISO } from "../utils/format.js";
import { RULES } from "../constants/defaults.js";

// ── Known bank sender patterns ───────────────────────────────────
const BANK_SENDERS = [
  /HDFC/i, /SBI/i, /ICICI/i, /AXIS/i, /KOTAK/i,
  /BOB/i, /PNB/i, /CANARA/i, /UNION/i, /IDBI/i,
  /YES\s*BANK/i, /INDUSIND/i, /FEDERAL/i, /BANDHAN/i,
  /RBL/i, /IDFC/i, /PAYTM/i, /GPAY/i, /PHONEPE/i,
];

export function isBankSms(sender) {
  if (!sender) return false;
  const s = sender.toUpperCase();
  if (/^[A-Z]{2}-[A-Z]{4,}/.test(s)) return true;
  if (/^[A-Z]{2}-/.test(s)) return true;
  return BANK_SENDERS.some(re => re.test(s));
}

// ── Amount extraction ────────────────────────────────────────────
function extractAmount(text) {
  const patterns = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (val > 0 && val < 100000000) return val;
    }
  }
  return null;
}

// ── Credit or Debit detection ────────────────────────────────────
function extractType(text) {
  const t = text.toLowerCase();

  // Explicit credit patterns
  const creditWords = [
    "credited", "received", "deposited", "refund", "cashback",
    "reversed", "credit alert", "salary", "bonus",
  ];
  // Explicit debit patterns
  const debitWords = [
    "debited", "deducted", "spent", "paid", "sent ",
    "withdrawn", "purchase", "charged",
  ];

  const hasCredit = creditWords.some(w => t.includes(w));
  const hasDebit = debitWords.some(w => t.includes(w));

  if (hasCredit && !hasDebit) return "Credit";
  if (hasDebit && !hasCredit) return "Debit";
  if (hasCredit && hasDebit) {
    // Both present — find which appears first
    let firstCredit = Infinity, firstDebit = Infinity;
    for (const w of creditWords) { const i = t.indexOf(w); if (i >= 0 && i < firstCredit) firstCredit = i; }
    for (const w of debitWords) { const i = t.indexOf(w); if (i >= 0 && i < firstDebit) firstDebit = i; }
    return firstCredit < firstDebit ? "Credit" : "Debit";
  }
  return null;
}

// ── Recipient / Sender name extraction ───────────────────────────
function extractParty(text, type) {
  const t = text.replace(/\r?\n/g, " ");

  // Pattern 1: HDFC "Sent" format — "Sent Rs.X From BANK To RECIPIENT On DATE"
  const hdfcSent = t.match(/\bTo\s+([A-Z][A-Z0-9 &.*'_-]{1,40}?)\s+On\s+\d/i);
  if (hdfcSent) return cleanName(hdfcSent[1]);

  // Pattern 2: ICICI format — "debited...on DATE; RECIPIENT credited"
  const iciciDebit = t.match(/;\s*([A-Z][A-Z0-9 &.*'_-]{1,40}?)\s+credited/i);
  if (iciciDebit) return cleanName(iciciDebit[1]);

  // Pattern 3: Credit from VPA — "from VPA xxx@xxx"
  const vpa = t.match(/from\s+VPA\s+([A-Za-z0-9._@-]+)/i);
  if (vpa) {
    // Extract name part from VPA (before @)
    const vpaParts = vpa[1].split("@");
    const name = vpaParts[0].replace(/[-_.0-9]+$/, "").replace(/[-_.]/g, " ").trim();
    return name.length >= 2 ? name.toUpperCase() : vpa[1];
  }

  // Pattern 4: "for DESCRIPTION" — e.g., "for SWEEP-IN CREDIT"
  const forDesc = t.match(/\bfor\s+([A-Z][A-Z0-9 &.*'_/-]{2,40}?)(?:\s*[-.]|\s+Avl|\s+Ref|\s*$)/i);
  if (forDesc) return cleanName(forDesc[1]);

  // Pattern 5: Generic "to NAME" / "at NAME"
  const toAt = t.match(/(?:to|at)\s+([A-Za-z][A-Za-z0-9 &.*'_-]{1,40}?)(?:\s+(?:on|ref|upi|via|a\/c|\d{2}[\/.-]))/i);
  if (toAt) return cleanName(toAt[1]);

  // Pattern 6: Generic "from NAME"
  const fromP = t.match(/(?:from)\s+([A-Za-z][A-Za-z0-9 &.*'_-]{1,40}?)(?:\s+(?:on|ref|upi|via|a\/c|\(|\d{2}[\/.-]))/i);
  if (fromP) {
    const name = fromP[1].trim();
    // Skip if it's just the bank name
    if (!/HDFC\s*Bank|SBI|ICICI\s*Bank|Axis\s*Bank/i.test(name)) {
      return cleanName(name);
    }
  }

  return null;
}

function cleanName(name) {
  if (!name) return null;
  let n = name.trim()
    .replace(/[.\s]+$/, "")
    .replace(/\s+(on|ref|upi|via|call|not)$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Remove trailing numbers/refs
  n = n.replace(/\s+\d+$/, "").trim();
  return n.length >= 2 ? n : null;
}

// ── Account last 4 digits ────────────────────────────────────────
function extractAccount(text) {
  const patterns = [
    /a\/c\s*(?:no\.?\s*)?(?:[*xX.]+)?\s*(\d{4})\b/i,
    /ac(?:ct|count)?\s*(?:no\.?\s*)?(?:[*xX.]+)\s*(\d{4})\b/i,
    /[*xX]{2,}(\d{4})\b/,
    /\*(\d{4})\b/,
    /card\s+(?:ending\s+)?(?:[*xX]+)?(\d{4})\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

// ── Date extraction ──────────────────────────────────────────────
const MONTH_MAP = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function extractDate(text) {
  // Pattern: DD-Mon-YY (e.g., "24-Apr-26")
  const m1 = text.match(/(\d{1,2})[-\/\s](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*[-\/\s](\d{2,4})/i);
  if (m1) {
    let [, d, mon, y] = m1;
    if (y.length === 2) y = "20" + y;
    return `${y}-${MONTH_MAP[mon.toLowerCase()]}-${d.padStart(2, "0")}`;
  }

  // Pattern: DD/MM/YY or DD-MM-YY (e.g., "22/04/26" or "22-04-26")
  const m2 = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m2) {
    let [, a, b, y] = m2;
    if (y.length === 2) y = "20" + y;
    // In Indian SMS: DD/MM/YY
    const d = a.padStart(2, "0");
    const mo = b.padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }

  // Pattern: DD-MON-YY in uppercase (e.g., "22-APR-26")
  const m3 = text.match(/(\d{1,2})[-](JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-](\d{2,4})/i);
  if (m3) {
    let [, d, mon, y] = m3;
    if (y.length === 2) y = "20" + y;
    return `${y}-${MONTH_MAP[mon.toLowerCase()]}-${d.padStart(2, "0")}`;
  }

  return todayISO();
}

// ── Reference number ─────────────────────────────────────────────
function extractRef(text) {
  // UPI ref: "UPI:611448103733" or "UPI 647858619184"
  const upi = text.match(/UPI[:\s]*(\d{6,20})/i);
  if (upi) return upi[1];

  // Ref number: "Ref 121994807441"
  const ref = text.match(/Ref\s*[:.]?\s*(\d{6,20})/i);
  if (ref) return ref[1];

  // NEFT/IMPS
  const neft = text.match(/(?:NEFT|IMPS|RTGS)\s*(?:ref\.?\s*)?(\w{8,25})/i);
  if (neft) return neft[1];

  return null;
}

// ── Auto-categorize ──────────────────────────────────────────────
function autoCategorize(description, categories) {
  if (!description) return "c13";
  const upper = description.toUpperCase();
  for (const [keyword, catName] of Object.entries(RULES)) {
    if (upper.includes(keyword)) {
      const cat = categories.find(c => c.name === catName);
      if (cat) return cat.id;
    }
  }
  return "c13"; // Others
}

/**
 * Parse an SMS message body and return a transaction object (or null if not parseable)
 * 
 * Handles formats:
 * - ICICI: "ICICI Bank Acct XX053 debited for Rs 100.00 on 24-Apr-26; YASWANTHRAM credited. UPI:611448103733"
 * - HDFC Sent: "Sent Rs.9560.00 From HDFC Bank A/C *4410 To QUALITY CAR CAREJOEKENCIL On 22/04/26 Ref 121994807441"
 * - HDFC Deposit: "Update! INR 9,527.00 deposited in HDFC Bank A/c XX4410 on 22-APR-26 for SWEEP-IN CREDIT"
 * - HDFC Credit: "Credit Alert! Rs.10000.00 credited to HDFC Bank A/c XX4410 on 22-04-26 from VPA xxx@okaxis (UPI 647858619184)"
 */
export function parseBankSms(body, sender, categories = [], accounts = []) {
  if (!body || body.length < 15) return null;

  // Normalize: merge lines, collapse spaces
  const text = body.replace(/\r?\n/g, " ").replace(/\s{2,}/g, " ").trim();

  const amount = extractAmount(text);
  if (!amount) return null;

  const type = extractType(text);
  if (!type) return null;

  const party = extractParty(text, type);
  const acctLast4 = extractAccount(text);
  const date = extractDate(text);
  const ref = extractRef(text);

  // Match account by last 4 digits
  let accountId = "";
  if (acctLast4 && accounts.length > 0) {
    const match = accounts.find(a =>
      (a.number && a.number.endsWith(acctLast4)) ||
      (a.name && a.name.includes(acctLast4))
    );
    if (match) accountId = match.id;
  }

  const description = party || (sender ? `SMS via ${sender}` : "Bank transaction");
  const categoryId = autoCategorize(description, categories);

  return {
    id: uid(),
    description,
    amount,
    date,
    creditDebit: type,
    txType: type === "Credit" ? "Income" : "Expense",
    category: categoryId,
    tags: [],
    accountId,
    notes: `[SMS] ${body.substring(0, 250)}${ref ? ` | Ref: ${ref}` : ""}`,
    source: "sms",
    status: "unreviewed",
    smsRef: ref || "",
    smsAccountLast4: acctLast4 || "",
    smsSender: sender || "",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Batch-parse multiple SMS messages
 */
export function parseSmsBatch(messages, categories, accounts) {
  const results = [];
  for (const msg of messages) {
    if (isBankSms(msg.sender || msg.address)) {
      const tx = parseBankSms(msg.body, msg.sender || msg.address, categories, accounts);
      if (tx) results.push(tx);
    }
  }
  return results;
}
