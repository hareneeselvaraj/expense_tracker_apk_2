/**
 * ─── STATEMENT ENGINE ──────────────────────────────────────────────────────────
 * Pure utility module for processing bank statements in-browser.
 * No backend, no ML — deterministic rule-based keyword matching only.
 * ────────────────────────────────────────────────────────────────────────────────
 */
import * as XLSX from "xlsx";

// ─── CATEGORY KEYWORD RULES ────────────────────────────────────────────────────
// Each entry: { name, color, type (Expense|Income|Investment), keywords[] }
// Priority order matters — first match wins.
export const CATEGORY_RULES = [
  // ── INCOME (checked first) ──
  { name: "Salary",        color: "#22c55e", type: "Income",     keywords: ["salary", "sal ", "payroll", "stipend", "wages", "sal/", "neft sal", "monthly pay", "sal cr"] },
  { name: "Interest",      color: "#14b8a6", type: "Income",     keywords: ["interest", "int pd", "int.pd", "int cr", "intt", "int paid", "savings int", "fd interest", "rd interest"] },
  { name: "Refund",        color: "#06b6d4", type: "Income",     keywords: ["refund", "cashback", "reversal", "ref/", "reversed", "return", "credit note", "rfnd", "refnd"] },
  { name: "Dividend",      color: "#10b981", type: "Income",     keywords: ["dividend", "div ", "div/", "divd"] },

  // ── INVESTMENTS (checked second) ──
  { name: "Mutual Fund",   color: "#8b5cf6", type: "Investment", keywords: ["mutual fund", "mf/", "mfp/", "mf purchase", "sip", "bse/", "cams", "karvy", "kfintech", "mf-", "amfi", "nippon", "hdfc mf", "sbi mf", "axis mf", "icici pru", "kotak mf", "birla", "sundaram", "groww mf", "zerodha coin"] },
  { name: "Stocks",        color: "#a78bfa", type: "Investment", keywords: ["zerodha", "groww", "upstox", "angel one", "angel broking", "kite", "nse/", "bse/", "eba/", "dp charges", "demat", "trading", "share market", "share trading", "equity", "sensibull", "dhan", "5paisa"] },
  { name: "Fixed Deposit",  color: "#7c3aed", type: "Investment", keywords: ["fd ", "fixed deposit", "fd/", "fd booking", "term deposit", "recurring deposit", "rd ", "rd/"] },
  { name: "Insurance",     color: "#6366f1", type: "Investment", keywords: ["insurance", "insur", "lic", "max life", "hdfc life", "sbi life", "icici lomb", "tata aia", "bajaj allianz", "premium", "star health", "digit insur", "policy"] },

  // ── EXPENSES (checked third, most granular) ──
  { name: "Food & Dining", color: "#ef4444", type: "Expense",    keywords: ["swiggy", "zomato", "dominos", "pizza", "mcdonald", "burger king", "kfc", "subway", "starbucks", "cafe coffee", "dunkin", "restaurant", "hotel", "food", "dining", "canteen", "mess", "biryani", "meal", "tiffin", "eat", "bakery", "mithai", "haldiram", "barbeque", "bbq", "chai", "tea stall", "juice", "dosa", "idli","egg"] },
  { name: "Groceries",     color: "#f97316", type: "Expense",    keywords: ["grocery", "grocer", "big basket", "bigbasket", "blinkit", "dunzo", "jiomart", "dmart", "reliance", "supermarket", "provision", "kirana", "vegetables", "fruits", "zepto", "instamart", "nature basket", "more ", "spar", "star bazaar", "spencers"] },
  { name: "Transport",     color: "#eab308", type: "Expense",    keywords: ["uber", "ola", "rapido", "auto", "taxi", "cab", "metro", "bus", "train", "irctc", "railway", "cleartrip", "makemytrip", "mmt", "goibibo", "redbus", "petrol", "diesel", "fuel", "hp fuel", "bpcl", "iocl", "indian oil", "toll", "fastag", "nhai", "parking", "yulu"] },
  { name: "Shopping",      color: "#ec4899", type: "Expense",    keywords: ["amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho", "snapdeal", "tatacliq", "croma", "reliance digital", "vijay sales", "shopping", "mall", "store", "purchase", "buy", "decathlon", "nike", "adidas", "puma", "lenskart", "boat", "noise"] },
  { name: "Rent",          color: "#f43f5e", type: "Expense",    keywords: ["rent", "house rent", "room rent", "pg ", "hostel", "accommodation", "lease", "rent/"] },
  { name: "Bills & Utilities", color: "#fb923c", type: "Expense", keywords: ["electricity", "electric", "water bill", "gas bill","piped gas", "lpg", "indane", "bharat gas", "hp gas", "bescom", "tata power", "adani gas", "torrent power", "bill pay", "bsnl", "jio", "airtel", "vodafone", "vi ", "idea", "broadband", "wifi", "internet", "dth", "tata play", "dish tv", "postpaid", "prepaid", "recharge"] },
  { name: "EMI & Loans",   color: "#dc2626", type: "Expense",    keywords: ["emi", "loan", "home loan", "car loan", "personal loan", "education loan", "hl ", "pl ", "moratorium", "nbfc", "bajaj finance", "hdfc ltd", "lic housing", "pnb housing", "installment"] },
  { name: "Subscriptions", color: "#d946ef", type: "Expense",    keywords: ["netflix", "prime", "hotstar", "spotify", "youtube", "apple", "google play", "icloud", "dropbox", "notion", "chatgpt", "openai", "subscription", "renewal", "annual", "monthly plan", "jee", "grammarly", "canva", "figma", "github"] },
  { name: "Medical",       color: "#f472b6", type: "Expense",    keywords: ["hospital", "medical", "pharma", "pharmacy", "medicine", "doctor", "clinic", "apollo", "practo", "medplus", "netmeds", "1mg", "pharm easy", "health", "diagnostic", "lab test", "pathology", "scan"] },
  { name: "Education",     color: "#38bdf8", type: "Expense",    keywords: ["school", "college", "university", "tuition", "coaching", "course", "udemy", "coursera", "unacademy", "byjus", "vedantu", "exam", "fee", "fees", "education", "book", "stationery"] },
  { name: "Travel",        color: "#2dd4bf", type: "Expense",    keywords: ["flight", "air india", "indigo", "spicejet", "vistara", "air asia", "goair", "booking.com", "airbnb", "oyo", "fabhotel", "treebo", "hotel booking", "resort", "travel", "trip", "holiday", "visa fee", "passport"] },
  { name: "Entertainment", color: "#a855f7", type: "Expense",    keywords: ["movie", "cinema", "pvr", "inox", "bookmyshow", "gaming", "game", "steam", "playstation", "xbox", "concert", "event", "ticket", "amusement", "theme park", "park", "club", "pub"] },
  { name: "Fitness",       color: "#84cc16", type: "Expense",    keywords: ["gym", "fitness", "cult", "curefit", "yoga", "sports", "swim", "membership", "protein", "supplement"] },
  { name: "Personal Care", color: "#e879f9", type: "Expense",    keywords: ["salon", "spa", "haircut", "beauty", "parlour", "parlor", "grooming", "urban company", "urbanclap", "cosmetic", "skincare"] },
  { name: "Transfers",     color: "#94a3b8", type: "Expense",    keywords: ["transfer", "trf/", "self trf", "own acc", "own account", "upi/p2p"] },
  { name: "ATM",           color: "#78716c", type: "Expense",    keywords: ["atm", "cash withdrawal", "cash wd", "atm wd", "atm/cash", "nfs/", "cash"] },
  { name: "Charity",       color: "#fbbf24", type: "Expense",    keywords: ["donation", "charity", "ngo", "trust", "temple", "church", "mosque", "gurudwara", "orphanage", "relief fund", "pm cares", "ketto", "milaap", "give india"] },
  { name: "Government",    color: "#64748b", type: "Expense",    keywords: ["tax", "gst", "income tax", "tds", "challan", "stamp duty", "registration", "passport", "government", "municipal", "mcd", "property tax"] },
  { name: "Maintenance",   color: "#a3a3a3", type: "Expense",    keywords: ["maintenance", "society", "apartment", "flat", "plumber", "electrician", "repair", "service", "servicing", "car wash", "cleaning"] },
];

