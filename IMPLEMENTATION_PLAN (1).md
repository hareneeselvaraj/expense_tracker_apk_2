# 💎 Expense Tracker Cloud — Implementation Plan
### *React-Only · Google Drive Storage · Mobile-First Fintech UI*

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────┐
│              React (Vite)                   │
│  ┌────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Pages  │  │Components│  │  Services   │  │
│  └───┬────┘  └────┬─────┘  └─────┬──────┘  │
│      │            │              │          │
│  ┌───▼────────────▼──────────────▼──────┐   │
│  │         State Layer (React)          │   │
│  │   useState + useMemo + useCallback   │   │
│  └───────────────┬──────────────────────┘   │
│                  │                          │
│  ┌───────────────▼──────────────────────┐   │
│  │      Persistence Layer               │   │
│  │  ┌──────────┐   ┌────────────────┐   │   │
│  │  │ IndexedDB │   │ Google Drive   │   │   │
│  │  │ (instant) │   │ (cloud sync)   │   │   │
│  │  └──────────┘   └────────────────┘   │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Auth: Google Identity Services (GIS)       │
│  Zero Backend · Zero Server Costs           │
└─────────────────────────────────────────────┘
```

**Core constraints the user defined:**  
- Pure React (Vite), no backend whatsoever  
- All data lives in the user's own Google Drive  
- Mobile-first UI, must work flawlessly on small screens (320px+)

---

## 2. Current Codebase Audit

### What Already Exists

| Layer | Status | Files |
|-------|--------|-------|
| Auth (Google Sign-In) | ✅ Working | `config.js`, `App.jsx` |
| IndexedDB persistence | ✅ Working | `services/localDb.js` |
| Google Drive backup/restore | ✅ Working | `services/driveService.js` |
| Dashboard page | ✅ Working | `pages/Dashboard.jsx` |
| Transactions CRUD | ✅ Working | `pages/Transactions.jsx` |
| Reports (charts) | ✅ Working | `pages/Reports.jsx` |
| Organize (categories/tags/budgets/rules) | ✅ Working | `pages/Organize.jsx` |
| Vault (accounts) | ✅ Working | `pages/Vault.jsx` |
| Settings | ✅ Working | `pages/Settings.jsx` |
| Statement analyzer (XLS upload) | ✅ Working | `statement-engine.js` |
| Auto-categorization engine | ✅ Working | `constants/defaults.js` |
| CSV/PDF export | ✅ Working | `utils/csvExport.js`, `utils/pdf.js` |
| Theme system (dark/light) | ✅ Working | `constants/theme.js` |
| Bottom nav + header | ✅ Working | `components/layout/` |

### What's Missing or Broken

| Issue | Severity | Description |
|-------|----------|-------------|
| **Sync race condition** | 🔴 Critical | `handleSmartSync` uses last-write-wins with no merge. If you edit on two devices, whichever syncs last silently destroys the other's data |
| **No offline detection** | 🟡 Medium | App doesn't detect offline state; Drive calls fail silently |
| **Token refresh gap** | 🟡 Medium | Drive token clears after 50 min via `setTimeout`, but there's no proactive re-auth flow — user gets a hard error mid-session |
| **No data encryption** | 🟡 Medium | Drive backup is plain JSON; anyone with Drive access reads all financial data |
| **No app lock** | 🟡 Medium | No PIN, pattern, or biometric guard — risky for a finance app |
| **Budget alerts missing** | 🟡 Medium | Budgets exist in state but there's no threshold warning or notification system |
| **No recurring transactions** | 🟡 Medium | Users must manually re-enter rent, subscriptions, EMIs every month |
| **Statement analyzer limited** | 🟠 Low-Med | Only handles `.xls/.xlsx`; no CSV or PDF bank statement support |
| **No multi-currency** | 🟠 Low | Hardcoded `₹` symbol throughout |
| **Category budget vs tag budget confusion** | 🟠 Low | `BudgetForm` handles both category and tag budgets in one form but the data model doesn't cleanly separate them |
| **Duplicate detection is shallow** | 🟠 Low | Only checks exact amount + date + description match; misses near-duplicates from different statement formats |

---

## 3. Implementation Phases

### Phase 1 — Fix Critical Logic Gaps (Week 1–2)

#### 1A. Smart Merge Sync (replaces last-write-wins)

The current `handleSmartSync` compares timestamps and either pulls or pushes — it never merges. This is the single most dangerous bug in the app.

**Solution — Transaction-level merge with vector timestamps:**

```
Local:   [tx_A, tx_B_v2, tx_D]      (B was edited locally)
Remote:  [tx_A, tx_B_v1, tx_C]      (C was added on another device)
Merged:  [tx_A, tx_B_v2, tx_C, tx_D] (both changes preserved)
```

Implementation steps:
1. Add `updatedAt` (ISO timestamp) and `deleted` (soft-delete flag) to every transaction object
2. On sync, fetch remote data and walk both arrays by `id`
3. For each ID: keep whichever has the later `updatedAt`
4. Union all IDs that exist only on one side
5. Push the merged result to Drive, update local IndexedDB
6. Store the merge timestamp in `localStorage` as `expense_last_sync`

This same merge logic applies to categories, tags, accounts, budgets, and rules — all need `updatedAt` fields.

#### 1B. Drive Token Lifecycle

Replace the `setTimeout` token expiry with a proper wrapper:
1. Before every Drive API call, check if the token is still valid by calling the Google tokeninfo endpoint
2. If expired, silently trigger `tokenClient.requestAccessToken()` with `prompt: ''` (no popup if user already consented)
3. If re-auth fails, surface a toast: "Session expired — tap to reconnect" with a one-tap re-auth button

#### 1C. Offline Detection + Queue

1. Listen to `navigator.onLine` and the `online`/`offline` window events
2. When offline, disable the sync button and show a subtle "Offline" badge in the header
3. Queue any write operations (add/edit/delete tx) into a `pendingSync` array in IndexedDB
4. When connectivity returns, flush the queue through the merge-sync flow automatically

---

### Phase 2 — Security & Privacy Layer (Week 2–3)

#### 2A. App Lock (PIN / Biometric)

For a finance app on mobile, this is essential.

1. On first launch after login, prompt user to set a 4-digit PIN (stored as a salted SHA-256 hash in IndexedDB — never plain text)
2. Use the Web Authentication API (`navigator.credentials`) for biometric unlock on supported devices (Face ID / fingerprint)
3. Lock triggers: app goes to background (via `visibilitychange` event), 5-minute idle timeout, or manual lock from settings
4. Lock screen: full-screen overlay with PIN pad or biometric prompt, glassmorphism blur background showing no data

#### 2B. Encrypted Drive Backup

1. Before uploading to Drive, encrypt the JSON payload using AES-256-GCM via the Web Crypto API
2. Derive the encryption key from the user's PIN + a salt using PBKDF2 (100,000 iterations)
3. Store the salt (not the key) alongside the backup metadata
4. On restore, prompt for PIN → derive key → decrypt → parse JSON
5. This means even if someone accesses the user's Drive, the backup is unreadable without the PIN

---

### Phase 3 — Missing Core Features (Week 3–5)

#### 3A. Recurring Transactions

Data model addition:
```js
{
  id: "rec_xxx",
  templateTx: { /* same shape as a normal tx */ },
  frequency: "monthly" | "weekly" | "biweekly" | "yearly",
  startDate: "2026-04-01",
  endDate: null, // null = forever
  nextDue: "2026-04-01",
  autoPost: true | false
}
```

Logic:
1. On app load (and once daily via a check in `useEffect`), scan all recurring templates
2. For each where `nextDue <= today`, auto-create the transaction (if `autoPost` is true) or show a "Pending" notification card on Dashboard
3. Advance `nextDue` to the next occurrence
4. Dashboard shows an "Upcoming" section: next 7 days of scheduled transactions

UI: A new "Recurring" tab inside Organize page, with a list of templates, toggle for auto-post, and edit/delete controls.

#### 3B. Budget Alerts & Insights

The budget data already exists — it just doesn't *do* anything.

1. On every transaction save, run a budget check:
   - Calculate month-to-date spend for each category/tag that has a budget
   - If spend ≥ 80% of budget → show an amber warning toast
   - If spend ≥ 100% → show a red alert toast + badge on the Organize nav icon
2. Dashboard "Budget Pulse" card: horizontal progress bars for top 4 budgets, color-coded green → amber → red
3. Weekly digest: on Monday morning (detected via date check on app open), show a modal summarizing last week's spend vs. budget

#### 3C. Enhanced Statement Analyzer

Extend the current XLS-only analyzer:
1. **CSV support**: Use PapaParse (already referenced in the skill docs) to parse CSV files with automatic delimiter detection
2. **PDF bank statements**: Use `pdf.js` to extract text from PDF, then run a regex-based parser to detect tabular transaction rows (date | description | debit | credit | balance pattern)
3. **Improved column auto-detection**: Score each column header against a dictionary of known bank column names (Date/Txn Date/Value Date, Narration/Description/Particulars, Withdrawal/Debit, Deposit/Credit, Balance/Closing Balance)
4. **Fuzzy duplicate detection**: Before import, compare incoming transactions against existing ones using a similarity score (date within ±1 day, amount exact match, description Levenshtein distance < 3) — flag probable duplicates and let user decide

---

### Phase 4 — Premium Mobile UI Overhaul (Week 4–6)

This is where the app transforms from functional to *exceptional* on mobile. Every element must be optimized for thumb-reach zones on small devices (320px–414px width).

#### 4A. Design System Foundation

**Typography:**
- Display: "Plus Jakarta Sans" 900 weight for amounts and headers
- Body: "Plus Jakarta Sans" 500/600 for descriptions
- Mono: "JetBrains Mono" for amounts in lists (already partially used)
- Scale: clamp()-based fluid sizing: `clamp(11px, 3vw, 14px)` for body text on small screens

**Color tokens (extend current theme):**
```js
// Add to theme.js
success: "#00e676",
warning: "#ffab00", 
danger: "#ff5252",
info: "#00b0ff",
gradient: {
  primary: "linear-gradient(135deg, #00e5ff 0%, #6366f1 100%)",
  income: "linear-gradient(135deg, #00e676 0%, #00b0ff 100%)",
  expense: "linear-gradient(135deg, #ff5252 0%, #ff6e40 100%)",
  card: "linear-gradient(145deg, rgba(12,20,38,0.8) 0%, rgba(6,10,22,0.95) 100%)"
}
```

**Spacing system:** 4px base unit grid (4, 8, 12, 16, 20, 24, 32, 48)

#### 4B. Small-Screen Optimizations

These are specific changes to make the app sing on a 320px device:

1. **Bottom nav**: Reduce icon size from 22px to 18px, label from 9px to 8px, padding from 8px to 6px. Add `safe-area-inset-bottom` for notched phones
2. **Dashboard vitals grid**: Switch from `grid-template-columns: repeat(3, 1fr)` to a horizontal scroll (`overflow-x: auto`, `scroll-snap-type: x mandatory`) on screens < 360px
3. **Transaction rows**: Compact mode — single line with amount right-aligned, category emoji as the only visual identifier (no icon container). Expand on tap to show tags, account, notes
4. **Forms**: Full-screen modal on mobile (not centered card). Amount input gets a custom number pad instead of native keyboard for faster entry
5. **Charts in Reports**: Switch to vertically-stacked bar charts instead of horizontal pie charts on small screens. Use `viewBox` with responsive aspect ratios

#### 4C. Gesture & Interaction Layer

1. **Swipe actions on transaction rows**: Swipe right → edit, swipe left → delete (with haptic feedback via `navigator.vibrate(10)`)
2. **Pull-to-refresh on Dashboard**: Triggers `handleSmartSync`
3. **Long-press on category**: Quick-edit inline (name + color picker)
4. **Floating Action Button (FAB)**: Replace the current "+" button with a radial menu — tap once for quick-add, long-press to fan out options (Add Transaction, Upload Statement, Scan Receipt placeholder)
5. **Sheet-style modals**: Modals slide up from bottom as a draggable sheet (grabber handle at top, drag down to dismiss). This is the mobile-native pattern and eliminates the centered-card pattern that wastes space on small screens

#### 4D. Micro-animations & Polish

1. **Page transitions**: Slide-left/slide-right between pages using CSS `transform: translateX()` with a 300ms cubic-bezier timing
2. **Number count-up**: Dashboard totals animate from 0 to current value on first load (use `requestAnimationFrame` loop, ~60 frames)
3. **Card entrance**: Staggered `fadeInUp` with `animation-delay: calc(var(--i) * 60ms)` for list items
4. **Skeleton loaders**: While IndexedDB loads, show pulsing placeholder cards matching the exact layout of real content
5. **Toast notifications**: Slide in from top-right with a spring bounce, auto-dismiss after 3s with a shrinking progress bar

#### 4E. New UI Components Needed

| Component | Purpose | Small-screen behavior |
|-----------|---------|----------------------|
| `BottomSheet` | Modal replacement for all forms | Full height on < 380px, 85vh otherwise |
| `SwipeRow` | Transaction row with gesture actions | Touch-optimized with 44px hit targets |
| `NumberPad` | Custom amount input | 3×4 grid, large touch targets (56px) |
| `PullRefresh` | Dashboard refresh trigger | Native-feeling elastic pull indicator |
| `SkeletonCard` | Loading placeholder | Matches exact card dimensions |
| `BudgetMeter` | Radial progress for budget tracking | Compact 48px diameter, fits in grid |
| `RecurringBadge` | Upcoming scheduled tx indicator | Inline chip with countdown |

---

### Phase 5 — New Features (Week 6–8)

#### 5A. Multi-Currency Support

1. Add a `currency` field to accounts and transactions (default: `INR`)
2. Currency selector in Settings with ~15 popular currencies
3. Use a free API (e.g., exchangerate.host or frankfurter.app) to fetch daily rates — cache in IndexedDB for offline use
4. Dashboard shows amounts in primary currency; tap to see original currency
5. Reports aggregate by converting all amounts to the primary currency at the transaction-date rate

#### 5B. Receipt Scanner Placeholder

Since there's no backend, a full OCR pipeline isn't possible in-browser. But we can prep the UX:
1. Camera capture button in the transaction form
2. Store the photo as a base64 string in the transaction's `receipt` field
3. Display receipts in a gallery view under each transaction
4. The photo is included in the Drive backup
5. Future enhancement path: when/if the user adds a backend, plug in Google Vision API or Tesseract.js WASM

#### 5C. Financial Goals Tracker

1. Data model: `{ id, name, targetAmount, currentAmount, deadline, color, icon }`
2. Users create goals like "Emergency Fund ₹1L" or "Vacation ₹50K"
3. Manual allocation: user assigns a portion of income to a goal each month
4. Visual: animated ring chart showing progress, countdown to deadline
5. Dashboard widget: top 2 goals with mini progress bars

#### 5D. Smart Insights (On-Device)

No AI API needed — pure rule-based analysis:
1. **Spending trends**: "You spent 23% more on Food this month vs. last month"
2. **Anomaly detection**: Flag any transaction > 3× the average for its category
3. **Savings rate**: `(Income - Expenses) / Income × 100` shown as a prominent metric
4. **Category comparison**: "Your Transport spend is in the top 30% of your expenses — was it a one-time thing?"
5. Deliver as a "Weekly Insights" card on Dashboard (rotates through 3–4 insights)

---

## 4. Recommended File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── Modal.jsx        → convert to BottomSheet.jsx
│   │   ├── Toast.jsx
│   │   ├── Ico.jsx
│   │   ├── Btn.jsx
│   │   ├── NumberPad.jsx     [NEW]
│   │   ├── SwipeRow.jsx      [NEW]
│   │   ├── PullRefresh.jsx   [NEW]
│   │   ├── SkeletonCard.jsx  [NEW]
│   │   └── BudgetMeter.jsx   [NEW]
│   ├── cards/
│   │   ├── TxRow.jsx         → refactor with SwipeRow
│   │   ├── BudgetPulse.jsx   [NEW]
│   │   ├── InsightCard.jsx   [NEW]
│   │   ├── GoalCard.jsx      [NEW]
│   │   └── RecurringBadge.jsx [NEW]
│   ├── forms/
│   │   ├── TxForm.jsx
│   │   ├── CatForm.jsx
│   │   ├── TagForm.jsx
│   │   ├── BudgetForm.jsx
│   │   ├── AccForm.jsx
│   │   ├── RecurringForm.jsx  [NEW]
│   │   ├── GoalForm.jsx       [NEW]
│   │   ├── UploadModal.jsx
│   │   └── FilterModal.jsx
│   └── layout/
│       ├── Header.jsx
│       ├── BottomNav.jsx
│       └── FAB.jsx            [NEW]
├── pages/
│   ├── Dashboard.jsx
│   ├── Transactions.jsx
│   ├── Reports.jsx
│   ├── Organize.jsx
│   ├── Vault.jsx
│   └── Settings.jsx
├── services/
│   ├── localDb.js
│   ├── driveService.js
│   ├── mergeEngine.js         [NEW] — sync merge logic
│   ├── budgetChecker.js       [NEW] — threshold alerts
│   ├── recurringEngine.js     [NEW] — scheduled tx processor
│   └── insightsEngine.js      [NEW] — on-device analytics
├── utils/
│   ├── id.js
│   ├── format.js
│   ├── csvExport.js
│   ├── pdf.js
│   ├── analytics.js
│   ├── crypto.js              [NEW] — Web Crypto AES wrapper
│   └── gestures.js            [NEW] — swipe/pull detection
├── constants/
│   ├── theme.js
│   ├── defaults.js
│   └── config.js
└── hooks/
    ├── useOffline.js           [NEW]
    ├── useAppLock.js           [NEW]
    └── usePullRefresh.js       [NEW]
```

