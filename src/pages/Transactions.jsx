import React from "react";
import { Ico } from "../components/ui/Ico.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { TxRow } from "../components/cards/TxRow.jsx";
import { fmtAmt, toISO, dateRange, stepDate, periodLabel } from "../utils/format.js";
import { findExactDuplicates } from "../services/duplicateEngine.js";
import { DuplicatesPanel } from "../components/duplicates/DuplicatesPanel.jsx";



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

  // Only detect exact duplicates (same date + same amount + same description)
  // This prevents recurring auto-payments from being falsely flagged
  const dupeCount = React.useMemo(() => {
    const groups = findExactDuplicates(transactions);
    return groups.reduce((sum, g) => g.length - 1 + sum, 0);
  }, [transactions]);

  // Close menus when clicking outside
  React.useEffect(() => {
    if (!showExportMenu && !showScopeMenu) return;
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
      if (scopeRef.current && !scopeRef.current.contains(e.target)) {
        setShowScopeMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu, showScopeMenu]);

  /* ── time scope state ──────────────────────────────────── */
  const [scope, setScope] = React.useState("month");        // "all" | "week" | "month" | "year"
  const [scopeDate, setScopeDate] = React.useState(new Date());

  /* ── apply time filter on top of filteredTx ────────────── */
  const timeTx = React.useMemo(() => {
    if (scope === "all") return filteredTx;
    const [from, to] = dateRange(scope, scopeDate);
    return filteredTx.filter(t => t.date >= from && t.date <= to);
  }, [filteredTx, scope, scopeDate]);

  /* ── group transactions by date ────────────────────────── */
  const grouped = React.useMemo(() => {
    const map = {};
    timeTx.forEach(t => {
      const key = t.date;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [timeTx]);

  const fmtGroupDate = iso => {
    try {
      const d = new Date(iso + "T00:00:00");
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (iso === toISO(today)) return "Today";
      if (iso === toISO(yesterday)) return "Yesterday";
      return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "2-digit" });
    } catch { return iso; }
  };

  return (
    <div className="page-enter" style={{ padding: "16px 16px 100px 16px", display: "flex", flexDirection: "column", gap: 8 }}>

      {/* ── Search & Actions bar ───────────────────────────── */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search…" style={{ flex: 1, minWidth: 0, background: C.surface, borderWidth: 1, borderStyle: "solid", borderColor: C.borderLight, borderRadius: 12, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }} />
        
        {/* Scope Dropdown */}
        <div ref={scopeRef} style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => setShowScopeMenu(p => !p)} style={{ width: 36, height: 36, background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 0, color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", transition: "all .2s" }}>
            <Ico n="calendar" sz={18} />
          </button>
          {showScopeMenu && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", zIndex: 500,
              background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 14,
              padding: 6, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              display: "flex", flexDirection: "column", gap: 2,
              animation: "fadeIn 0.15s ease"
            }}>
              {["all", "week", "month", "year"].map(t => (
                <button key={t} onClick={() => { setScope(t); if (t !== "all") setScopeDate(new Date()); setShowScopeMenu(false); }} style={{
                  background: scope === t ? C.primaryDim : "transparent",
                  border: "none", borderRadius: 10,
                  padding: "10px 14px", color: scope === t ? C.primary : C.text, fontSize: 13, fontWeight: 700,
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 8,
                  textTransform: "capitalize", transition: "background .15s"
                }}
                  onMouseEnter={e => e.currentTarget.style.background = scope === t ? C.primaryDim : C.input}
                  onMouseLeave={e => e.currentTarget.style.background = scope === t ? C.primaryDim : "transparent"}
                >
                  {t === "all" ? "📅 All Time" : t === "week" ? "📆 Week" : t === "month" ? "🗓️ Month" : "📊 Year"}
                </button>
              ))}
            </div>
          )}
        </div>

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

      {/* Scope chips removed - moved to dropdown in header */}

      {/* ── Period navigator ───────────────────────────── */}
      {scope !== "all" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <button onClick={() => setScopeDate(stepDate(scope, scopeDate, -1))} style={{
            background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 14,
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, cursor: "pointer", transition: "transform .2s", boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
          }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            <Ico n="chevronLeft" sz={18} />
          </button>

          <span 
            onClick={() => {
              try { dateRef.current?.showPicker(); } catch (e) {}
            }}
            style={{
              fontSize: 16, color: C.text, fontWeight: 800, minWidth: 160, textAlign: "center", position: "relative",
              display: "inline-block", cursor: "pointer"
            }}
          >
            {periodLabel(scope, scopeDate)}
            <input 
              ref={dateRef}
              type="date"
              value={toISO(scopeDate)}
              onChange={(e) => {
                if (e.target.value) setScopeDate(new Date(e.target.value));
              }}
              style={{
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                opacity: 0, cursor: "pointer"
              }}
            />
          </span>

          <button onClick={() => setScopeDate(stepDate(scope, scopeDate, 1))} style={{
            background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 14,
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, cursor: "pointer", transition: "transform .2s", boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
          }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            <Ico n="chevronRight" sz={18} />
          </button>
        </div>
      )}

      {/* Filter pills removed - functionality available in filter modal */}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
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

      {/* ── Transaction list (grouped by date) ─────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {timeTx.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: C.sub, fontSize: 14 }}>
            {scope === "all" ? "No transactions match your filters." : `No transactions for ${periodLabel(scope, scopeDate)}.`}
          </div>
        ) : grouped.map(([date, txs]) => (
          <div key={date}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.sub, padding: "12px 4px 8px", display: "flex", alignItems: "center", gap: 10
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.border }} />
              {fmtGroupDate(date)}
              <div style={{ flex: 1, height: 1, background: C.borderLight, marginLeft: 4 }} />
              <span style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>
                {fmtAmt(txs.reduce((s, t) => s + (t.creditDebit === "Credit" ? t.amount : -t.amount), 0))}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {txs.map(t => (
                <TxRow
                  key={t.id}
                  t={t}
                  categories={categories}
                  tags={tags}
                  accounts={accounts}
                  onClick={() => onEditTx(t)}
                  selected={selectedTxIds.includes(t.id)}
                  onSelect={(isSel) => setSelectedTxIds(isSel ? [...selectedTxIds, t.id] : selectedTxIds.filter(x => x !== t.id))}
                  theme={C}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bulk Actions Floating Bar ──────────────────── */}
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
          if (onSoftDeleteBulk) {
            onSoftDeleteBulk(ids);
          }
        }}
        theme={C}
      />
    </div>
  );
}