// ─── TOKEN EXTRACTION ──────────────────────────────────────────────────────────
// Splits messy bank remarks into clean, searchable tokens.
// Example: "UPI/BENGALURU/gpay-121/Egg/AXIS BANK/080329017536/UPI"
//        ➜ ["upi", "bengaluru", "gpay-121", "egg", "axis bank"]
export function extractMerchantTokens(remarks) {
  if (!remarks || typeof remarks !== "string") return [];
  return remarks
    .split(/[\/|\\,;]+/)       // split by common delimiters
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0)
    .filter(t => !/^\d+$/.test(t))  // remove pure numeric tokens (txn IDs)
    .filter(t => t.length > 1);    // remove single-char noise
}

// ─── CATEGORIZATION ENGINE ─────────────────────────────────────────────────────
// Priority: Income → Investment → Expense → Others
// Returns { name, color, type } of matched category.
export function categorizeTransaction(remarks, amount = 0, isCredit = false) {
  const tokens = extractMerchantTokens(remarks);
  const combined = tokens.join(" ");
  const remarksLower = (remarks || "").toLowerCase();

  // Check each rule in priority order (income first, then investment, then expense)
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      // Check both the combined tokens AND the raw remarks for matches
      if (combined.includes(keyword) || remarksLower.includes(keyword)) {
        // If this is a CREDIT transaction but the matched rule is an Expense category,
        // treat it as a Refund (Income) instead of the matched expense category.
        if (isCredit && rule.type === "Expense") {
          return { name: "Refund", color: "#06b6d4", type: "Income" };
        }
        return { name: rule.name, color: rule.color, type: rule.type };
      }
    }
  }

  // Fallback: if it's a credit and uncategorized, mark as "Other Income"
  if (isCredit && amount > 0) {
    return { name: "Other Income", color: "#a3e635", type: "Income" };
  }

  return { name: "Others", color: "#71717a", type: "Expense" };
}