---

## 5. Priority Ranking

| # | Task | Impact | Effort | Priority |
|---|------|--------|--------|----------|
| 1 | Merge-based sync (fix race condition) | 🔴 Data loss prevention | Medium | **P0** |
| 2 | Bottom-sheet modals (mobile UX) | 🟡 Core mobile experience | Medium | **P0** |
| 3 | Small-screen responsive fixes | 🟡 Usability on 320px | Low | **P0** |
| 4 | App lock (PIN + biometric) | 🔴 Security essential for finance | Medium | **P1** |
| 5 | Offline detection + queue | 🟡 Reliability | Low | **P1** |
| 6 | Drive token auto-refresh | 🟡 Session stability | Low | **P1** |
| 7 | Budget alerts & pulse card | 🟡 Feature completeness | Medium | **P1** |
| 8 | Recurring transactions | 🟡 Major convenience | Medium | **P2** |
| 9 | Swipe gestures on tx rows | 🟢 Mobile polish | Medium | **P2** |
| 10 | Custom number pad | 🟢 Input speed | Low | **P2** |
| 11 | Enhanced statement analyzer (CSV + PDF) | 🟡 Import flexibility | High | **P2** |
| 12 | Encrypted Drive backups | 🟡 Privacy | Medium | **P2** |
| 13 | Smart insights engine | 🟢 Delight factor | Medium | **P3** |
| 14 | Financial goals tracker | 🟢 Engagement | Medium | **P3** |
| 15 | Multi-currency | 🟢 Reach | High | **P3** |
| 16 | Receipt photo capture | 🟢 Future-proofing | Low | **P3** |

