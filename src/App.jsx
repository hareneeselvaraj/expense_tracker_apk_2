
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

// Constants
import { THEMES, BASE_C } from "./constants/theme.js";
import { DEF_CATS, DEF_TAGS, BLANK_TX } from "./constants/defaults.js";
import { CLIENT_ID } from "./constants/config.js";

// Services
import { dbGet, dbSet, getInvestData, setInvestData as setInvestData_db, getAppMode, setAppMode as setAppMode_db } from "./services/localDb.js";
import { googleService } from "./services/googleService.js";
import { stampUpdated, ensureTimestamps, filterDeleted, mergeDatasets } from "./services/mergeEngine.js";
import { checkBudgets, getActiveAlerts } from "./services/budgetChecker.js";
import { processRecurring, getUpcoming } from "./services/recurringEngine.js";
import { generateInsights } from "./services/insightsEngine.js";
import { categorizeTransaction } from "./services/categorizationPipeline.js";
import { checkImportBatch } from "./services/duplicateEngine.js";
import { checkAndSendYearEndEmail, sendYearEndEmailManual } from "./services/yearEndService.js";
import { processBudgetAlerts } from "./services/budgetEmailSender.js";
import { createNotification, shouldAdd, pruneNotifications } from "./services/notificationService.js";
import { purgeOldDeleted } from "./services/purgeEngine.js";

import { useOffline } from "./hooks/useOffline.js";
import { useInstallPrompt } from "./hooks/useInstallPrompt.js";
import { useRuleEngine } from "./hooks/useRuleEngine.js";

// Utils
import { uid } from "./utils/id.js";
import { todayISO, fmtAmt } from "./utils/format.js";
import { exportCSV } from "./utils/csvExport.js";
import { exportTransactionsPDF } from "./utils/pdf.js";
import { getNetWorth, getDayFlow, getSummary } from "./utils/analytics.js";

// Components UI
import { Modal } from "./components/ui/Modal.jsx";
import { Toast } from "./components/ui/Toast.jsx";
import { Ico } from "./components/ui/Ico.jsx";

// Layout
import { Header } from "./components/layout/Header.jsx";
import { BottomNav } from "./components/layout/BottomNav.jsx";

// Pages
import Dashboard from "./pages/Dashboard.jsx";
import TransactionsPage from "./pages/Transactions.jsx";
import ReportsPage from "./pages/Reports.jsx";
import OrganizePage from "./pages/Organize.jsx";
import VaultPage from "./pages/Vault.jsx";
import SettingsPage from "./pages/Settings.jsx";
import InvestApp from "./investment/InvestApp.jsx";
import { migrateInvestData } from "./investment/utils/migrations.js";

// Forms
import { TxForm } from "./components/forms/TxForm.jsx";
import { CatForm } from "./components/forms/CatForm.jsx";
import { TagForm } from "./components/forms/TagForm.jsx";
import { BudgetForm } from "./components/forms/BudgetForm.jsx";
import { AccForm } from "./components/forms/AccForm.jsx";
import { RecurringForm } from "./components/forms/RecurringForm.jsx";
import { UploadModal } from "./components/forms/UploadModal.jsx";
import { FilterModal } from "./components/forms/FilterModal.jsx";

const globalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes fadeInUp {
    to { opacity: 1; transform: translateY(0); }
  }
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
`;

export default function App() {
  // ── STATE ──────────────────────────────────────────────────────────────────
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [themeMode, setThemeMode] = useState(localStorage.getItem("theme") || "light");
  const [page, setPage] = useState("dashboard");
  const [toast, setToast] = useState(null);

  // ── Dual-mode: Expense / Investment ─────────────────────────────────────
  const [appMode, setAppMode] = useState("expense");
  const [investData, setInvestData] = useState({
    holdings: [], transactions: [], prefs: {}, meta: { version: 1 }
  });

  // Notification Center state
  const [notifications, setNotifications] = useState([]);
  const toastTimer = useRef(null);
  const prevAlertKeysRef = useRef(new Set());

  // Data
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(DEF_CATS);
  const [tags, setTags] = useState(DEF_TAGS);
  const [accounts, setAccounts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [rules, setRules] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [emailPrefs, setEmailPrefs] = useState({ budgetAlerts: true, yearEndSummary: true });

  // Phase 1C: Offline detection
  const { isOffline, pendingOps, queueOp, clearQueue } = useOffline();
  const { canInstall, install } = useInstallPrompt();
  const { runAllRules, applyRulesToTx } = useRuleEngine(rules, setTransactions, setRules, (msg, type) => notify(msg, type));

  // Notification center helpers
  const addNotification = useCallback((notifData) => {
    const notif = createNotification(notifData);
    setNotifications(prev => {
      if (!shouldAdd(prev, notif)) return prev;
      return pruneNotifications([notif, ...prev]);
    });
    return notif;
  }, []);

  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Active (non-deleted) transactions for UI consumption
  const activeTransactions = useMemo(
    () => transactions.filter(t => !t.deleted),
    [transactions]
  );

  // Phase 3D: Insights
  const insights = useMemo(
    () => generateInsights(activeTransactions, categories),
    [activeTransactions, categories]
  );

  // Active (non-deleted) tags for UI consumption
  const activeTags = useMemo(() => tags.filter(t => !t.deleted), [tags]);

  // Active (non-deleted) categories for UI consumption
  const activeCategories = useMemo(() => categories.filter(c => !c.deleted), [categories]);

  // Phase 3B: Budget alerts
  const budgetAlerts = useMemo(
    () => getActiveAlerts(transactions, budgets, categories, tags),
    [transactions, budgets, categories, tags]
  );

  // Phase 3A: Upcoming recurring
  const upcomingRecurring = useMemo(
    () => getUpcoming(recurring, 7),
    [recurring]
  );

  // UI State
  const [viewDate, setViewDate] = useState(new Date());
  const [addTx, setAddTx] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [filters, setFilters] = useState({ from: "", to: "", cats: [], tags: [], acc: "", type: "", cd: "" });

  const [organizeTab, setOrganizeTab] = useState("categories");
  const [reportTab, setReportTab] = useState("month");
  const [reportsMode, setReportsMode] = useState("category");
  const [reportsSubTab, setReportsSubTab] = useState("breakdown");
  const [reportDate, setReportDate] = useState(new Date());
  const [orgDate, setOrgDate] = useState(new Date());
  const [orgPeriodTab, setOrgPeriodTab] = useState("month");
  const [vaultTab, setVaultTab] = useState("accounts");

  const [syncStatus, setSyncStatus] = useState("synced");
  const [showBackup, setShowBackup] = useState(false);
  const [addCat, setAddCat] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [addTag, setAddTag] = useState(false);
  const [editTag, setEditTag] = useState(null);
  const [editBudget, setEditBudget] = useState(null);
  const [addAcc, setAddAcc] = useState(false);
  const [editAcc, setEditAcc] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [addRecurring, setAddRecurring] = useState(false);
  const [editRecurring, setEditRecurring] = useState(null);

  const isModalOpen = !!(addTx || editTx || showBackup || showFilters || addCat || editCat || addTag || editTag || editBudget || addAcc || editAcc || showUpload || addRecurring || editRecurring);
  const driveTokenRef = useRef(null);
  const budgetCheckPending = useRef(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveStep, setDriveStep] = useState(null);
  const gInitRef = useRef(false);

  const C = useMemo(() => ({ ...THEMES[themeMode], ...BASE_C }), [themeMode]);

  // ── PERSISTENCE ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const d = await dbGet("data");
      if (d) {
        const lastSync = parseInt(localStorage.getItem("expense_last_sync") || "0", 10);
        if (d.transactions) setTransactions(purgeOldDeleted(ensureTimestamps(d.transactions.map(t => ({ ...t, amount: parseFloat(t.amount) || 0 }))), 90, lastSync));
        if (d.categories) setCategories(purgeOldDeleted(ensureTimestamps(d.categories), 90, lastSync));
        if (d.tags) setTags(purgeOldDeleted(ensureTimestamps(d.tags), 90, lastSync));
        if (d.accounts) setAccounts(purgeOldDeleted(ensureTimestamps(d.accounts), 90, lastSync));
        if (d.budgets) setBudgets(ensureTimestamps(d.budgets));
        if (d.rules) {
          const loaded = ensureTimestamps(d.rules);
          const migrated = loaded.map(r => {
            if (r.pattern && r.categoryId) {
              return {
                id: r.id,
                name: `Rule for ${r.pattern}`,
                enabled: true,
                logic: "AND",
                priority: r.priority || 1,
                conditions: [{ type: "merchant", op: "contains", val: r.pattern }],
                actions: [{ type: "categorize", detail: r.categoryId }],
                createdAt: r.createdAt || new Date().toISOString(),
                updatedAt: r.updatedAt || new Date().toISOString()
              };
            }
            return r;
          });
          setRules(migrated);
        }
        if (d.recurring) setRecurring(purgeOldDeleted(ensureTimestamps(d.recurring)));
        if (d.emailPrefs) setEmailPrefs(d.emailPrefs);
      }

      // Load investment data + app mode
      const savedMode = await getAppMode();
      setAppMode(savedMode);
      const savedInvest = await getInvestData();
      const migratedInvest = migrateInvestData(savedInvest);
      
      setInvestData(migratedInvest || {
        holdings: [],
        transactions: [],
        goals: [],
        prefs: { 
          defaultExchange: "NS", 
          displayCurrency: "INR", 
          xirrAssumption: 12,
          refreshMode: "manual",
          targetAllocation: { equity: 60, debt: 30, gold: 10, cash: 0 }
        },
        meta: { version: 2 }
      });

      setReady(true);
    };
    load();
  }, []);

  // One-time stamping pass for old data lacking timestamps
  useEffect(() => {
    if (!ready) return;
    const now = new Date().toISOString();
    setTransactions(prev => prev.map(t => t.updatedAt ? t : { ...t, updatedAt: now }));
    setCategories(prev => prev.map(c => c.updatedAt ? c : { ...c, updatedAt: now }));
    setTags(prev => prev.map(t => t.updatedAt ? t : { ...t, updatedAt: now }));
    setAccounts(prev => prev.map(a => a.updatedAt ? a : { ...a, updatedAt: now }));
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    dbSet("data", { transactions, categories, tags, accounts, budgets, rules, recurring, emailPrefs })
      .catch(err => {
        console.error("Failed to save data to IndexedDB:", err);
        notify("Failed to save data locally", "error");
      });
    setSyncStatus("pending");
    const t = setTimeout(() => setSyncStatus("synced"), 1000);
    return () => clearTimeout(t);
  }, [transactions, categories, tags, accounts, budgets, rules, recurring, emailPrefs, ready]);

  // Persist investData
  useEffect(() => {
    if (!ready) return;
    setInvestData_db(investData).catch(err => console.error("Failed to save investData:", err));
  }, [investData, ready]);

  // Persist appMode
  useEffect(() => {
    if (!ready) return;
    setAppMode_db(appMode).catch(err => console.error("Failed to save appMode:", err));
  }, [appMode, ready]);

  const recurringRef = useRef(recurring);
  useEffect(() => { recurringRef.current = recurring; }, [recurring]);

  // Process recurring transactions on load and periodically (every 60s)
  useEffect(() => {
    if (!ready) return;

    const runRecurring = () => {
      const currentRec = recurringRef.current;
      if (!currentRec || !currentRec.length) return;
      const { newTransactions, updatedTemplates } = processRecurring(currentRec);
      if (newTransactions.length > 0) {
        setTransactions(prev => {
          // Deduplicate: skip if a tx with same recurringId + date already exists
          const toAdd = newTransactions.filter(nt =>
            !prev.some(existing => existing.recurringId === nt.recurringId && existing.date === nt.date)
          );
          if (toAdd.length === 0) return prev;

          // Run each through categorization + rules pipeline
          const processed = toAdd.map(tx => {
            let cat = categorizeTransaction(tx, categories);
            const patch = applyRulesToTx(cat);
            if (patch) cat = { ...cat, ...patch };
            return stampUpdated(cat);
          });

          notify(`${processed.length} recurring transaction${processed.length > 1 ? 's' : ''} posted`);
          return [...processed, ...prev];
        });
      }
      if (JSON.stringify(updatedTemplates) !== JSON.stringify(recurringRef.current)) {
        setRecurring(updatedTemplates);
      }
    };

    // Run immediately on load
    runRecurring();

    // Re-check every 60 seconds (catches midnight rollover while app is open)
    const interval = setInterval(runRecurring, 60_000);
    return () => clearInterval(interval);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Budget alert check — only notify for NEW alerts crossing threshold
  useEffect(() => {
    if (!ready || !budgets.length) return;
    const alerts = getActiveAlerts(transactions, budgets, categories, tags);
    const currentKeys = new Set(alerts.map(a => `${a.type}_${a.budgetName}`));

    alerts.forEach(a => {
      const key = `${a.type}_${a.budgetName}`;
      if (prevAlertKeysRef.current.has(key)) return; // Already notified

      const isCritical = a.type === 'critical' || a.type === 'exceeded';

      // Add to notification center
      addNotification({
        type: "budget",
        severity: isCritical ? "critical" : "warning",
        title: isCritical ? `${a.budgetName} over budget!` : `${a.budgetName} at ${a.percentage}%`,
        body: isCritical
          ? `Exceeded by ₹${Math.round(a.overshoot).toLocaleString()}. Spent ₹${Math.round(a.spent).toLocaleString()} of ₹${Math.round(a.limit).toLocaleString()}.`
          : `₹${Math.round(a.remaining).toLocaleString()} remaining of ₹${Math.round(a.limit).toLocaleString()}.`,
        actionLabel: "View Budget",
        actionRoute: "organize",
        meta: { budgetName: a.budgetName, spent: a.spent, limit: a.limit, percentage: a.percentage }
      });

      // Toast only for critical
      if (isCritical) {
        notify(`🚨 ${a.budgetName}: Over budget by ₹${Math.round(a.overshoot).toLocaleString()}`, "error");
      }

      // Browser push — only once per newly crossed threshold
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(
          isCritical ? '🚨 Budget Exceeded' : '⚠️ Budget Warning',
          { body: `${a.budgetName}: ${a.percentage}% used`, icon: '/favicon.ico' }
        );
      }
    });

    prevAlertKeysRef.current = currentKeys;
  }, [transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Budget email orchestrator
  useEffect(() => {
    if (!budgetCheckPending.current || !ready || !emailPrefs.budgetAlerts) return;
    budgetCheckPending.current = false;
    
    const getToken = () => googleService.getToken(CLIENT_ID, driveTokenRef);
    processBudgetAlerts(transactions, budgets, categories, tags, user, getToken)
      .catch(err => console.error("Process budget alerts failed", err));
  }, [transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Year-end email auto-trigger
  useEffect(() => {
    if (!ready || !user || !emailPrefs.yearEndSummary) return;
    
    const getToken = () => googleService.getToken(CLIENT_ID, driveTokenRef);
    
    checkAndSendYearEndEmail(transactions, categories, tags, accounts, user, getToken)
      .then(sent => {
        if (sent) notify("📊 Your year-end financial summary has been emailed to you!");
      })
      .catch(err => console.error("Year-end email check failed:", err));
  }, [ready, user]); // Only run once on app load when user is available

  // Repair categories (Inject missing emojis from DEF_CATS)
  useEffect(() => {
    if (!ready || !categories.length) return;
    const hasMissing = categories.some(c => !c.emoji && DEF_CATS.find(d => d.id === c.id)?.emoji);
    if (hasMissing) {
      setCategories(prev => prev.map(c => {
        const def = DEF_CATS.find(d => d.id === c.id);
        if (def && !c.emoji) return { ...c, emoji: def.emoji };
        return c;
      }));
    }
  }, [ready, categories]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isModalOpen]);

  // ── AUTH ──────────────────────────────────────────────────────────────────
  const [gsiReady, setGsiReady] = useState(!!window.google);

  // Poll for Google Sign-In SDK to load (async defer script)
  const [gsiError, setGsiError] = useState(false);

  useEffect(() => {
    if (gsiReady) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (window.google) {
        setGsiReady(true);
        clearInterval(interval);
      } else if (Date.now() - startTime > 4000) {
        setGsiError(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [gsiReady]);

  useEffect(() => {
    if (!ready || user || !gsiReady || gInitRef.current) return;

    const initG = () => {
      gInitRef.current = true;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resp) => {
          const payload = JSON.parse(atob(resp.credential.split(".")[1].replace(/-/g, '+').replace(/_/g, '/')));
          const userData = { name: payload.name, email: payload.email, picture: payload.picture };
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        }
      });
      const btn = document.getElementById("googleBtn");
      if (btn) window.google.accounts.id.renderButton(btn, { theme: "outline", size: "large", shape: "pill" });
    };

    const saved = localStorage.getItem("user");
    if (saved) {
      setUser(JSON.parse(saved));
    } else {
      initG();
    }
  }, [ready, user, gsiReady]);

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    gInitRef.current = false;
    // The auth useEffect will re-run and render the button since user becomes null
  };

  // ── ACTIONS ────────────────────────────────────────────────────────────────
  const notify = (msg, type = "success", action = null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type, action, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const handleSaveTx = (data) => {
    const txs = Array.isArray(data) ? data : [data];
    const now = new Date().toISOString();
    
    setTransactions(prev => {
      let next = [...prev];
      txs.forEach(t => {
        // Run through unification pipeline (smart engine and defaults)
        let categorizedTx = categorizeTransaction({ ...t, amount: parseFloat(t.amount) || 0 }, categories);
        
        // Then apply user rules
        const rulesPatch = applyRulesToTx(categorizedTx);
        if (rulesPatch) categorizedTx = { ...categorizedTx, ...rulesPatch };
        
        const sanitized = stampUpdated(categorizedTx);
        
        const idx = next.findIndex(x => x.id === sanitized.id);
        if (idx > -1) {
          sanitized.deleted = next[idx].deleted || sanitized.deleted;
          next[idx] = sanitized;
        }
        else next = [sanitized, ...next];

        // ── Investment Sync Logic ──────────────────────────────────────────
        if (sanitized.category !== "c11") {
          setInvestData(prevInvest => {
            const hasTx = prevInvest.transactions.some(itx => itx.expenseTxId === sanitized.id && !itx.deleted);
            if (hasTx) {
              return {
                ...prevInvest,
                transactions: prevInvest.transactions.map(itx => 
                  itx.expenseTxId === sanitized.id ? { ...itx, deleted: true, updatedAt: now } : itx
                )
              };
            }
            return prevInvest;
          });
        }
        
        // If category is "Investment" (c11), sync to investData
        if (sanitized.category === "c11" && !sanitized.deleted) {
          setInvestData(prevInvest => {
            const newInvest = { ...prevInvest };
            const existingIdx = newInvest.transactions.findIndex(itx => itx.expenseTxId === sanitized.id);
            
            const investTx = {
              id: existingIdx > -1 ? newInvest.transactions[existingIdx].id : "itx_" + uid(),
              expenseTxId: sanitized.id,
              date: sanitized.date,
              amount: sanitized.amount,
              type: "buy", // default to buy for now
              description: sanitized.description,
              updatedAt: now,
              deleted: false
            };

            if (existingIdx > -1) {
              newInvest.transactions[existingIdx] = investTx;
            } else {
              newInvest.transactions = [investTx, ...newInvest.transactions];
            }
            return newInvest;
          });
        } else if (sanitized.category === "c11" && sanitized.deleted) {
          // If it was an investment and now deleted, delete counterpart
          setInvestData(prevInvest => ({
            ...prevInvest,
            transactions: prevInvest.transactions.map(itx => 
              itx.expenseTxId === sanitized.id ? { ...itx, deleted: true, updatedAt: now } : itx
            )
          }));
        }
      });
      return next;
    });
    setAddTx(false);
    setEditTx(null);
    budgetCheckPending.current = true;
    notify("Transaction saved successfully");
  };

  const handleImportTx = (incoming) => {
    const txs = Array.isArray(incoming) ? incoming : [incoming];

    // Resolve raw category name → ID, auto-create if missing
    const resolveCategoryName = (rawName, txType) => {
      if (!rawName) return null;
      const normalized = rawName.trim().toLowerCase();
      const existing = categories.find(c => !c.deleted && c.name.toLowerCase() === normalized);
      if (existing) return existing.id;
      const newCat = {
        id: uid(), name: rawName.trim(), type: txType || "Expense",
        color: "#94a3b8", emoji: "📦", updatedAt: new Date().toISOString()
      };
      setCategories(prev => [...prev, newCat]);
      return newCat.id;
    };

    // Resolve raw tag string → ID array, auto-create if missing
    const resolveTagNames = (rawTagString) => {
      if (!rawTagString) return [];
      const names = rawTagString.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
      const ids = [];
      const newTags = [];
      names.forEach(name => {
        const normalized = name.toLowerCase().replace(/^#/, "");
        const existing = tags.find(t => !t.deleted && t.name.toLowerCase() === normalized);
        if (existing) { ids.push(existing.id); }
        else {
          const newTag = {
            id: uid(), name: name.replace(/^#/, ""),
            color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`,
            updatedAt: new Date().toISOString()
          };
          newTags.push(newTag);
          ids.push(newTag.id);
        }
      });
      if (newTags.length > 0) setTags(prev => [...prev, ...newTags]);
      return ids;
    };

    // Resolve raw account name → ID, auto-create if missing
    const resolveAccountName = (rawName) => {
      if (!rawName) return "";
      const normalized = rawName.trim().toLowerCase();
      const existing = accounts.find(a => !a.deleted && a.name.toLowerCase() === normalized);
      if (existing) return existing.id;
      const newAcc = {
        id: uid(),
        name: rawName.trim(),
        type: "Bank",
        initialBalance: 0,
        updatedAt: new Date().toISOString()
      };
      setAccounts(prev => [...prev, newAcc]);
      return newAcc.id;
    };

    const processed = txs.map(t => {
      let categoryId = t.category;
      if (t._rawCategory) {
        categoryId = resolveCategoryName(t._rawCategory, t.txType) || categoryId;
      }
      let tagIds = t.tags || [];
      if (t._rawTags) {
        tagIds = resolveTagNames(t._rawTags);
      }
      let accountId = t.accountId || "";
      if (t._rawAccount) {
        accountId = resolveAccountName(t._rawAccount) || accountId;
      }
      const cleanTx = {
        ...t, category: categoryId, tags: tagIds,
        accountId,
        amount: parseFloat(t.amount) || 0,
      };
      delete cleanTx._rawCategory;
      delete cleanTx._rawTags;
      delete cleanTx._rawAccount;

      // Run through categorize+rules pipeline only if no explicit category from sheet
      let categorized = cleanTx;
      if (!t._rawCategory) {
        categorized = categorizeTransaction(cleanTx, categories);
        const rulesPatch = applyRulesToTx(categorized);
        if (rulesPatch) categorized = { ...categorized, ...rulesPatch };
      }
      return stampUpdated(categorized);
    });

    setTransactions(prev => {
      const { clean, duplicates } = checkImportBatch(processed, prev);
      if (duplicates.length > 0) {
        notify(`${duplicates.length} duplicate(s) skipped, ${clean.length} imported`, clean.length > 0 ? "success" : "warning");
      } else {
        notify(`${clean.length} transaction${clean.length > 1 ? 's' : ''} imported`);
      }
      if (clean.length === 0) return prev;
      return [...clean, ...prev];
    });
    budgetCheckPending.current = true;
  };

  const handleDeleteTx = (id) => {
    const now = new Date().toISOString();
    const wasInvestment = transactions.find(t => t.id === id)?.category === "c11";

    setTransactions(prev => prev.map(t => t.id === id ? { ...t, deleted: true, updatedAt: now } : t));
    
    if (wasInvestment) {
      setInvestData(prev => ({
        ...prev,
        transactions: prev.transactions.map(itx => 
          itx.expenseTxId === id ? { ...itx, deleted: true, updatedAt: now } : itx
        )
      }));
    }

    setEditTx(null);
    notify("Transaction deleted", "error", {
      label: "Undo",
      onClick: () => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, deleted: false, updatedAt: new Date().toISOString() } : t));
        if (wasInvestment) {
          setInvestData(prev => ({
            ...prev,
            transactions: prev.transactions.map(itx => 
              itx.expenseTxId === id ? { ...itx, deleted: false, updatedAt: new Date().toISOString() } : itx
            )
          }));
        }
        notify("Transaction restored", "success");
      }
    });
  };

  const toggleTheme = () => {
    const next = themeMode === "dark" ? "light" : "dark";
    setThemeMode(next);
    localStorage.setItem("theme", next);
  };

  // ── SYNC ──────────────────────────────────────────────────────────────────
  const saveToDrive = async () => {
    setDriveStep("saving");
    try {
      const file = await googleService.saveToDrive(CLIENT_ID, driveTokenRef, { transactions, categories, tags, accounts, budgets, rules, recurring, investData });
      if (file && file.modifiedTime) {
        localStorage.setItem("expense_last_sync", new Date(file.modifiedTime).getTime().toString());
      }
      notify("Backup synced successfully");
    } catch (err) {
      notify(err.message, "error");
    }
    setDriveStep(null);
  };

  const listDriveBackups = async () => {
    setDriveStep("fetching");
    try {
      const files = await googleService.listBackups(CLIENT_ID, driveTokenRef);
      setDriveFiles(files);
      setDriveStep("list");
    } catch (err) {
      notify(err.message, "error");
      setDriveStep(null);
    }
  };

  const restoreFromDrive = async (file) => {
    setDriveStep("restoring");
    try {
      const data = await googleService.restoreFromDrive(CLIENT_ID, driveTokenRef, file.id);
      const localData = { transactions, categories, tags, accounts, budgets, rules, recurring, investData };
      const merged = mergeDatasets(localData, data);
      
      if (merged.transactions) setTransactions(merged.transactions);
      if (merged.categories) setCategories(merged.categories);
      if (merged.tags) setTags(merged.tags);
      if (merged.accounts) setAccounts(merged.accounts);
      if (merged.budgets) setBudgets(merged.budgets);
      if (merged.rules) setRules(merged.rules);
      if (merged.recurring) setRecurring(merged.recurring);
      if (merged.investData) setInvestData(merged.investData);
      budgetCheckPending.current = true;
      
      if (file.modifiedTime) localStorage.setItem("expense_last_sync", new Date(file.modifiedTime).getTime().toString());
      notify("Data restored & merged successfully");
      // Re-run rules on restored data
      setTimeout(() => runAllRules(activeTransactions), 100);
      setShowBackup(false);
    } catch (err) {
      notify(err.message, "error");
    }
    setDriveStep(null);
  };

  const handleSmartSync = async () => {
    if (!user) { notify("Please sign in first", "error"); return; }
    if (isOffline) { notify("You're offline — sync will resume when connected", "error"); return; }
    setSyncStatus("pending");
    try {
      const localData = { transactions, categories, tags, accounts, budgets, rules, recurring, investData };
      const result = await googleService.smartSync(CLIENT_ID, driveTokenRef, localData);
      const { merged, action } = result;

      // Apply merged data
      if (merged.transactions) setTransactions(merged.transactions);
      if (merged.categories) setCategories(merged.categories);
      if (merged.tags) setTags(merged.tags);
      if (merged.accounts) setAccounts(merged.accounts);
      if (merged.budgets) setBudgets(merged.budgets);
      if (merged.rules) setRules(merged.rules);
      if (merged.recurring) setRecurring(merged.recurring);
      if (merged.investData) setInvestData(merged.investData);
      budgetCheckPending.current = true;

      if (result.file?.modifiedTime) {
        localStorage.setItem("expense_last_sync", new Date(result.file.modifiedTime).getTime().toString());
      }

      // Clear offline queue
      clearQueue();

      notify(action === "merged" ? "Smart Merged & Synced ☁️" : "Saved to Cloud ☁️");
      addNotification({ type: "sync", severity: "success", title: "Sync complete", body: `Data backed up to Google Drive at ${new Date().toLocaleTimeString()}` });
      setSyncStatus("synced");
    } catch(err) {
      notify(err.message, "error");
      addNotification({ type: "sync", severity: "critical", title: "Sync failed", body: err.message || "Could not reach Google Drive. Changes saved locally.", actionLabel: "Retry", actionRoute: "settings" });
      setSyncStatus("error");
    }
  };

  // Auto-sync when coming back online (flush pending queue)
  useEffect(() => {
    if (!isOffline && ready && user && pendingOps.length > 0) {
      handleSmartSync();
    }
  }, [isOffline]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ANALYTICS ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const monthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
    const mo = transactions.filter(t => {
      if (t.deleted) return false;
      return t.date?.startsWith(monthKey);
    });
    const income = mo.filter(t => t.txType === "Income").reduce((s, t) => s + t.amount, 0);
    const expense = mo.filter(t => t.txType === "Expense").reduce((s, t) => s + t.amount, 0);
    const invest = mo.filter(t => t.txType === "Investment").reduce((s, t) => s + t.amount, 0);
    const buildCatMap = (txs) => {
      const m = {};
      txs.forEach(t => {
        const c = categories.find(x => x.id === t.category)?.name || "Others";
        m[c] = (m[c] || 0) + t.amount;
      });
      return m;
    };
    const expCatMap = buildCatMap(mo.filter(t => t.txType === "Expense"));
    const incCatMap = buildCatMap(mo.filter(t => t.txType === "Income"));
    const invCatMap = buildCatMap(mo.filter(t => t.txType === "Investment"));
    return { income, expense, invest, expCatMap, incCatMap, invCatMap };
  }, [transactions, categories, viewDate]);

  const nw = getNetWorth(accounts, transactions);

  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      if (t.deleted) return false;
      const dq = searchQ.toLowerCase();
      if (dq && !t.description.toLowerCase().includes(dq)) return false;
      if (filters.from && t.date < filters.from) return false;
      if (filters.to && t.date > filters.to) return false;
      if (filters.cats.length && !filters.cats.includes(t.category)) return false;
      if (filters.acc && t.accountId !== filters.acc) return false;
      if (filters.type && t.txType !== filters.type) return false;
      if (filters.cd && t.creditDebit !== filters.cd) return false;
      if (filters.tags.length && !filters.tags.some(tg => (t.tags || []).includes(tg))) return false;
      return true;
    }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [transactions, searchQ, filters]);

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (!ready) return <div style={{ background: C.bg, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>;

  if (!user) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="page-enter" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 36, padding: 56, textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>💰</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text }}>Expense tracker</h1>
        <p style={{ color: C.sub, marginBottom: 32 }}>Your private financial command center.</p>
        <div id="googleBtn" style={{ minHeight: 44, display: "flex", justifyContent: "center", alignItems: "center" }}>
          {gsiError && (
             <div style={{ color: "#ff6b6b", fontSize: 13, background: "#ff6b6b15", padding: "10px 16px", borderRadius: 12, border: "1px solid #ff6b6b40" }}>
               Google Sign-In script blocked.<br/>Disable tracking protection/ad-blockers to login.
             </div>
          )}
        </div>
        {canInstall && (
          <button
            onClick={install}
            style={{
              marginTop: 20, width: "100%", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
              color: "#fff", border: "none", borderRadius: 16, padding: "14px 24px",
              fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "transform .15s",
              letterSpacing: ".03em"
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            📲 Install App
          </button>
        )}
      </div>
    </div>
  );

  // ── INVESTMENT MODE ──────────────────────────────────────────────────────
  if (appMode === "investment") {
    return (
      <>
        <style>{globalStyles}</style>
        <InvestApp
          investData={investData}
          setInvestData={setInvestData}
          onBackToExpense={() => setAppMode("expense")}
          theme={C}
        />
        <Toast toast={toast} theme={C} />
        <style>{`
          .spinner { width:40px; height:40px; border:4px solid transparent; border-top-color:${C.primary}; border-radius:50%; animation:spin 1s linear infinite; }
          @keyframes spin { to { transform:rotate(360deg); } }
          @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
          .page-enter { animation: fadeIn 0.4s ease-out; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: ${C.border}; borderRadius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: ${C.primary}; }
        `}</style>
      </>
    );
  }

  const activeTitle = {
    dashboard: "Expense tracker 💰",
    transactions: "Transactions",
    reports: "Wealth Report",
    organize: "Organize",
    vault: "Vault",
    settings: "Settings"
  }[page];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, paddingBottom: 100, maxWidth: 600, margin: "0 auto", position: "relative" }}>
      <style>{globalStyles}</style>
      <Header
        title={activeTitle}
        theme={C}
        themeMode={themeMode}
        toggleTheme={toggleTheme}
        onOpenSettings={() => setPage("settings")}
        syncStatus={syncStatus}
        onOpenSync={() => setShowBackup(true)}
        isOffline={isOffline}
        budgetAlerts={budgetAlerts}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClearNotification={clearNotification}
        onNavigate={setPage}
      />


      <main>
        {page === "dashboard" && <Dashboard {...{ user, transactions: activeTransactions, categories, tags, accounts, budgets, stats, netWorth: getNetWorth(accounts, activeTransactions), getDayFlow: (d) => getDayFlow(activeTransactions, d), viewDate: viewDate, setViewDate: setViewDate, onEditTx: setEditTx, onAddTx: () => setAddTx(true), onSave: handleSaveTx, onSmartSync: handleSmartSync, isSyncing: syncStatus === "pending", isOffline: isOffline, theme: C, goToTransactions: () => setPage("transactions") }} />}
        {page === "transactions" && <TransactionsPage {...{
            transactions, filteredTx, categories, tags, accounts, searchQ, setSearchQ, filters, setFilters,
            hasFilter: !!(filters.from || filters.to || filters.cats.length || filters.acc || filters.type || filters.cd || filters.tags.length),
            onShowFilters: () => setShowFilters(true), onShowUpload: () => setShowUpload(true),
            onExportCSV: () => exportCSV(filteredTx, categories, tags, accounts), onExportPDF: () => exportTransactionsPDF(filteredTx, categories, accounts, (m) => notify(m)),
            onEditTx: setEditTx, selectedTxIds, setSelectedTxIds,
            onDeleteBulk: () => {
              const now = new Date().toISOString();
              setTransactions(p => p.map(t => selectedTxIds.includes(t.id) ? { ...t, deleted: true, updatedAt: now } : t));
              setSelectedTxIds([]);
              notify("Items deleted successfully", "error");
            }, 
            onSoftDeleteBulk: (ids) => {
              const now = new Date().toISOString();
              setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, deleted: true, updatedAt: now } : t));
            },
            onAdd: () => setAddTx(true), theme: C
          }} />}

        {page === "organize" && <OrganizePage {...{
          organizeTab, setOrganizeTab, 
          orgDate, setOrgDate, orgPeriodTab, setOrgPeriodTab,
          categories: activeCategories, transactions: activeTransactions, tags: activeTags, budgets, rules, DEF_CATS,
          onAddCat: () => setAddCat(true),
          onEditCat: (c) => setEditCat(c),
          onDeleteCat: (id) => {
            setCategories(p => p.map(c =>
              c.id === id ? { ...c, deleted: true, updatedAt: new Date().toISOString() } : c
            ));
            setBudgets(p => p.filter(b => b.categoryId !== id));
            notify("Category deleted successfully", "error");
          },
          onAddTag: () => setAddTag(true),
          onEditTag: (t) => setEditTag(t),
          onDeleteTag: (id) => {
            setTags(p => p.map(x =>
              x.id === id ? { ...x, deleted: true, updatedAt: new Date().toISOString() } : x
            ));
            setBudgets(p => p.filter(b => b.tagId !== id));
            notify("Tag deleted successfully", "error");
          },
          onAddBudget: (type) => setEditBudget({ type, isNew: true }),
          onEditBudget: (id, b, type) => {
            if (type === "categories") setEditBudget({ categoryId: id, budget: b, type });
            else setEditBudget({ tagId: id, budget: b, type });
          },
          onDeleteBudget: (budgetId) => {
            setBudgets(p => p.filter(b => b.id !== budgetId));
            notify("Budget deleted successfully", "error");
          },
          onAddRule: (r) => setRules(p => {
             const maxP = p.length ? Math.max(...p.map(x=>x.priority)) : 0;
             return [{...r, priority: maxP + 1}, ...p]
          }),
          onEditRule: (r) => setRules(p => p.map(x => x.id === r.id ? r : x)),
          onDeleteRule: (id) => setRules(p => p.filter(x => x.id !== id)),
          onMagicWand: () => {
             const count = runAllRules(activeTransactions);
             notify(count > 0 ? `⚡ Rules applied to ${count} transaction${count !== 1 ? 's' : ''}` : '✅ No transactions matched any rules', count > 0 ? 'success' : 'warning');
          },
          theme: C
        }} />}
        {page === "vault" && <VaultPage {...{
          accounts, transactions: activeTransactions,
          onAddAcc: () => setAddAcc(true),
          onEditAcc: (acc) => setEditAcc(acc),
          onDeleteAcc: (id) => {
            console.log("Deleting account:", id);
            setAccounts(prev => {
              const next = prev.filter(x => x.id !== id);
              console.log("New accounts list length:", next.length);
              return next;
            });
            notify("Account deleted successfully", "error");
          },
          vaultTab, setVaultTab,
          // Recurring
          recurring,
          onAddRecurring: () => setAddRecurring(true),
          onEditRecurring: (tmpl) => setEditRecurring(tmpl),
          onDeleteRecurring: (id) => {
            setRecurring(p => p.filter(r => r.id !== id));
            notify("Recurring payment deleted", "error");
          },
          onTogglePauseRecurring: (id) => {
            setRecurring(p => p.map(r => r.id === id ? { ...r, paused: !r.paused, updatedAt: new Date().toISOString() } : r));
            const tmpl = recurring.find(r => r.id === id);
            notify(tmpl?.paused ? "Recurring payment resumed" : "Recurring payment paused");
          },
          reportTab, setReportTab, reportsMode, setReportsMode, reportsSubTab, setReportsSubTab, reportDate, setReportDate,
          filtered: filteredTx,
          categories, tags,
          theme: C
        }} />}
        {page === "settings" && <SettingsPage {...{
          user,
          transactions,
          emailPrefs,
          onSetEmailPrefs: setEmailPrefs,
          onSendYearSummary: async (year) => {
            const getToken = () => googleService.getToken(CLIENT_ID, driveTokenRef);
            await sendYearEndEmailManual(transactions, categories, tags, accounts, user, getToken, year);
            notify(`📊 ${year} financial summary sent to ${user.email}`);
          },
          themeMode, toggleTheme,
          onLogout: logout,
          investData,
          onOpenInvestments: () => setAppMode("investment"),
          onShowBackup: () => setShowBackup(true),
          onExportBackup: () => {
            const data = { transactions, categories, tags, accounts, budgets, rules, recurring, investData };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Portfolio_Backup_${new Date().toISOString().split("T")[0]}.json`;
            a.click();
            notify("Backup Downloaded");
          },
          onImportBackup: () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.onchange = (e) => {
              const file = e.target.files[0];
              const reader = new FileReader();
              reader.onload = (re) => {
                try {
                  const data = JSON.parse(re.target.result);
                  if (data.transactions) setTransactions(data.transactions);
                  if (data.categories) setCategories(data.categories);
                  if (data.tags) setTags(data.tags);
                  if (data.accounts) setAccounts(data.accounts);
                  if (data.budgets) setBudgets(data.budgets);
                  if (data.rules) setRules(data.rules);
                  if (data.recurring) setRecurring(data.recurring);
                  if (data.investData) setInvestData(data.investData);
                  notify("Import Successful");
                } catch (err) { notify("Invalid file", "error"); }
              };
              reader.readAsText(file);
            };
            input.click();
          },
          onClearData: () => {
            if (window.confirm("CLEAR EVERYTHING? (Including Investments)")) {
              setTransactions([]); setAccounts([]); setBudgets([]); setRules([]);
              setInvestData({ holdings: [], transactions: [], prefs: {}, meta: { version: 1 } });
              notify("Data Cleared");
            }
          },
          theme: C
        }} />}
      </main>

      <BottomNav 
        page={page} 
        setPage={setPage} 
        onAddTx={() => setAddTx(true)} 
        onAddAcc={() => setAddAcc(true)}
        onAddCat={() => setAddCat(true)}
        onAddTag={() => setAddTag(true)}
        theme={C} 
        hideFab={isModalOpen}
      />

      <Modal open={addTx} onClose={() => setAddTx(false)} title="Add Transaction" theme={C}>
        <TxForm 
          categories={categories} tags={activeTags} accounts={accounts} 
          existingTransactions={transactions}
          onSave={tx => {
            if (Array.isArray(tx)) { handleSaveTx(tx); }
            else { handleSaveTx(tx); setAddTx(false); }
          }} 
          onClose={() => setAddTx(false)} theme={C} 
        />
      </Modal>

      <Modal open={!!editTx} onClose={() => setEditTx(null)} title="Edit Transaction" theme={C}>
        {editTx && (
          <TxForm 
            init={editTx} categories={categories} tags={activeTags} accounts={accounts} 
            existingTransactions={transactions}
            onSave={tx => { handleSaveTx(tx); setEditTx(null); }} 
            onDelete={id => { handleDeleteTx(id); setEditTx(null); }} 
            onClose={() => setEditTx(null)} theme={C} 
          />
        )}
      </Modal>

      <Modal theme={C} open={showBackup} onClose={() => setShowBackup(false)} title="Sync & Backup">
        {/* Drive Logic Here */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button onClick={saveToDrive} disabled={driveStep === "saving"} style={{ background: C.primary, color: "#000", padding: 12, borderRadius: 12, border: "none" }}>{driveStep === "saving" ? "Saving..." : "Save to Drive"}</button>
          <button onClick={listDriveBackups} style={{ background: C.muted, color: C.text, padding: 12, borderRadius: 12, border: `1px solid ${C.border}` }}>Restore from Drive</button>
          {driveStep === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {driveFiles.map(f => (
                <div key={f.id} onClick={() => restoreFromDrive(f)} style={{ background: C.card, padding: 10, borderRadius: 10, cursor: "pointer" }}>{f.name}</div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!(addCat || editCat)} title={addCat ? "New Category" : "Edit Category"} onClose={() => { setAddCat(false); setEditCat(null); }} theme={C}>
        <CatForm
          editCat={editCat}
          theme={C}
          onCancel={() => { setAddCat(false); setEditCat(null); }}
          onSave={(c) => {
            const item = stampUpdated(c);
            setCategories(p => {
              const idx = p.findIndex(x => x.id === item.id);
              if (idx > -1) return p.map(x => x.id === item.id ? item : x);
              return [item, ...p];
            });
            setAddCat(false);
            setEditCat(null);
            notify(editCat ? "Category updated successfully" : "Category created successfully");
          }}
        />
      </Modal>

      <Modal open={!!(addTag || editTag)} title={addTag ? "New Tag" : "Edit Tag"} onClose={() => { setAddTag(false); setEditTag(null); }} theme={C}>
        <TagForm
          editTag={editTag}
          theme={C}
          onCancel={() => { setAddTag(false); setEditTag(null); }}
          onSave={(t) => {
            const item = stampUpdated(t);
            setTags(p => {
              const idx = p.findIndex(x => x.id === item.id);
              if (idx > -1) return p.map(x => x.id === item.id ? item : x);
              return [item, ...p];
            });
            setAddTag(false);
            setEditTag(null);
            notify(editTag ? "Tag updated successfully" : "Tag created successfully");
          }}
        />
      </Modal>

      <Modal open={!!editBudget} title={editBudget?.categoryId || editBudget?.tagId ? "Edit Budget" : "New Budget"} onClose={() => setEditBudget(null)} theme={C}>
        {editBudget && (
          <BudgetForm
            item={editBudget.type === "categories" ? categories.find(c => c.id === editBudget.categoryId) : tags.find(t => t.id === editBudget.tagId)}
            type={editBudget.type}
            availables={editBudget.type === "categories" 
              ? categories.filter(c => c.type === "Expense" && !budgets.some(b => b.categoryId === c.id))
              : activeTags.filter(t => !budgets.some(b => b.tagId === t.id))
            }
            currentBudget={editBudget.budget}
            theme={C}
            onCancel={() => setEditBudget(null)}
            onSave={(targetId, amt) => {
              setBudgets(p => {
                const idKey = editBudget.type === "categories" ? "categoryId" : "tagId";
                
                const idx = p.findIndex(b => b[idKey] === targetId);
                if (idx > -1) { 
                  if (amt === 0) return p.filter(b => b[idKey] !== targetId);
                  const n = [...p]; n[idx].amount = amt; return n; 
                }
                if (amt === 0) return p;
                return [...p, { id: uid(), [idKey]: targetId, amount: amt }];
              });
              setEditBudget(null);
              notify("Budget created successfully");
            }}
          />
        )}
      </Modal>

      <Modal open={!!(addAcc || editAcc)} title={editAcc ? "Edit Account" : "New Vault Account"} onClose={() => { setAddAcc(false); setEditAcc(null); }} theme={C}>
        <AccForm
          editAcc={editAcc}
          theme={C}
          onCancel={() => { setAddAcc(false); setEditAcc(null); }}
          onSave={(acc) => {
            const item = stampUpdated(acc);
            setAccounts(p => {
              const idx = p.findIndex(x => x.id === item.id);
              if (idx > -1) return p.map(x => x.id === item.id ? item : x);
              return [item, ...p];
            });
            setAddAcc(false);
            setEditAcc(null);
            notify(editAcc ? "✓ Account Updated" : "✓ Account Created");
          }}
        />
      </Modal>

      <Modal open={!!(addRecurring || editRecurring)} title={editRecurring ? "Edit Recurring Payment" : "New Recurring Payment"} onClose={() => { setAddRecurring(false); setEditRecurring(null); }} theme={C}>
        <RecurringForm
          init={editRecurring}
          categories={categories}
          accounts={accounts}
          theme={C}
          onClose={() => { setAddRecurring(false); setEditRecurring(null); }}
          onDelete={(id) => {
            setRecurring(p => p.filter(r => r.id !== id));
            setEditRecurring(null);
            notify("Recurring payment deleted", "error");
          }}
          onSave={(tmpl) => {
            let finalTmpl = { ...tmpl, updatedAt: new Date().toISOString() };
            // If it's an edit, delete any previously auto-posted transactions for this recurringId that are strictly earlier than the new startDate.
            if (editRecurring && finalTmpl.startDate !== editRecurring.startDate) {
              setTransactions(prev => prev.map(t => 
                (t.recurringId === finalTmpl.id && t.date < finalTmpl.startDate)
                  ? { ...t, deleted: true, updatedAt: new Date().toISOString() }
                  : t
              ));
            }

            // Process immediately if due
            const { newTransactions, updatedTemplates } = processRecurring([finalTmpl]);
            if (newTransactions.length > 0) {
              setTransactions(prev => {
                const toAdd = newTransactions.filter(nt =>
                  !prev.some(existing => existing.recurringId === nt.recurringId && existing.date === nt.date)
                );
                if (toAdd.length === 0) return prev;

                const processed = toAdd.map(tx => {
                  let cat = categorizeTransaction(tx, categories);
                  const patch = applyRulesToTx(cat);
                  if (patch) cat = { ...cat, ...patch };
                  return stampUpdated(cat);
                });

                return [...processed, ...prev];
              });
              if (updatedTemplates.length > 0) finalTmpl = updatedTemplates[0];
            }

            setRecurring(p => {
              const idx = p.findIndex(x => x.id === finalTmpl.id);
              if (idx > -1) return p.map(x => x.id === finalTmpl.id ? finalTmpl : x);
              return [finalTmpl, ...p];
            });
            setAddRecurring(false);
            setEditRecurring(null);
            notify(editRecurring ? "✓ Recurring Updated" : "✓ Recurring Created");
          }}
        />
      </Modal>

      <UploadModal 
        open={showUpload} 
        onClose={() => setShowUpload(false)} 
        onImport={handleImportTx}
        theme={C}
        categories={categories}
        rules={rules}
        transactions={transactions}
      />

      <Modal theme={C} open={showFilters} onClose={() => setShowFilters(false)} title="Filter Transactions">
        <FilterModal 
          filters={filters} 
          setFilters={setFilters} 
          categories={categories} 
          tags={activeTags} 
          accounts={accounts} 
          onClose={() => setShowFilters(false)} 
          theme={C} 
        />
      </Modal>

      <Toast toast={toast} theme={C} />


      <style>{`
        .spinner { width:40px; height:40px; border:4px solid transparent; border-top-color:${C.primary}; border-radius:50%; animation:spin 1s linear infinite; }
        @keyframes scan { 0% { top:-100%; } 100% { top:200%; } }
        @keyframes pulse-neon { 0% { box-shadow:0 0 5px ${C.primaryDim}; } 50% { box-shadow:0 0 20px ${C.primary}; } 100% { box-shadow:0 0 5px ${C.primaryDim}; } }
        @keyframes typing { from { width:0; } to { width:100%; } }
        
        .glass-card {
          background: rgba(255,255,255,0.03) !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        
        .cyber-accent {
          position: relative;
          overflow: hidden;
        }
        .cyber-accent::before {
          content: ""; position: absolute; top: 0; left: 0; width: 10px; height: 10px;
          border-top: 2px solid ${C.primary}; border-left: 2px solid ${C.primary};
        }
        .cyber-accent::after {
          content: ""; position: absolute; bottom: 0; right: 0; width: 10px; height: 10px;
          border-bottom: 2px solid ${C.primary}; border-right: 2px solid ${C.primary};
        }
        
        .scan-line {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(to bottom, transparent, ${C.primary}44, transparent);
          height: 100px; width: 100%; opacity: 0.1;
          animation: scan 4s linear infinite;
        }

        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .page-enter { animation: fadeIn 0.4s ease-out; }
        
        /* Premium Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; borderRadius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.primary}; }
        
        .premium-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${C.border} transparent;
        }
        .premium-scroll::-webkit-scrollbar { width: 5px; }
        .premium-scroll::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
      `}</style>
    </div>
  );
}
