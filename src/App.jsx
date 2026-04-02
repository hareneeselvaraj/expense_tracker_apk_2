
import React, { useState, useEffect, useMemo, useRef } from "react";

// Constants
import { THEMES, BASE_C } from "./constants/theme.js";
import { DEF_CATS, DEF_TAGS, BLANK_TX } from "./constants/defaults.js";
import { CLIENT_ID } from "./constants/config.js";

// Services
import { dbGet, dbSet } from "./services/localDb.js";
import { googleService } from "./services/googleService.js";
import { stampUpdated, ensureTimestamps, filterDeleted } from "./services/mergeEngine.js";
import { checkBudgets, getActiveAlerts } from "./services/budgetChecker.js";
import { processRecurring, getUpcoming } from "./services/recurringEngine.js";
import { generateInsights } from "./services/insightsEngine.js";
import { categorizeTransaction } from "./services/categorizationPipeline.js";
import { checkAndSendYearEndEmail, sendYearEndEmailManual } from "./services/yearEndService.js";
import { processBudgetAlerts } from "./services/budgetEmailSender.js";

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
  const { runAllRules, applyRulesToTx } = useRuleEngine(rules, setTransactions);

  // Phase 3D: Insights
  const insights = useMemo(
    () => generateInsights(transactions, categories),
    [transactions, categories]
  );

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
        if (d.transactions) setTransactions(ensureTimestamps(d.transactions.map(t => ({ ...t, amount: parseFloat(t.amount) || 0 }))));
        if (d.categories) setCategories(ensureTimestamps(d.categories));
        if (d.tags) setTags(ensureTimestamps(d.tags));
        if (d.accounts) setAccounts(ensureTimestamps(d.accounts));
        if (d.budgets) setBudgets(ensureTimestamps(d.budgets));
        if (d.rules) setRules(ensureTimestamps(d.rules));
        if (d.recurring) setRecurring(ensureTimestamps(d.recurring));
        if (d.emailPrefs) setEmailPrefs(d.emailPrefs);
      }

      setReady(true);
    };
    load();
  }, []);

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

  // Process recurring transactions on load
  useEffect(() => {
    if (!ready || !recurring.length) return;
    const { newTransactions, updatedTemplates } = processRecurring(recurring);
    if (newTransactions.length > 0) {
      setTransactions(prev => [...newTransactions, ...prev]);
      notify(`${newTransactions.length} recurring transaction${newTransactions.length > 1 ? 's' : ''} posted`);
    }
    if (JSON.stringify(updatedTemplates) !== JSON.stringify(recurring)) {
      setRecurring(updatedTemplates);
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Budget alert check after every transaction save
  useEffect(() => {
    if (!ready || !budgets.length) return;
    const alerts = getActiveAlerts(transactions, budgets, categories, tags);
    const danger = alerts.filter(a => a.level === 'danger');
    const warns = alerts.filter(a => a.level === 'warning');
    if (danger.length > 0) {
      notify(`⚠ Budget exceeded: ${danger.map(a => a.name).join(', ')}`, 'error');
    } else if (warns.length > 0) {
      notify(`Budget warning: ${warns.map(a => a.name).join(', ')} nearing limit`, 'warning');
    }
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
  useEffect(() => {
    if (gsiReady) return;
    const interval = setInterval(() => {
      if (window.google) {
        setGsiReady(true);
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
  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveTx = (data) => {
    const txs = Array.isArray(data) ? data : [data];
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
        if (idx > -1) next[idx] = sanitized;
        else next = [sanitized, ...next];
      });
      return next;
    });
    setAddTx(false);
    setEditTx(null);
    budgetCheckPending.current = true;
    notify("Transaction saved successfully");
  };

  const handleDeleteTx = (id) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, deleted: true, updatedAt: new Date().toISOString() } : t));
    setEditTx(null);
    notify("Transaction deleted successfully", "error");
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
      const file = await googleService.saveToDrive(CLIENT_ID, driveTokenRef, { transactions, categories, tags, accounts, budgets, rules });
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
      if (data.transactions) setTransactions(data.transactions);
      if (data.categories) setCategories(data.categories);
      if (data.tags) setTags(data.tags);
      if (data.accounts) setAccounts(data.accounts);
      if (data.budgets) setBudgets(data.budgets);
      if (data.rules) setRules(data.rules);
      if (file.modifiedTime) localStorage.setItem("expense_last_sync", new Date(file.modifiedTime).getTime().toString());
      notify("Data restored successfully");
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
      const localData = { transactions, categories, tags, accounts, budgets, rules, recurring };
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

      if (result.file?.modifiedTime) {
        localStorage.setItem("expense_last_sync", new Date(result.file.modifiedTime).getTime().toString());
      }

      // Clear offline queue
      clearQueue();

      notify(action === "merged" ? "Smart Merged & Synced ☁️" : "Saved to Cloud ☁️");
      setSyncStatus("synced");
    } catch(err) {
      notify(err.message, "error");
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
    const mo = transactions.filter(t => {
      if (t.deleted) return false;
      const d = new Date(t.date);
      return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });
    const income = mo.filter(t => t.txType === "Income").reduce((s, t) => s + t.amount, 0);
    const expense = mo.filter(t => t.txType === "Expense").reduce((s, t) => s + t.amount, 0);
    const invest = mo.filter(t => t.txType === "Investment").reduce((s, t) => s + t.amount, 0);
    const catMap = {};
    mo.forEach(t => {
      const c = categories.find(x => x.id === t.category)?.name || "Others";
      catMap[c] = (catMap[c] || 0) + t.amount;
    });
    return { income, expense, invest, catMap };
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
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, searchQ, filters]);

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (!ready) return <div style={{ background: C.bg, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>;

  if (!user) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="page-enter" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 36, padding: 56, textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>💰</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text }}>Expense tracker</h1>
        <p style={{ color: C.sub, marginBottom: 32 }}>Your private financial command center.</p>
        <div id="googleBtn"></div>
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
      />


      <main>
        {page === "dashboard" && <Dashboard {...{ user, transactions, categories, tags, accounts, stats, netWorth: nw, getDayFlow: (days) => getDayFlow(transactions, days), viewDate, setViewDate, onEditTx: setEditTx, onAddTx: () => setAddTx(true), onSave: handleSaveTx, onSmartSync: handleSmartSync, isSyncing: syncStatus === "pending", theme: C }} />}
        {page === "transactions" && <TransactionsPage {...{
          transactions, filteredTx, categories, tags, accounts, searchQ, setSearchQ, filters, setFilters,
          hasFilter: !!(filters.from || filters.to || filters.cats.length || filters.acc || filters.type || filters.cd || filters.tags.length),
          onShowFilters: () => setShowFilters(true),
          onShowUpload: () => setShowUpload(true),
          onExportCSV: () => exportCSV(filteredTx, categories, tags, accounts),
          onExportPDF: () => exportTransactionsPDF(filteredTx, categories, accounts, (m) => notify(m)),
          onEditTx: setEditTx,
          selectedTxIds, setSelectedTxIds,
          onDeleteBulk: () => {
            const now = new Date().toISOString();
            setTransactions(p => p.map(t => selectedTxIds.includes(t.id) ? { ...t, deleted: true, updatedAt: now } : t));
            setSelectedTxIds([]);
            notify("Items deleted successfully", "error");
          },
          onAdd: () => setAddTx(true),
          theme: C
        }} />}

        {page === "organize" && <OrganizePage {...{
          organizeTab, setOrganizeTab, 
          orgDate, setOrgDate, orgPeriodTab, setOrgPeriodTab,
          categories, transactions, tags, budgets, rules, DEF_CATS,
          onAddCat: () => setAddCat(true),
          onEditCat: (c) => setEditCat(c),
          onDeleteCat: (id) => {
            setCategories(p => p.filter(c => c.id !== id));
            notify("Category deleted successfully", "error");
          },
          onAddTag: () => setAddTag(true),
          onEditTag: (t) => setEditTag(t),
          onDeleteTag: (id) => {
            setTags(p => p.filter(x => x.id !== id));
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
             const count = runAllRules(transactions);
             notify(`Magic Wand applied rules to transactions`);
          },
          theme: C
        }} />}
        {page === "vault" && <VaultPage {...{
          accounts, transactions,
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
          onShowBackup: () => setShowBackup(true),
          onExportBackup: () => {
            const data = { transactions, categories, tags, accounts, budgets, rules };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Expense_Backup_${new Date().toISOString().split("T")[0]}.json`;
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
                  notify("Import Successful");
                } catch (err) { notify("Invalid file", "error"); }
              };
              reader.readAsText(file);
            };
            input.click();
          },
          onClearData: () => {
            if (window.confirm("CLEAR EVERYTHING?")) {
              setTransactions([]); setAccounts([]); setBudgets([]); setRules([]);
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
      />

      <Modal theme={C} open={addTx} onClose={() => setAddTx(false)} title="Add Transaction">
        <TxForm categories={categories} tags={tags} accounts={accounts} onSave={handleSaveTx} onClose={() => setAddTx(false)} theme={C} />
      </Modal>

      <Modal theme={C} open={!!editTx} onClose={() => setEditTx(null)} title="Edit Transaction">
        {editTx && <TxForm init={editTx} categories={categories} tags={tags} accounts={accounts} onSave={handleSaveTx} onDelete={handleDeleteTx} onClose={() => setEditTx(null)} theme={C} />}
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
            setCategories(p => {
              const idx = p.findIndex(x => x.id === c.id);
              if (idx > -1) return p.map(x => x.id === c.id ? c : x);
              return [c, ...p];
            });
            setAddCat(false);
            setEditCat(null);
            notify("Category created successfully");
          }}
        />
      </Modal>

      <Modal open={!!(addTag || editTag)} title={addTag ? "New Tag" : "Edit Tag"} onClose={() => { setAddTag(false); setEditTag(null); }} theme={C}>
        <TagForm
          editTag={editTag}
          theme={C}
          onCancel={() => { setAddTag(false); setEditTag(null); }}
          onSave={(t) => {
            setTags(p => {
              const idx = p.findIndex(x => x.id === t.id);
              if (idx > -1) return p.map(x => x.id === t.id ? t : x);
              return [t, ...p];
            });
            setAddTag(false);
            setEditTag(null);
            notify("Tag created successfully");
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
              : tags.filter(t => !budgets.some(b => b.tagId === t.id))
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
            setAccounts(p => {
              const idx = p.findIndex(x => x.id === acc.id);
              if (idx > -1) return p.map(x => x.id === acc.id ? acc : x);
              return [acc, ...p];
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
            setRecurring(p => {
              const idx = p.findIndex(x => x.id === tmpl.id);
              if (idx > -1) return p.map(x => x.id === tmpl.id ? { ...tmpl, updatedAt: new Date().toISOString() } : x);
              return [{ ...tmpl, updatedAt: new Date().toISOString() }, ...p];
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
        onImport={(txns) => {
          handleSaveTx(txns);
        }} 
        theme={C} 
        categories={categories}
        rules={rules}
      />

      <Modal theme={C} open={showFilters} onClose={() => setShowFilters(false)} title="Filter Transactions">
        <FilterModal 
          filters={filters} 
          setFilters={setFilters} 
          categories={categories} 
          tags={tags} 
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