// ─── SMART DESCRIPTION GENERATOR ───────────────────────────────────────────────
// Converts messy bank remarks into readable text.
// Input:  "UPI/BENGALURU/gpay-121/Egg/AXIS BANK/080329017536/UPI"
// Output: "UPI Payment to Bengaluru - Egg"
export function generateSmartDescription(remarks) {
  if (!remarks || typeof remarks !== "string") return remarks || "";
  const raw = remarks.trim();

  // --- UPI Transactions ---
  if (/^UPI\//i.test(raw)) {
    const parts = raw.split("/").map(p => p.trim()).filter(Boolean);
    // Standard UPI format: UPI/<city>/<merchant>/<desc>/<bank>/<txnid>/UPI
    const meaningful = parts
      .filter(p => !/^(UPI|upi)$/i.test(p))        // remove "UPI" bookends
      .filter(p => !/^\d{6,}$/.test(p))             // remove long numeric IDs
      .filter(p => !/^[A-Z]{4}\d{7}$/.test(p))      // remove bank ref codes
      .filter(p => p.length > 1)
      .slice(0, 3);                                  // keep first 3 meaningful parts
    if (meaningful.length > 0) {
      return `UPI — ${meaningful.map(capitalize).join(" · ")}`;
    }
    return "UPI Transaction";
  }

  // --- NEFT Transactions ---
  if (/^NEFT/i.test(raw)) {
    const parts = raw.split(/[-\/]/).map(p => p.trim()).filter(Boolean);
    const meaningful = parts
      .filter(p => !/^NEFT$/i.test(p))
      .filter(p => !/^\d{6,}$/.test(p))
      .filter(p => !/^[A-Z]{4}\d{10,}$/.test(p))
      .slice(0, 2);
    return `NEFT — ${meaningful.map(capitalize).join(" · ") || "Transfer"}`;
  }

  // --- IMPS Transactions ---
  if (/^IMPS/i.test(raw)) {
    const parts = raw.split(/[-\/]/).map(p => p.trim()).filter(Boolean);
    const meaningful = parts.filter(p => !/^IMPS$/i.test(p) && !/^\d{6,}$/.test(p)).slice(0, 2);
    return `IMPS — ${meaningful.map(capitalize).join(" · ") || "Transfer"}`;
  }

  // --- ATM ---
  if (/ATM/i.test(raw)) return `ATM — ${capitalize(raw.replace(/ATM\/?/gi, "").trim()) || "Cash Withdrawal"}`;

  // --- EMI ---
  if (/EMI/i.test(raw)) return `EMI — ${capitalize(raw.replace(/EMI\/?/gi, "").replace(/[\/\-]{2,}/g, " ").trim())}`;

  // --- Fallback: just capitalize and clean up ---
  return capitalize(raw.replace(/[\/\-]{2,}/g, " · ").replace(/\s{2,}/g, " ").trim());
}

