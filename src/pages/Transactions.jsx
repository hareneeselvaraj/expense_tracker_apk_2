import React from "react";
import { Ico } from "../components/ui/Ico.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { TxRow } from "../components/cards/TxRow.jsx";
import Icon from "../components/ui/Icon.jsx";
import { fmtAmt, toISO, dateRange, stepDate, periodLabel } from "../utils/format.js";
import { findExactDuplicates } from "../services/duplicateEngine.js";
import { DuplicatesPanel } from "../components/duplicates/DuplicatesPanel.jsx";

/* ── helpers ──────────────────────────────────────────────── */
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const pad2 = n => String(n).padStart(2, "0");
const isoDate = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

const fmtDayHeader = (iso) => {
  try {
    const d = new Date(iso + "T00:00:00");
    return `${DAYS[d.getDay()].slice(0,3)}, ${pad2(d.getDate())} ${MONTHS_SHORT[d.getMonth()]}`;
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
      return [`${y}-${pad2(m+1)}-01`, `${y}-${pad2(m+1)}-${pad2(new Date(y, m+1, 0).getDate())}`];
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
      const key = `${y}-${pad2(i+1)}`;
      const data = map[key];
      if (data) {
        result.push({ month: MONTHS_SHORT[i], monthIndex: i, key, ...data, balance: data.credit - data.debit });
      }
    }
    return result;
  }, [timeTx, currentDate]);

  /* ── styles ────────────────────────────────────────── */
  const teal = "#5bb5a2";
  const tealLight = "#e8f5f1";
  const sectionHeaderStyle = {
    background: tealLight,
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
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: C.text }}>{pad2(d)}</span>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>{MONTHS_FULL[m]}, {y}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.sub }}>{DAYS[currentDate.getDay()]}</span>
          </div>
        </div>
      );
    }
    if (scope === "week") {
      const fmtShort = d => {
        const dt = new Date(d + "T00:00:00");
        return `${pad2(dt.getDate())} ${MONTHS_SHORT[dt.getMonth()]}`;
      };
      return <span style={{ fontSize: 14, fontWeight: 800, color: C.text, flex: 1, textAlign: "center" }}>{fmtShort(scopeRange[0])} — {fmtShort(scopeRange[1])}, {y}</span>;
    }
    if (scope === "month") {
      return <span style={{ fontSize: 16, fontWeight: 800, color: C.text, flex: 1, textAlign: "center" }}>{MONTHS_FULL[m]} {y}</span>;
    }
    return <span style={{ fontSize: 16, fontWeight: 800, color: C.text, flex: 1, textAlign: "center" }}>{y}</span>;
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
              background: cat?.color ? cat.color + "18" : tealLight,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {cat?.icon ? <Icon name={cat.icon} size={16} color={cat?.color || teal} /> : <span style={{ fontSize: 14 }}>💳</span>}
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

  /* ═══════════════════════════════════════════════════ */
  /* ── DAILY VIEW ─────────────────────────────────── */
  /* ═══════════════════════════════════════════════════ */
  const renderDailyView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* C/F row */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: `1px solid ${C.borderLight}` }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>C/F</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtAmt(cfBalance)}</span>
      </div>

      {timeTx.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: C.sub, fontSize: 13 }}>No transactions for this day.</div>
      ) : (
        <>
          {/* Income (Credit) Section */}
          {credits.length > 0 && (
            <>
              <div style={{ ...sectionHeaderStyle, background: C.income + "15" }}>
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
        </>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════ */
  /* ── MONTHLY VIEW ───────────────────────────────── */
  /* ═══════════════════════════════════════════════════ */
  const renderMonthlyView = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Summary card */}
        <div style={{
          background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12,
          padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
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
              background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12,
              padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
            }}>
              {/* Date header */}
              <div style={{ textAlign: "center", fontSize: 14, fontWeight: 800, color: C.text, paddingBottom: 6, borderBottom: `1px solid ${C.borderLight}` }}>
                {fmtDayHeader(date)}
              </div>

              {/* Two columns: Income | Expense */}
              <div style={{ display: "flex", gap: 8 }}>
                {/* Left — Income */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 4 }}>Income (Credit)</div>
                  {dayCr.length > 0 ? dayCr.map(t => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", cursor: "pointer", fontSize: 12 }} onClick={() => onEditTx(t)}>
                      <span style={{ color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 4, flex: 1 }}>{t.description}</span>
                      <span style={{ fontWeight: 700, color: C.text, flexShrink: 0 }}>{t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )) : <div style={{ fontSize: 11, color: C.sub, fontStyle: "italic" }}>—</div>}
                  {dayCr.length > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 800, color: teal, paddingTop: 2 }}>{fmtAmt(dayTotalCr)}</div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ width: 1, background: C.borderLight }} />

                {/* Right — Expense */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 4 }}>Expense (Debit)</div>
                  {dayDb.length > 0 ? dayDb.map(t => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", cursor: "pointer", fontSize: 12 }} onClick={() => onEditTx(t)}>
                      <span style={{ color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 4, flex: 1 }}>{t.description}</span>
                      <span style={{ fontWeight: 700, color: C.text, flexShrink: 0 }}>{t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )) : <div style={{ fontSize: 11, color: C.sub, fontStyle: "italic" }}>—</div>}
                  {dayDb.length > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 800, color: teal, paddingTop: 2, textAlign: "right" }}>{fmtAmt(dayTotalDb)}</div>
                  )}
                </div>
              </div>

              {/* Day balance */}
              <div style={{ textAlign: "right", borderTop: `1px solid ${C.borderLight}`, paddingTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.sub }}>Balance</span>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{fmtAmt(dayBalance)}</div>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Table header */}
        <div style={{ display: "flex", padding: "8px 10px", borderBottom: `2px solid ${C.borderLight}` }}>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.sub }}></span>
          <span style={{ width: 90, fontSize: 11, fontWeight: 700, color: C.sub, textAlign: "right" }}>Income (Credit)</span>
          <span style={{ width: 90, fontSize: 11, fontWeight: 700, color: C.sub, textAlign: "right" }}>Expense (Debit)</span>
          <span style={{ width: 90, fontSize: 11, fontWeight: 700, color: C.sub, textAlign: "right" }}>Balance</span>
        </div>

        {/* C/F row */}
        <div style={{ display: "flex", padding: "6px 10px", borderBottom: `1px solid ${C.borderLight}`, background: tealLight }}>
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
              onMouseEnter={e => { if (hasData) e.currentTarget.style.background = C.muted || tealLight; }}
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
    );
  };

  /* ═══════════════════════════════════════════════════ */
  /* ── MAIN RENDER ────────────────────────────────── */
  /* ═══════════════════════════════════════════════════ */
  return (
    <div className="page-enter" style={{ padding: "0 0 100px 0", display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Existing Search & Actions bar ─────────────── */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "12px 16px 8px" }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search…" style={{ flex: 1, minWidth: 0, background: C.surface, borderWidth: 1, borderStyle: "solid", borderColor: C.borderLight, borderRadius: 12, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }} />

        <button onClick={onShowFilters} style={{ width: 36, height: 36, flexShrink: 0, background: hasFilter ? C.primary : C.surface, border: `1px solid ${hasFilter ? C.primary : C.borderLight}`, borderRadius: 12, padding: 0, color: hasFilter ? "#fff" : C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", transition: "all .2s" }}>
          <Ico n="filter" sz={18} />
        </button>

        <button onClick={onShowUpload} style={{ width: 36, height: 36, flexShrink: 0, background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 0, color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", transition: "all .2s" }}>
          <Ico n="upload" sz={18} />
        </button>

        <div ref={exportRef} style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => setShowExportMenu(p => !p)} style={{ width: 36, height: 36, background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 0, color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", transition: "all .2s" }}>
            <Ico n="down" sz={18} />
          </button>
          {showExportMenu && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 500,
              background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 14,
              padding: 6, minWidth: 150, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              display: "flex", flexDirection: "column", gap: 2,
              animation: "fadeIn 0.15s ease"
            }}>
              <button onClick={() => { onExportCSV(); setShowExportMenu(false); }} style={{
                background: "transparent", border: "none", borderRadius: 10,
                padding: "10px 14px", color: C.text, fontSize: 13, fontWeight: 700,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 8,
                transition: "background .15s"
              }}
                onMouseEnter={e => e.currentTarget.style.background = C.input}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                📊 CSV (Excel)
              </button>
              <button onClick={() => { onExportPDF(); setShowExportMenu(false); }} style={{
                background: "transparent", border: "none", borderRadius: 10,
                padding: "10px 14px", color: C.text, fontSize: 13, fontWeight: 700,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 8,
                transition: "background .15s"
              }}
                onMouseEnter={e => e.currentTarget.style.background = C.input}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                📄 PDF Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── DAILY / MONTHLY / YEARLY Tabs ────────────── */}
      <div style={{
        display: "flex", borderBottom: `2px solid ${C.borderLight}`, margin: "0 16px",
      }}>
        {["daily", "weekly", "monthly", "yearly"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, background: "transparent", border: "none",
              padding: "10px 0 8px", cursor: "pointer",
              fontSize: 13, fontWeight: 800, fontFamily: "inherit",
              textTransform: "uppercase", letterSpacing: "0.04em",
              color: activeTab === tab ? teal : C.sub,
              borderBottom: activeTab === tab ? `3px solid ${teal}` : "3px solid transparent",
              transition: "all .2s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Period navigator ─────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        borderBottom: `1px solid ${C.borderLight}`,
      }}>
        <button onClick={() => stepScope(-1)} style={{
          background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 10,
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          color: C.sub, cursor: "pointer", flexShrink: 0, transition: "transform .2s",
        }}>
          <Ico n="chevronLeft" sz={16} />
        </button>

        {getPeriodLabel()}

        {scope === "day" && (
          <div style={{ textAlign: "right", marginRight: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.sub }}>Balance</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{fmtAmt(balance)}</div>
          </div>
        )}

        <button onClick={() => stepScope(1)} style={{
          background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 10,
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          color: C.sub, cursor: "pointer", flexShrink: 0, transition: "transform .2s",
        }}>
          <Ico n="chevronRight" sz={16} />
        </button>
      </div>

      {/* ── Items count & duplicates ─────────────────── */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", padding: "6px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {timeTx.length > 0 && (
            <div onClick={() => {
              const allFilteredIds = timeTx.map(t => t.id);
              const isAllSelected = allFilteredIds.every(id => selectedTxIds.includes(id));
              if (isAllSelected) {
                setSelectedTxIds(selectedTxIds.filter(id => !allFilteredIds.includes(id)));
              } else {
                setSelectedTxIds([...new Set([...selectedTxIds, ...allFilteredIds])]);
              }
            }} style={{
              width: 20, height: 20, borderRadius: 6, border: `2px solid ${timeTx.every(t => selectedTxIds.includes(t.id)) ? C.primary : C.border}`,
              background: timeTx.every(t => selectedTxIds.includes(t.id)) ? C.primary : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s"
            }}>
              {timeTx.every(t => selectedTxIds.includes(t.id)) && <Ico n="check" sz={12} c="#000" />}
            </div>
          )}
          <span style={{ color: C.sub, fontSize: 12, fontWeight: 700 }}>{timeTx.length} items</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {(() => {
            const unreviewedCount = timeTx.filter(t => t.source === "sms" && t.status === "unreviewed").length;
            return unreviewedCount > 0 ? (
              <button onClick={() => {
                // Mark all SMS transactions in current view as reviewed
                const smsIds = timeTx.filter(t => t.source === "sms" && t.status === "unreviewed").map(t => t.id);
                smsIds.forEach(id => onEditTx?.({ id, status: "reviewed" }));
              }} style={{
                background: C.primary + "22",
                border: `1px solid ${C.primary}`,
                borderRadius: 99, padding: "4px 10px", color: C.primary,
                fontSize: 11, fontWeight: 800, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6
              }}>
                📱 {unreviewedCount} SMS
              </button>
            ) : null;
          })()}
          {dupeCount > 0 && (
            <button onClick={() => setShowDuplicates(true)} style={{
              background: C.warning + "22" || C.expense + "22",
              border: `1px solid ${C.warning || C.expense}`,
              borderRadius: 99, padding: "4px 10px", color: C.warning || C.expense,
              fontSize: 11, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6
            }}>
              ⚠️ {dupeCount} duplicates
            </button>
          )}
        </div>
      </div>

      {/* ── View content ─────────────────────────────── */}
      <div style={{ padding: "0 16px" }}>
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
