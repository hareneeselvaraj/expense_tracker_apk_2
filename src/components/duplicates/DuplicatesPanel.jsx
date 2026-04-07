import React, { useState, useMemo } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Btn } from "../ui/Btn.jsx";
import { Ico } from "../ui/Ico.jsx";
import { fmtAmt } from "../../utils/format.js";
import { findAllDuplicates } from "../../services/duplicateEngine.js";

export function DuplicatesPanel({ open, onClose, transactions, accounts, categories, onDelete, theme }) {
  const C = theme;
  const [filter, setFilter] = useState("all"); // all | exact | near
  const [selected, setSelected] = useState(new Set());

  // Memoized — only recalculates when transactions change
  const groups = useMemo(() => {
    if (!open) return [];
    return findAllDuplicates(transactions);
  }, [transactions, open]);

  const filteredGroups = useMemo(() => {
    if (filter === "all") return groups;
    return groups.filter(g => g.confidence === filter);
  }, [groups, filter]);

  const totalDuplicates = groups.reduce((sum, g) => sum + g.items.length - 1, 0);
  const exactCount = groups.filter(g => g.confidence === "exact").length;
  const nearCount = groups.filter(g => g.confidence === "near").length;

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleKeepFirst = (group) => {
    // Keep the oldest tx (smallest id timestamp), delete the rest
    const sorted = [...group.items].sort((a, b) =>
      new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0)
    );
    const toDelete = sorted.slice(1).map(t => t.id);
    onDelete(toDelete);
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected duplicates?`)) return;
    onDelete(Array.from(selected));
    setSelected(new Set());
  };

  const handleAutoClean = () => {
    // For each EXACT group, keep the first and delete the rest
    if (!window.confirm(`Auto-clean will delete ${exactCount} exact duplicates. Continue?`)) return;
    const toDelete = [];
    for (const g of groups) {
      if (g.confidence !== "exact") continue;
      const sorted = [...g.items].sort((a, b) =>
        new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0)
      );
      sorted.slice(1).forEach(t => toDelete.push(t.id));
    }
    onDelete(toDelete);
  };

  return (
    <Modal open={open} onClose={onClose} title="Duplicate Detector" theme={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Stats Header ── */}
        <div style={{
          background: C.input, borderRadius: 16, padding: 16,
          display: "flex", justifyContent: "space-around", textAlign: "center"
        }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>{groups.length}</div>
            <div style={{ fontSize: 10, color: C.sub, fontWeight: 700, textTransform: "uppercase" }}>Groups</div>
          </div>
          <div style={{ width: 1, background: C.borderLight }} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.expense }}>{totalDuplicates}</div>
            <div style={{ fontSize: 10, color: C.sub, fontWeight: 700, textTransform: "uppercase" }}>Extras</div>
          </div>
          <div style={{ width: 1, background: C.borderLight }} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.primary }}>{exactCount}</div>
            <div style={{ fontSize: 10, color: C.sub, fontWeight: 700, textTransform: "uppercase" }}>Exact</div>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div style={{ display: "flex", gap: 8, background: C.input, padding: 4, borderRadius: 12 }}>
          {[
            { id: "all", label: `All (${groups.length})` },
            { id: "exact", label: `Exact (${exactCount})` },
            { id: "near", label: `Similar (${nearCount})` }
          ].map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)} style={{
              flex: 1, padding: "10px 12px", borderRadius: 8, border: "none",
              background: filter === tab.id ? C.surface : "transparent",
              color: filter === tab.id ? C.primary : C.sub,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              boxShadow: filter === tab.id ? `0 2px 8px rgba(0,0,0,0.1)` : "none",
              transition: "all .2s"
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── Auto-Clean CTA ── */}
        {exactCount > 0 && (
          <button onClick={handleAutoClean} style={{
            background: `linear-gradient(135deg, ${C.primary}, ${C.secondary || C.primary})`,
            color: "#fff", border: "none", borderRadius: 14, padding: 14,
            fontSize: 13, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: `0 4px 16px ${C.primary}40`
          }}>
            ✨ Auto-Clean {exactCount} Exact Duplicates
          </button>
        )}

        {/* ── Empty State ── */}
        {filteredGroups.length === 0 && (
          <div style={{ padding: 60, textAlign: "center", color: C.sub }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Your ledger is squeaky clean!</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>No duplicates found.</div>
          </div>
        )}

        {/* ── Groups List ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "50vh", overflowY: "auto" }}>
          {filteredGroups.map((group, gIdx) => {
            const first = group.items[0];
            const cat = categories.find(c => c.id === first.category);
            const isExact = group.confidence === "exact";

            return (
              <div key={gIdx} style={{
                background: C.card, borderRadius: 20, padding: 14,
                border: `1px solid ${isExact ? C.expense + "44" : (C.warning + "44" || C.border)}`,
                boxShadow: isExact ? `0 0 16px ${C.expense}15` : "none"
              }}>
                {/* Group header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      background: isExact ? C.expense + "22" : (C.warning + "22" || C.input),
                      color: isExact ? C.expense : (C.warning || C.sub),
                      padding: "3px 8px", borderRadius: 6, fontSize: 9, fontWeight: 800, textTransform: "uppercase"
                    }}>
                      {isExact ? "Exact" : "Similar"}
                    </div>
                    <span style={{ color: C.sub, fontSize: 11, fontWeight: 600 }}>
                      {group.items.length} copies
                    </span>
                  </div>
                  <button onClick={() => handleKeepFirst(group)} style={{
                    background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "5px 10px", color: C.text, fontSize: 11, fontWeight: 700, cursor: "pointer"
                  }}>
                    Keep oldest
                  </button>
                </div>

                {/* Tx description summary */}
                <div style={{
                  fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>
                  {first.description}
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: first.creditDebit === "Credit" ? C.income : C.expense, marginBottom: 10 }}>
                  {first.creditDebit === "Credit" ? "+" : "−"}{fmtAmt(first.amount)}
                </div>

                {/* Individual items */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.items.map(t => {
                    const acc = accounts.find(a => a.id === t.accountId);
                    const isSelected = selected.has(t.id);
                    return (
                      <div key={t.id} onClick={() => toggleSelect(t.id)} style={{
                        background: isSelected ? C.expense + "11" : C.input,
                        border: `1px solid ${isSelected ? C.expense : C.borderLight}`,
                        borderRadius: 10, padding: 10,
                        display: "flex", alignItems: "center", gap: 10, cursor: "pointer", transition: "all .2s"
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 5,
                          border: `2px solid ${isSelected ? C.expense : C.border}`,
                          background: isSelected ? C.expense : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}>
                          {isSelected && <Ico n="check" sz={10} c="#fff" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>
                            {new Date(t.date).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: 10, color: C.sub }}>
                            {acc?.name || "No account"} • {cat?.name || "No category"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Bulk Action Bar (sticky bottom) ── */}
        {selected.size > 0 && (
          <div style={{
            position: "sticky", bottom: 0, background: C.surface,
            padding: 12, borderRadius: 14, border: `1px solid ${C.border}`,
            display: "flex", gap: 10, alignItems: "center",
            boxShadow: `0 -4px 16px rgba(0,0,0,0.2)`
          }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.text }}>
              {selected.size} selected
            </span>
            <Btn theme={C} v="ghost" sm onClick={() => setSelected(new Set())}>Clear</Btn>
            <button onClick={handleBulkDelete} style={{
              background: C.expense, color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer"
            }}>
              Delete {selected.size}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
