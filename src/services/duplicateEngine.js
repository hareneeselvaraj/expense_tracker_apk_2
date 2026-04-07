/**
 * duplicateEngine.js
 * 
 * Detects exact and near-duplicate transactions using:
 * - Description normalization (strips UPI/bank noise)
 * - Fingerprinting (fast exact-match grouping)
 * - Levenshtein-based fuzzy matching (catches near-duplicates)
 * - Date proximity (±2 day window)
 * - Amount tolerance (exact match required for safety)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. NORMALIZATION — strip noise from descriptions
// ─────────────────────────────────────────────────────────────────────────────

const NOISE_PATTERNS = [
  /^upi[\/\-:]/i,                    // UPI/ prefix
  /\/[a-z0-9]{8,}\/?/gi,             // Reference IDs like /080329017536/ (bumped to 8 to save AMAZON)
  /\b(ref|txn|trans|id|no)[:.\-]?\s*[a-z0-9]+/gi,  // "REF: 12345"
  /\b\d{4,}\b/g,                     // Long numeric strings (account/ref nos, bumped to 4+)
  /\b[0-9]+\b/g,                     // also standalone numerals
  /\b(neft|imps|rtgs|atm|pos|inb|mob)\b/gi,        // Bank channel codes
  /\b[a-z]{2,4}\d{4,}\b/gi,          // Mixed alphanum codes like AXB1234567
  /[\/\-_|]+/g,                      // Separators
  /\s+/g                             // Multiple spaces
];

export function normalize(desc) {
  if (!desc) return "";
  let s = desc.toLowerCase().trim();
  for (const pat of NOISE_PATTERNS) {
    s = s.replace(pat, " ");
  }
  return s.replace(/\s+/g, " ").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FINGERPRINT — fast exact-duplicate key
// ─────────────────────────────────────────────────────────────────────────────

export function fingerprint(tx) {
  const desc = normalize(tx.description);
  // Round amount to 2 decimals to handle float precision
  const amt = Math.round((tx.amount || 0) * 100);
  return `${tx.date}_${amt}_${desc}_${tx.creditDebit || ""}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LEVENSHTEIN DISTANCE — fuzzy string matching
// ─────────────────────────────────────────────────────────────────────────────

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insert
        prev[j] + 1,            // delete
        prev[j - 1] + cost      // substitute
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

export function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  // Custom boost: if one contains the other and it's decent length
  const minLen = Math.min(a.length, b.length);
  const contains = a.length > b.length ? a.includes(b) : b.includes(a);
  if (contains && minLen >= 4) {
    return Math.max(1 - levenshtein(a, b) / maxLen, 0.85);
  }

  return 1 - levenshtein(a, b) / maxLen;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DATE PROXIMITY
// ─────────────────────────────────────────────────────────────────────────────

export function daysBetween(d1, d2) {
  const ms = Math.abs(new Date(d1) - new Date(d2));
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXACT DUPLICATE DETECTION (fast)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Groups transactions by fingerprint. Returns array of duplicate groups.
 * Each group has 2+ transactions sharing the same fingerprint.
 * IGNORES soft-deleted transactions.
 */
export function findExactDuplicates(transactions) {
  const groups = new Map();
  for (const tx of transactions) {
    if (tx.deleted) continue;
    const fp = fingerprint(tx);
    if (!groups.has(fp)) groups.set(fp, []);
    groups.get(fp).push(tx);
  }
  return Array.from(groups.values()).filter(g => g.length > 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. NEAR-DUPLICATE DETECTION (fuzzy)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds near-duplicates: transactions with same amount, dates within ±2 days,
 * and description similarity >= 0.75. Slower than exact, but catches the
 * real-world cases that exact matching misses.
 * 
 * Performance: O(n²) — but only compared within amount-buckets, so in practice
 * it's near-linear for typical datasets (most amounts are unique).
 */
export function findNearDuplicates(transactions, opts = {}) {
  const {
    dateWindow = 2,           // ± days
    minSimilarity = 0.75,     // 0..1
    skipExact = true          // skip exact matches (already handled)
  } = opts;

  // Bucket by amount + creditDebit for fast comparison
  const buckets = new Map();
  for (const tx of transactions) {
    if (tx.deleted) continue;
    const key = `${Math.round((tx.amount || 0) * 100)}_${tx.creditDebit || ""}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(tx);
  }

  const seen = new Set();
  const groups = [];

  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;

    for (let i = 0; i < bucket.length; i++) {
      const a = bucket[i];
      if (seen.has(a.id)) continue;
      const group = [a];
      const aDesc = normalize(a.description);

      for (let j = i + 1; j < bucket.length; j++) {
        const b = bucket[j];
        if (seen.has(b.id)) continue;

        // Date proximity check
        if (daysBetween(a.date, b.date) > dateWindow) continue;

        const bDesc = normalize(b.description);

        // Skip exact matches if requested
        if (skipExact && a.date === b.date && aDesc === bDesc) continue;

        // Fuzzy similarity check
        const sim = similarity(aDesc, bDesc);
        if (sim >= minSimilarity) {
          group.push(b);
          seen.add(b.id);
        }
      }

      if (group.length > 1) {
        seen.add(a.id);
        groups.push({ items: group, confidence: "near" });
      }
    }
  }

  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. UNIFIED FINDER — exact + near, with confidence labels
// ─────────────────────────────────────────────────────────────────────────────

export function findAllDuplicates(transactions) {
  const exact = findExactDuplicates(transactions).map(items => ({
    items,
    confidence: "exact"
  }));
  const near = findNearDuplicates(transactions, { skipExact: true });
  return [...exact, ...near];
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. PRE-IMPORT GUARD — check incoming batch against existing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given a list of incoming transactions and existing ones, returns:
 * - clean: incoming tx that have no duplicates
 * - duplicates: incoming tx that match an existing one (with the match)
 * 
 * Use this BEFORE importing a bank statement.
 */
export function checkImportBatch(incoming, existing) {
  // Build a lookup of existing fingerprints (exact)
  const existingFps = new Map();
  for (const tx of existing) {
    if (tx.deleted) continue;
    existingFps.set(fingerprint(tx), tx);
  }

  // Pre-bucket existing by amount for fast fuzzy lookup
  const amountBuckets = new Map();
  for (const tx of existing) {
    if (tx.deleted) continue;
    const key = Math.round((tx.amount || 0) * 100);
    if (!amountBuckets.has(key)) amountBuckets.set(key, []);
    amountBuckets.get(key).push(tx);
  }

  const clean = [];
  const duplicates = [];

  for (const tx of incoming) {
    const fp = fingerprint(tx);

    // Exact match check
    if (existingFps.has(fp)) {
      duplicates.push({
        incoming: tx,
        existing: existingFps.get(fp),
        confidence: "exact"
      });
      continue;
    }

    // Fuzzy match check (within amount bucket)
    const amtKey = Math.round((tx.amount || 0) * 100);
    const candidates = amountBuckets.get(amtKey) || [];
    const txDesc = normalize(tx.description);
    let nearMatch = null;

    for (const cand of candidates) {
      if (cand.creditDebit !== tx.creditDebit) continue;
      if (daysBetween(tx.date, cand.date) > 2) continue;
      const sim = similarity(txDesc, normalize(cand.description));
      if (sim >= 0.8) {
        nearMatch = { existing: cand, similarity: sim };
        break;
      }
    }

    if (nearMatch) {
      duplicates.push({
        incoming: tx,
        existing: nearMatch.existing,
        confidence: "near",
        similarity: nearMatch.similarity
      });
    } else {
      clean.push(tx);
    }
  }

  return { clean, duplicates };
}