// Helper: capitalize first letter of each word
function capitalize(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── EXCEL FILE PARSER ─────────────────────────────────────────────────────────
// Reads .xls/.xlsx in-browser using SheetJS. Returns raw JSON rows from sheet 1.
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve({ rows: json, headers: json.length > 0 ? Object.keys(json[0]) : [], sheetName });
      } catch (err) {
        reject(new Error("Failed to parse Excel file: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read the file"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── COLUMN AUTO-DETECTOR ──────────────────────────────────────────────────────
// Attempts to guess which columns map to Date, Description (Narration), Debit, Credit.
export function autoDetectColumns(headers) {
  const find = (patterns) => headers.find(h => patterns.some(p => h.toLowerCase().includes(p))) || "";
  
  // Detect a combined "Credit/Debit" text column separately
  const creditDebitCol = headers.find(h => {
    const l = h.toLowerCase().replace(/[^a-z]/g, "");
    return l === "creditdebit" || l === "drcr" || l === "type";
  }) || "";
  
  // Only match standalone debit/credit columns (NOT "credit/debit")
  const debit = headers.find(h => {
    const l = h.toLowerCase();
    if (l.includes("credit")) return false; // skip combined column
    return ["debit", "withdrawal", " dr ", "dr amount"].some(p => l.includes(p));
  }) || "";
  
  const credit = headers.find(h => {
    const l = h.toLowerCase();
    if (l.includes("debit")) return false; // skip combined column
    return ["credit", "deposit", " cr ", "cr amount"].some(p => l.includes(p));
  }) || "";
  
  // Detect a separate "Transaction Type" column (Expense/Income/Investment)
  // Must NOT match the Credit/Debit column
  const txTypeCol = headers.find(h => {
    const l = h.toLowerCase();
    return (l.includes("transaction type") || l === "txtype" || l === "tx type")
      && !l.includes("credit") && !l.includes("debit");
  }) || "";

  return {
    date:        find(["date", "txn date", "transaction date", "value date", "posting date", "trans date"]),
    description: find(["narration", "description", "remarks", "particular", "detail", "transaction detail", "remark"]),
    amount:      find(["amount", "amt"]),
    debit,
    credit,
    creditDebit: creditDebitCol,
    txType:      txTypeCol,
    balance:     find(["balance", "closing balance", "closing bal", "available balance", "running balance"]),
    category:    find(["category", "cat"]),
    tags:        find(["tag", "tags", "label", "labels"]),
    notes:       find(["note", "notes", "comment"]),
    account:     find(["account", "acct", "bank"]),
  };
}

// ─── FULL PIPELINE ─────────────────────────────────────────────────────────────
// Takes raw row data + column mapping → returns fully processed transactions.
export function processTransactions(rows, columnMap) {
  return rows
    .map((row, idx) => {
      const rawDesc = String(row[columnMap.description] || "");
      
      let amount = 0;
      let isCredit = false;
      
      if (columnMap.debit && columnMap.credit && columnMap.debit !== columnMap.credit) {
        // Format A: separate debit + credit numeric columns
        const rawDebit  = parseFloat(String(row[columnMap.debit]  || "0").replace(/,/g, "")) || 0;
        const rawCredit = parseFloat(String(row[columnMap.credit] || "0").replace(/,/g, "")) || 0;
        amount = rawCredit > 0 ? rawCredit : rawDebit;
        isCredit = rawCredit > 0;
      } else if (columnMap.amount) {
        // Format B: single Amount column + optional Credit/Debit text column
        const raw = parseFloat(String(row[columnMap.amount] || "0").replace(/[^0-9.-]/g, "")) || 0;
        amount = Math.abs(raw);
        if (columnMap.creditDebit) {
          const cd = String(row[columnMap.creditDebit] || "").toLowerCase();
          isCredit = cd.includes("cr");  // matches "credit", "cr"
        } else {
          isCredit = raw > 0;  // negative number = debit
        }
      }
      
      if (!rawDesc && amount === 0) return null; // skip empty rows

      const category = categorizeTransaction(rawDesc, amount, isCredit);
      const smartDesc = generateSmartDescription(rawDesc);

      // Date handling: try to parse various formats
      let dateStr = "";
      const rawDate = row[columnMap.date];
      if (rawDate instanceof Date) {
        dateStr = rawDate.toISOString().split("T")[0];
      } else if (typeof rawDate === "string" && rawDate.trim()) {
        // Try DD/MM/YYYY, DD-MM-YYYY, etc.
        const cleaned = rawDate.trim();
        const parts = cleaned.split(/[\/\-\.]/);
        if (parts.length === 3) {
          const [a, b, c] = parts.map(Number);
          // DD/MM/YYYY
          if (a <= 31 && b <= 12 && c > 100) dateStr = `${c}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
          // YYYY/MM/DD
          else if (a > 100) dateStr = `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
          else dateStr = cleaned;
        } else {
          dateStr = cleaned;
        }
      } else if (typeof rawDate === "number") {
        // Excel serial date
        const d = XLSX.SSF.parse_date_code(rawDate);
        if (d) dateStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      }

      // ── Determine txType ──
      // Priority 1: Explicit "Transaction Type" column from the CSV (e.g. the app's own export)
      // Priority 2: Infer from credit/debit + category keyword matching
      let txType;
      const rawTxType = columnMap.txType ? String(row[columnMap.txType] || "").trim() : "";
      const normalizedTxType = rawTxType.charAt(0).toUpperCase() + rawTxType.slice(1).toLowerCase();

      if (["Expense", "Income", "Investment"].includes(normalizedTxType)) {
        // Trust the explicit column value
        txType = normalizedTxType;
      } else if (isCredit) {
        txType = category.type === "Investment" ? "Investment" : "Income";
      } else {
        txType = category.type === "Income" ? "Income" : category.type === "Investment" ? "Investment" : "Expense";
      }

      return {
        _idx: idx,
        date: dateStr,
        rawDescription: rawDesc,
        description: smartDesc,
        amount,
        creditDebit: isCredit ? "Credit" : "Debit",
        txType,
        category,
        balance: row[columnMap.balance] || "",
        _rawCategory: columnMap.category ? String(row[columnMap.category] || "").trim() : "",
        _rawTags: columnMap.tags ? String(row[columnMap.tags] || "").trim() : "",
        _rawAccount: columnMap.account ? String(row[columnMap.account] || "").trim() : "",
        notes: columnMap.notes ? String(row[columnMap.notes] || "").trim() : "",
      };
    })
    .filter(Boolean);
}
