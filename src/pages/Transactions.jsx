import React from "react";
import { Ico } from "../components/ui/Ico.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { TxRow } from "../components/cards/TxRow.jsx";
import { fmtAmt, toISO, dateRange, stepDate, periodLabel } from "../utils/format.js";
import { findAllDuplicates } from "../services/duplicateEngine.js";
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
  const dateRef = React.useRef(null);

  const dupeCount = React.useMemo(() => {
    const groups = findAllDuplicates(transactions);
    return groups.reduce((sum, g) => sum + g.items.length - 1, 0);
  }, [transactions]);

  /* ── time scope state ──────────────────────────────────── */
  const [scope, setScope] = React.useState("month");        // "all" | "week" | "month" | "year"
  const [scopeDate, setScopeDate] = React.useState(new Date());

  /* ── apply time filter on top of filteredTx ────────────── */
  const timeTx = React.useMemo(() => {
    if (scope === "all") return filteredTx;
    const [from, to] = dateRange(scope, scopeDate);
    return filteredTx.filter(t => t.date >= from && t.date <= to);
  }, [filteredTx, scope, scopeDate]);

  /* ── period summary ────────────────────────────────────── */
  const summary = React.useMemo(() => {
    const inc = timeTx.filter(t => t.txType === "Income").reduce((s, t) => s + t.amount, 0);
    const exp = timeTx.filter(t => t.txType === "Expense").reduce((s, t) => s + t.amount, 0);
    const inv = timeTx.filter(t => t.txType === "Investment").reduce((s, t) => s + t.amount, 0);
    return { inc, exp, inv, net: inc - exp - inv };
  }, [timeTx]);

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

      {/* ── Search bar ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search transactions…" style={{ flex: 1, background: C.surface, borderWidth: 1, borderStyle: "solid", borderColor: C.borderLight, borderRadius: 16, padding: "12px 16px", color: C.text, fontSize: 15, outline: "none", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }} />
        <button onClick={onShowFilters} style={{ background: hasFilter ? C.primary : C.surface, border: `1px solid ${hasFilter ? C.primary : C.borderLight}`, borderRadius: 16, padding: "0 16px", color: hasFilter ? "#fff" : C.sub, cursor: "pointer", display: "flex", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", transition: "all .2s" }}>
          <Ico n="filter" sz={20} />
        </button>
      </div>

      {/* ── Time scope tabs ────────────────────────────── */}
      <div style={{ display: "flex", background: C.input, borderRadius: 24, padding: 4 }}>
        {["all", "week", "month", "year"].map(t => (
          <button key={t} onClick={() => { setScope(t); if (t !== "all") setScopeDate(new Date()); }} style={{
            flex: 1, padding: "10px", borderRadius: 20, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 700, textTransform: "capitalize",
            background: scope === t ? C.primary : "transparent",
            color: scope === t ? "#fff" : C.sub,
            boxShadow: scope === t ? "0 4px 12px rgba(124, 92, 252, 0.2)" : "none",
            transition: "all .3s ease"
          }}>{t === "all" ? "All Time" : t}</button>
        ))}
      </div>

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

      {/* ── Period summary strip ───────────────────────── */}
      {scope !== "all" && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8
        }}>
          {[
            { label: "Income", value: summary.inc, color: C.income },
            { label: "Expense", value: summary.exp, color: C.expense }
          ].map(s => (
            <div key={s.label} style={{
              background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16,
              padding: "12px 10px", textAlign: "center", borderTop: `4px solid ${s.color}`, boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
            }}>
              <div style={{ color: C.sub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 16, fontWeight: 800 }}>
                {s.label === "Net" && s.value >= 0 ? "+" : s.label === "Net" && s.value < 0 ? "−" : ""}{fmtAmt(Math.abs(s.value))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick CR/DR filter pills ───────────────────── */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {["", "Credit", "Debit", "Income", "Expense", "Investment"].map(opt => {
          const active = opt === "" ? (filters.cd === "" && filters.type === "") : (filters.cd === opt || filters.type === opt);
          const col = opt === "Credit" ? C.income : opt === "Debit" ? C.expense : opt === "Income" ? C.income : opt === "Expense" ? C.expense : opt === "Investment" ? C.invest : C.primary;
          return (
            <button key={opt} onClick={() => {
              if (opt === "") setFilters(p => ({ ...p, cd: "", type: "" }));
              else if (opt === "Credit" || opt === "Debit") setFilters(p => ({ ...p, cd: p.cd === opt ? "" : opt, type: "" }));
              else setFilters(p => ({ ...p, type: p.type === opt ? "" : opt, cd: "" }));
            }} style={{
              background: active ? col : C.surface, border: `1px solid ${active ? col : C.borderLight}`, borderRadius: 14,
              padding: "6px 16px", color: active ? "#fff" : C.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
              boxShadow: active ? `0 4px 12px ${col}40` : "0 2px 6px rgba(0,0,0,0.02)", transition: "all .2s"
            }}>{opt || "All"}</button>
          );
        })}
      </div>

      {/* ── Stats strip ────────────────────────────────── */}
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {dupeCount > 0 && (
            <button onClick={() => setShowDuplicates(true)} style={{
              background: C.warning + "22" || C.expense + "22",
              border: `1px solid ${C.warning || C.expense}`,
              borderRadius: 99, padding: "4px 10px", color: C.warning || C.expense,
              fontSize: 11, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6
            }}>
              ⚠️ {dupeCount} duplicates — Review
            </button>
          )}
          <Btn theme={C} v="ghost" sm icon="down" onClick={onExportCSV}>CSV</Btn>
          <Btn theme={C} v="ghost" sm icon="stars" onClick={onExportPDF}>PDF</Btn>
          <Btn theme={C} v="ghost" sm icon="upload" onClick={onShowUpload}>Import</Btn>
          <button onClick={onAdd} style={{
            background: C.primary,
            border: "none", borderRadius: 12, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
            boxShadow: `0 4px 12px ${C.primary}40`, transition: "transform .2s"
          }} onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>
            <Ico n="plus" sz={16} /> Add
          </button>
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
                  <Ico n="trash" sz={14} c={C.expense} /> Let's Delete
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
