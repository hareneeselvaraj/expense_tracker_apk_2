import React from "react";
import { Ico } from "../components/ui/Ico.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { TxRow } from "../components/cards/TxRow.jsx";
import Icon from "../components/ui/Icon.jsx";
import { fmtAmt, toISO, dateRange, stepDate, periodLabel } from "../utils/format.js";
import { findExactDuplicates } from "../services/duplicateEngine.js";
import { DuplicatesPanel } from "../components/duplicates/DuplicatesPanel.jsx";

/* ── helpers ──────────────────────────────────────────────── */
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad2 = n => String(n).padStart(2, "0");
const isoDate = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const fmtDayHeader = (iso) => {
  try {
    const d = new Date(iso + "T00:00:00");
    return `${DAYS[d.getDay()].slice(0, 3)}, ${pad2(d.getDate())} ${MONTHS_SHORT[d.getMonth()]}`;
  } catch { return iso; }
};

/* ── component ───────────────────────────────────────────── */
export default function TransactionsPage({
  transactions,
  filteredTx,
  categories,
  tags,
  accounts,
  searchQ,
  setSearchQ,
  filters,
  setFilters,
  hasFilter,
  onShowFilters,
  onShowUpload,
  onExportCSV,
  onExportPDF,
  onEditTx,
  selectedTxIds,
  setSelectedTxIds,
  onDeleteBulk,
  onSoftDeleteBulk,
  onAdd,
  onContextDateChange,
  theme
}) {
  const C = theme;
  const [confirmBulkDelete, setConfirmBulkDelete] = React.useState(false);
  const [showDuplicates, setShowDuplicates] = React.useState(false);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [showScopeMenu, setShowScopeMenu] = React.useState(false);
  const dateRef = React.useRef(null);
  const exportRef = React.useRef(null);
  const scopeRef = React.useRef(null);

  /* ── tab state ───────────────────────────────────────── */
  const [activeTab, setActiveTab] = React.useState("daily"); // daily | weekly | monthly | yearly
  const [currentDate, setCurrentDate] = React.useState(new Date());

  /* ── Swipe navigation ─────────────────────────────── */
  const swipeRef = React.useRef(null);
  const touchDataRef = React.useRef({ startX: 0, startY: 0, endX: 0, endY: 0 });
  const minSwipeDistance = 50;
  const activeTabRef = React.useRef(activeTab);
  React.useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  React.useEffect(() => {
    const el = swipeRef.current;
    if (!el) return;

    const handleStart = (e) => {
      touchDataRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        endX: e.touches[0].clientX,
        endY: e.touches[0].clientY,
      };
    };

    const handleMove = (e) => {
      touchDataRef.current.endX = e.touches[0].clientX;
      touchDataRef.current.endY = e.touches[0].clientY;

      const dx = Math.abs(touchDataRef.current.startX - touchDataRef.current.endX);
      const dy = Math.abs(touchDataRef.current.startY - touchDataRef.current.endY);
      // If horizontal motion dominates, prevent default scroll
      if (dx > dy && dx > 10) {
        e.preventDefault();
      }
    };

    const handleEnd = () => {
      const { startX, startY, endX, endY } = touchDataRef.current;
      const distanceX = startX - endX;
      const distanceY = startY - endY;

      if (Math.abs(distanceY) > Math.abs(distanceX)) return;

      const tabs = ["daily", "weekly", "monthly", "yearly"];
      const currIdx = tabs.indexOf(activeTabRef.current);

      if (distanceX > minSwipeDistance && currIdx < tabs.length - 1) {
        setActiveTab(tabs[currIdx + 1]);
      } else if (distanceX < -minSwipeDistance && currIdx > 0) {
        setActiveTab(tabs[currIdx - 1]);
      }
    };

    el.addEventListener("touchstart", handleStart, { passive: true });
    el.addEventListener("touchmove", handleMove, { passive: false });
    el.addEventListener("touchend", handleEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleStart);
      el.removeEventListener("touchmove", handleMove);
      el.removeEventListener("touchend", handleEnd);
    };
  }, []);

  React.useEffect(() => {
    if (activeTab === "daily" && onContextDateChange) {
      onContextDateChange(isoDate(currentDate));
    } else if (onContextDateChange) {
      onContextDateChange(null);
    }
  }, [activeTab, currentDate, onContextDateChange]);

  // Only detect exact duplicates
  const dupeCount = React.useMemo(() => {
    const groups = findExactDuplicates(transactions);
    return groups.reduce((sum, g) => g.length - 1 + sum, 0);
  }, [transactions]);

  // Close menus when clicking outside
  React.useEffect(() => {
    if (!showExportMenu && !showScopeMenu) return;
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false);
      if (scopeRef.current && !scopeRef.current.contains(e.target)) setShowScopeMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu, showScopeMenu]);

  /* ── scope mapping from tab ────────────────────────── */
  const scopeMap = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };
  const scope = scopeMap[activeTab];

  /* ── compute date range for current scope ──────────── */
  const scopeRange = React.useMemo(() => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth(), d = currentDate.getDate();
    if (scope === "day") {
      const iso = isoDate(currentDate);
      return [iso, iso];
    }
    if (scope === "week") {
      const day = currentDate.getDay();
      const diff = day === 0 ? -6 : 1 - day; // Monday start
      const mon = new Date(currentDate);
      mon.setDate(mon.getDate() + diff);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return [isoDate(mon), isoDate(sun)];
    }
    if (scope === "month") {
      return [`${y}-${pad2(m + 1)}-01`, `${y}-${pad2(m + 1)}-${pad2(new Date(y, m + 1, 0).getDate())}`];
    }
    return [`${y}-01-01`, `${y}-12-31`];
  }, [scope, currentDate]);

  /* ── filtered transactions within scope ────────────── */
  const timeTx = React.useMemo(() => {
    const [from, to] = scopeRange;
    return filteredTx.filter(t => t.date >= from && t.date <= to);
  }, [filteredTx, scopeRange]);

  /* ── step date helpers ─────────────────────────────── */
  const stepScope = (dir) => {
    const d = new Date(currentDate);
    if (scope === "day") d.setDate(d.getDate() + dir);
    else if (scope === "week") d.setDate(d.getDate() + dir * 7);
    else if (scope === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCurrentDate(d);
  };

  /* ── helper: is this a credit/income transaction? ──── */
  const isCredit = (t) => t.creditDebit === "Credit" || t.txType === "Income";

  /* ── carry-forward balance (all tx before current scope) ── */
  const cfBalance = React.useMemo(() => {
    const before = scopeRange[0];
    return filteredTx
      .filter(t => t.date < before)
      .reduce((s, t) => s + (isCredit(t) ? t.amount : -t.amount), 0);
  }, [filteredTx, scopeRange]);

  /* ── credit / debit splits ─────────────────────────── */
  const credits = React.useMemo(() => timeTx.filter(t => isCredit(t)), [timeTx]);
  const debits = React.useMemo(() => timeTx.filter(t => !isCredit(t)), [timeTx]);
  const totalCredit = credits.reduce((s, t) => s + t.amount, 0);
  const totalDebit = debits.reduce((s, t) => s + t.amount, 0);
  const balance = cfBalance + totalCredit - totalDebit;

  /* ── group by date (for monthly view) ──────────────── */
  const grouped = React.useMemo(() => {
    const map = {};
    timeTx.forEach(t => {
      const key = t.date;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [timeTx]);

  /* ── group by month (for yearly view) ──────────────── */
  const monthlyGroups = React.useMemo(() => {
    const map = {};
    timeTx.forEach(t => {
      const m = t.date.slice(0, 7); // YYYY-MM
      if (!map[m]) map[m] = { credit: 0, debit: 0 };
      if (isCredit(t)) map[m].credit += t.amount;
      else map[m].debit += t.amount;
    });
    // Return only months that have transactions
    const y = currentDate.getFullYear();
    const result = [];
    for (let i = 0; i < 12; i++) {
      const key = `${y}-${pad2(i + 1)}`;
      const data = map[key];
      if (data) {
        result.push({ month: MONTHS_SHORT[i], monthIndex: i, key, ...data, balance: data.credit - data.debit });
      }
    }
    return result;
  }, [timeTx, currentDate]);

  /* ── styles ────────────────────────────────────────── */
  const sectionHeaderStyle = {
    padding: "8px 12px",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 0,
    marginTop: 0,
    borderBottom: `1px solid ${C.borderLight}`,
  };

  const compactRowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderBottom: `1px solid ${C.borderLight}`,
    cursor: "pointer",
    transition: "background .15s",
    gap: 10,
  };

  /* ── period label ──────────────────────────────────── */
  const getPeriodLabel = () => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth(), d = currentDate.getDate();
    if (scope === "day") {
      return (
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: C.text }}>{pad2(d)}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>{MONTHS_SHORT[m]} • {DAYS[currentDate.getDay()].slice(0, 3)}</span>
        </div>
      );
    }
    if (scope === "week") {
      const fmtShort = d => {
        const dt = new Date(d + "T00:00:00");
        return `${pad2(dt.getDate())} ${MONTHS_SHORT[dt.getMonth()]}`;
      };
      return <span style={{ fontSize: 13, fontWeight: 800, color: C.text, flex: 1, textAlign: "center" }}>{fmtShort(scopeRange[0])} — {fmtShort(scopeRange[1])}</span>;
    }
    if (scope === "month") {
      return <span style={{ fontSize: 14, fontWeight: 800, color: C.text, flex: 1, textAlign: "center" }}>{MONTHS_FULL[m]} {y}</span>;
    }
    return <span style={{ fontSize: 14, fontWeight: 800, color: C.text, flex: 1, textAlign: "center" }}>{y}</span>;
  };

  /* ── render compact transaction row ────────────────── */
  const renderCompactRow = (t, showIcon = false) => {
    const cat = categories.find(c => c.id === t.category);
    const isSelected = selectedTxIds.includes(t.id);
    return (
      <div
        key={t.id}
        style={{
          ...compactRowStyle,
          background: isSelected ? C.primaryDim : "transparent",
        }}
        onClick={() => onEditTx(t)}
        onContextMenu={(e) => { e.preventDefault(); setSelectedTxIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]); }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          {selectedTxIds.length > 0 && (
            <div onClick={(e) => { e.stopPropagation(); setSelectedTxIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]); }} style={{
              width: 18, height: 18, borderRadius: 5, border: `2px solid ${isSelected ? C.primary : C.borderLight}`,
              background: isSelected ? C.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
            }}>
              {isSelected && <Ico n="check" sz={10} c="#fff" />}
            </div>
          )}
          {showIcon && (
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: cat?.color ? cat.color + "18" : C.income + "18",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {cat?.icon ? <Icon name={cat.icon} size={16} color={cat?.color || C.income} /> : <span style={{ fontSize: 14 }}>💳</span>}
            </div>
          )}
          <span style={{ fontSize: 14, color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.description}
          </span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, flexShrink: 0 }}>
          {t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    );
  };

  const glassCardStyle = {
    background: C.surface,
    border: `1px solid ${C.borderLight}`,
    borderRadius: 12,
    overflow: "hidden"
  };

  /* ═══════════════════════════════════════════════════ */
  /* ── DAILY VIEW ─────────────────────────────────── */
  /* ═══════════════════════════════════════════════════ */
  const renderDailyView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* C/F & Balance row */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderBottom: `1px solid ${C.borderLight}`, background: C.surface }}>
        <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.sub }}>C/F:</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{fmtAmt(cfBalance)}</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.sub }}>Bal:</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{fmtAmt(balance)}</span>
        </div>
      </div>

      {timeTx.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: C.sub, fontSize: 13 }}>No transactions for this day.</div>
      ) : (
        <div style={{ ...glassCardStyle }}>
          {/* Income (Credit) Section */}
          {credits.length > 0 && (
            <>
              <div style={{ ...sectionHeaderStyle, background: C.income + "20" }}>
                <span style={{ color: C.income }}>Income (Credit)</span>
                <span style={{ color: C.income }}>{fmtAmt(totalCredit)}</span>
              </div>
              {credits.map(t => renderCompactRow(t, false))}
            </>
          )}

          {/* Expense (Debit) Section */}
          {debits.length > 0 && (
            <>
              <div style={{ ...sectionHeaderStyle, background: C.expense + "15" }}>
                <span style={{ color: C.expense }}>Expense (Debit)</span>
                <span style={{ color: C.expense }}>{fmtAmt(totalDebit)}</span>
              </div>
              {debits.map(t => renderCompactRow(t, true))}
            </>
          )}
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════ */
  /* ── MONTHLY VIEW ───────────────────────────────── */
  /* ═══════════════════════════════════════════════════ */
  const renderMonthlyView = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Summary card */}
        <div style={{
          ...glassCardStyle, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, overflow: "visible",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub }}>Total Income (Credit)</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{fmtAmt(totalCredit)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub }}>Total Expense (Debit)</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{fmtAmt(totalDebit)}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.borderLight}`, paddingTop: 6 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.sub }}>C/F</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtAmt(cfBalance)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.sub }}>Balance</span>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{fmtAmt(balance)}</div>
            </div>
          </div>
        </div>

        {/* Day-wise cards */}
        {grouped.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.sub, fontSize: 13 }}>No transactions this month.</div>
        ) : grouped.map(([date, txs]) => {
          const dayCr = txs.filter(t => isCredit(t));
          const dayDb = txs.filter(t => !isCredit(t));
          const dayTotalCr = dayCr.reduce((s, t) => s + t.amount, 0);
          const dayTotalDb = dayDb.reduce((s, t) => s + t.amount, 0);
          // Compute running balance up to and including this date
          const dayBalance = cfBalance + filteredTx
            .filter(t => t.date <= date && t.date >= scopeRange[0])
            .reduce((s, t) => s + (isCredit(t) ? t.amount : -t.amount), 0);

          return (
            <div key={date} style={{
              ...glassCardStyle, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, overflow: "visible",
            }}>
              {/* Date header */}
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 800, color: C.text, paddingBottom: 6, borderBottom: `1px solid ${C.borderLight}` }}>
                {fmtDayHeader(date)}
              </div>

              {/* Two columns: Income | Expense */}
              <div style={{ display: "flex", gap: 8 }}>
                {/* Left — Income */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, marginBottom: 4 }}>Income (Credit)</div>
                  {dayCr.length > 0 ? dayCr.map(t => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", cursor: "pointer", fontSize: 11 }} onClick={() => onEditTx(t)}>
                      <span style={{ color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 4, flex: 1 }}>{t.description}</span>
                      <span style={{ fontWeight: 700, color: C.text, flexShrink: 0 }}>{t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )) : <div style={{ fontSize: 10, color: C.sub, fontStyle: "italic" }}>—</div>}
                  {dayCr.length > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.income, paddingTop: 2 }}>{fmtAmt(dayTotalCr)}</div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ width: 1, background: C.borderLight }} />

                {/* Right — Expense */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, marginBottom: 4 }}>Expense (Debit)</div>
                  {dayDb.length > 0 ? dayDb.map(t => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", cursor: "pointer", fontSize: 11 }} onClick={() => onEditTx(t)}>
                      <span style={{ color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 4, flex: 1 }}>{t.description}</span>
                      <span style={{ fontWeight: 700, color: C.text, flexShrink: 0 }}>{t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )) : <div style={{ fontSize: 10, color: C.sub, fontStyle: "italic" }}>—</div>}
                  {dayDb.length > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.expense, paddingTop: 2, textAlign: "right" }}>{fmtAmt(dayTotalDb)}</div>
                  )}
                </div>
              </div>

              {/* Day balance */}
              <div style={{ textAlign: "right", borderTop: `1px solid ${C.borderLight}`, paddingTop: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.sub }}>Balance</span>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{fmtAmt(dayBalance)}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════ */
  /* ── YEARLY VIEW ────────────────────────────────── */
  /* ═══════════════════════════════════════════════════ */
  const renderYearlyView = () => {
    let runningBalance = cfBalance;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ ...glassCardStyle, padding: 0 }}>
          {/* Table header */}
          <div style={{ display: "flex", padding: "12px 10px", borderBottom: `2px solid ${C.borderLight}` }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.sub }}></span>
            <span style={{ width: 90, fontSize: 11, fontWeight: 700, color: C.sub, textAlign: "right" }}>Income (Credit)</span>
            <span style={{ width: 90, fontSize: 11, fontWeight: 700, color: C.sub, textAlign: "right" }}>Expense (Debit)</span>
            <span style={{ width: 90, fontSize: 11, fontWeight: 700, color: C.sub, textAlign: "right" }}>Balance</span>
          </div>

          {/* C/F row */}
          <div style={{ display: "flex", padding: "10px", borderBottom: `1px solid ${C.borderLight}`, background: C.isGlass ? "rgba(255,255,255,0.03)" : C.muted }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.sub }}>C/F</span>
            <span style={{ width: 90, fontSize: 12, fontWeight: 700, color: C.text, textAlign: "right" }}></span>
            <span style={{ width: 90, fontSize: 12, fontWeight: 700, color: C.text, textAlign: "right" }}></span>
            <span style={{ width: 90, fontSize: 12, fontWeight: 700, color: C.text, textAlign: "right" }}>{fmtAmt(cfBalance)}</span>
          </div>

        {/* Month rows */}
        {monthlyGroups.map((mg, i) => {
          runningBalance += mg.credit - mg.debit;
          const hasData = mg.credit > 0 || mg.debit > 0;
          return (
            <div
              key={mg.key}
              style={{
                display: "flex", padding: "7px 10px",
                borderBottom: `1px solid ${C.borderLight}`,
                cursor: hasData ? "pointer" : "default",
                transition: "background .15s",
              }}
              onClick={() => {
                if (hasData) {
                  setActiveTab("monthly");
                  setCurrentDate(new Date(currentDate.getFullYear(), mg.monthIndex, 1));
                }
              }}
              onMouseEnter={e => { if (hasData) e.currentTarget.style.background = C.muted; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.text }}>{mg.month}</span>
              <span style={{ width: 90, fontSize: 12, fontWeight: 600, color: hasData ? C.text : C.sub, textAlign: "right" }}>
                {mg.credit > 0 ? mg.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
              </span>
              <span style={{ width: 90, fontSize: 12, fontWeight: 600, color: hasData ? C.text : C.sub, textAlign: "right" }}>
                {mg.debit > 0 ? mg.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
              </span>
              <span style={{ width: 90, fontSize: 12, fontWeight: 700, color: hasData ? C.text : C.sub, textAlign: "right" }}>
                {hasData ? runningBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
              </span>
            </div>
          );
        })}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════ */
  /* ── MAIN RENDER ────────────────────────────────── */
  /* ═══════════════════════════════════════════════════ */
  return (
    <div ref={swipeRef} className="page-enter" style={{ padding: "0 0 100px 0", display: "flex", flexDirection: "column", gap: 0, minHeight: "100dvh" }}>

      {/* ── Search & Actions ─────────────────────────── */}
      <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "6px 12px 4px" }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search…"
          style={{
            flex: 1, minWidth: 0, height: 30, boxSizing: "border-box",
            background: C.input, border: `1px solid ${C.borderLight}`, borderRadius: 8,
            padding: "0 10px", color: C.text, fontSize: 12, fontWeight: 500,
            outline: "none", fontFamily: "inherit",
          }}
        />
        {[
          { action: onShowFilters, icon: "filter", active: hasFilter },
          { action: onShowUpload, icon: "upload" },
        ].map(({ action, icon, active }, i) => (
          <button key={i} onClick={action} style={{
            width: 30, height: 30, flexShrink: 0, border: "none",
            background: active ? C.primary : C.input, borderRadius: 8, padding: 0,
            color: active ? "#fff" : C.sub, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Ico n={icon} sz={13} />
          </button>
        ))}
        <div ref={exportRef} style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => setShowExportMenu(p => !p)} style={{
            width: 30, height: 30, background: C.input, border: "none",
            borderRadius: 8, padding: 0, color: C.sub, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Ico n="down" sz={13} />
          </button>
          {showExportMenu && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 500,
              background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12,
              padding: 4, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              display: "flex", flexDirection: "column", gap: 2, animation: "fadeIn 0.15s ease",
            }}>
              {[
                { label: "📊 CSV (Excel)", fn: onExportCSV },
                { label: "📄 PDF Report", fn: onExportPDF },
              ].map(({ label, fn }, i) => (
                <button key={i} onClick={() => { fn(); setShowExportMenu(false); }} style={{
                  background: "transparent", border: "none", borderRadius: 8,
                  padding: "8px 12px", color: C.text, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs (Pill style) ───────────────────────── */}
      <div style={{ padding: "4px 12px 8px", background: C.isGlass ? "rgba(255, 255, 255, 0)" : C.bg }}>
        <div style={{
          display: "flex",
          background: C.isGlass ? "rgba(255, 255, 255, 0)" : C.input,
          border: C.isGlass ? "1px solid rgba(255, 255, 255, 0)" : "none",
          borderRadius: 30,
          padding: 4,
          gap: 2,
          alignItems: "center"
        }}>
          {["daily", "weekly", "monthly", "yearly"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, border: "none", padding: "8px 0", cursor: "pointer",
              fontSize: 10, fontWeight: 800, fontFamily: "inherit",
              textTransform: "uppercase", letterSpacing: "0.05em",
              color: activeTab === tab ? "#fff" : (C.isGlass ? "rgba(255,255,255,0.75)" : C.sub),
              background: activeTab === tab ? C.primary : "transparent",
              borderRadius: 25, transition: "all .2s",
            }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Date nav + info row (85/15 split) ──────── */}
      <div style={{
        display: "flex", alignItems: "center", padding: "6px 12px",
        borderBottom: `1px solid ${C.borderLight}`,
      }}>
        {/* 85% — date navigation + balance */}
        <div style={{ width: "85%", display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <button onClick={() => stepScope(-1)} style={{
            width: 26, height: 26, border: "none", background: C.input, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.sub, cursor: "pointer", flexShrink: 0,
          }}>
            <Ico n="chevronLeft" sz={12} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>{getPeriodLabel()}</div>

          <button onClick={() => stepScope(1)} style={{
            width: 26, height: 26, border: "none", background: C.input, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.sub, cursor: "pointer", flexShrink: 0,
          }}>
            <Ico n="chevronRight" sz={12} />
          </button>

          {scope === "day" && (
            <span style={{
              fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
              color: balance >= 0 ? C.income : C.expense,
              background: (balance >= 0 ? C.income : C.expense) + "12",
              flexShrink: 0,
            }}>{fmtAmt(balance)}</span>
          )}
        </div>

        {/* 15% — entries count + select */}
        <div style={{ width: "15%", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          {(() => {
            const allSelected = timeTx.length > 0 && timeTx.every(t => selectedTxIds.includes(t.id));
            return timeTx.length > 0 ? (
              <div onClick={() => {
                const ids = timeTx.map(t => t.id);
                setSelectedTxIds(allSelected ? selectedTxIds.filter(id => !ids.includes(id)) : [...new Set([...selectedTxIds, ...ids])]);
              }} style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0, cursor: "pointer",
                border: `2px solid ${allSelected ? C.primary : C.border}`,
                background: allSelected ? C.primary : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {allSelected && <Ico n="check" sz={8} c="#000" />}
              </div>
            ) : null;
          })()}
          <span style={{ color: C.sub, fontSize: 10, fontWeight: 700 }}>{timeTx.length}</span>
          {dupeCount > 0 && (
            <span onClick={() => setShowDuplicates(true)} style={{
              color: C.warning, fontSize: 9, fontWeight: 800, cursor: "pointer",
            }}>⚠</span>
          )}
        </div>
      </div>

      {/* ── View content ─────────────────────────────── */}
      <div style={{ padding: "0 10px", flex: 1 }}>
        {activeTab === "daily" && renderDailyView()}
        {activeTab === "weekly" && renderMonthlyView()}
        {activeTab === "monthly" && renderMonthlyView()}
        {activeTab === "yearly" && renderYearlyView()}
      </div>



      {/* ── Bulk Actions Floating Bar ─────────────── */}
      {selectedTxIds.length > 0 && (
        <div style={{
          position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 40px)", maxWidth: 500,
          background: C.surface, color: C.text, borderRadius: 24, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: C.shadow, zIndex: 400, border: `1px solid ${C.borderLight}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: C.primaryDim, color: C.primary, width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>
              {selectedTxIds.length}
            </div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Selected</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {confirmBulkDelete ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.expense }}>Delete?</span>
                <button onClick={() => { onDeleteBulk(); setConfirmBulkDelete(false); }} style={{ background: C.expense, border: "none", borderRadius: 12, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Yes</button>
                <button onClick={() => setConfirmBulkDelete(false)} style={{ background: C.input, border: "none", borderRadius: 12, padding: "8px 16px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>No</button>
              </div>
            ) : (
              <>
                <button onClick={() => setSelectedTxIds([])} style={{ background: C.input, border: "none", borderRadius: 12, padding: "8px 16px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Clear</button>
                <button onClick={() => setConfirmBulkDelete(true)} style={{ background: C.expense + "22", border: `1px solid ${C.expense}40`, borderRadius: 12, padding: "8px 16px", color: C.expense, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Ico n="trash" sz={14} c={C.expense} /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <DuplicatesPanel
        open={showDuplicates}
        onClose={() => setShowDuplicates(false)}
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        onDelete={(ids) => {
          if (onSoftDeleteBulk) onSoftDeleteBulk(ids);
        }}
        theme={C}
      />
    </div>
  );
}