---

## 6. Google Drive as Primary Storage — Design Rules

Since Drive IS the database, these rules are non-negotiable:

1. **Single source of truth file**: `ExpenseTracker_Data.json` — one file, always updated in place (PATCH, not POST). Never create date-stamped copies as the primary store.

2. **Versioned backup files**: Separately, create `ExpenseTracker_Backup_YYYY-MM-DD.json` snapshots weekly. Cap at 10 backups, delete oldest on new create.

3. **Conflict marker**: Every save writes a `syncVersion: <incrementing integer>` to the root of the JSON. Before writing, read the remote `syncVersion` — if it's higher than your local one, you MUST merge first.

4. **Chunked writes for large data**: If transactions exceed 5,000 rows, split into yearly partition files (`ExpenseTracker_2025.json`, `ExpenseTracker_2026.json`). Current year is always the hot file.

5. **Rate limiting**: Google Drive API allows ~12,000 queries/day per user. With smart batching (debounce writes by 5 seconds after last change), a heavy user will use ~200 calls/day maximum.

6. **Scoping**: Use `drive.file` scope (already implemented) — this means the app can ONLY see files it created. The user's other Drive files remain invisible and untouchable.

---

## 7. Mobile UI Specifications

### Viewport & Breakpoints

```css
/* Target devices */
--xs: 320px;   /* iPhone SE, small Androids */
--sm: 375px;   /* iPhone 12/13/14 mini */
--md: 414px;   /* iPhone Pro Max, large Androids */
--max: 600px;  /* App max-width (already set) */

/* Safe areas for notched phones */
padding-bottom: env(safe-area-inset-bottom, 16px);
padding-top: env(safe-area-inset-top, 0px);
```

### Touch Target Rules
- Minimum tap target: **44×44px** (Apple HIG standard)
- Spacing between tap targets: **≥ 8px**
- Bottom nav buttons: **48px tall** minimum
- Form inputs: **48px height** with **16px font** (prevents iOS zoom)

### Thumb Zone Layout
```
┌──────────────────┐
│   STATUS/HEADER   │  ← Info only, no actions
│                   │
│   CONTENT AREA    │  ← Scrollable
│   (read-heavy)    │
│                   │
│   ACTION ZONE     │  ← Primary actions here
│ ┌──────────────┐  │
│ │  BOTTOM NAV  │  │  ← Thumb-reachable
│ └──────────────┘  │
└──────────────────┘
```

All primary actions (add tx, sync, filter) must live in the bottom 40% of the screen.

---

## 8. Testing Checklist

Before each phase ships:

- [ ] Test on 320px width (Chrome DevTools → iPhone SE)
- [ ] Test on 414px width (iPhone 14 Pro Max)
- [ ] Test offline → add 5 transactions → go online → verify sync
- [ ] Test Drive sync with >500 transactions (performance)
- [ ] Test Google token expiry (wait 60 min, then trigger sync)
- [ ] Test dark mode AND light mode for every new component
- [ ] Test with 0 transactions (empty states)
- [ ] Test with 5,000+ transactions (scroll performance)
- [ ] Verify no horizontal scroll on any page at any breakpoint
- [ ] Verify all modals are dismissible (back button, swipe down, overlay tap)

---

## 9. Deployment

**Netlify** (already configured in `netlify.toml`):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Google Cloud Console** setup for OAuth:
1. Authorized JavaScript origins: add both `https://yourdomain.netlify.app` and `http://localhost:5715`
2. Authorized redirect URIs: same as above
3. OAuth consent screen: set to "External" with app name, support email, and `drive.file` scope
4. **Important**: Submit for Google verification before public launch — unverified apps show a scary warning screen that will kill user trust

---

*This plan assumes a solo developer working ~20 hrs/week. Adjust timelines proportionally for a team or different availability.*
