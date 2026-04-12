import React from "react";
import { Ico } from "../ui/Ico.jsx";
import Icon from "../ui/Icon.jsx";
import { Btn } from "../ui/Btn.jsx";

export const FilterModal = ({ filters, setFilters, categories, tags, accounts, onClose, theme }) => {
  const C = theme;

  const toggleCat = (id) => {
    setFilters(prev => {
      const cats = prev.cats || [];
      if (cats.includes(id)) return { ...prev, cats: cats.filter(x => x !== id) };
      return { ...prev, cats: [...cats, id] };
    });
  };

  const toggleTag = (id) => {
    setFilters(prev => {
      const tgs = prev.tags || [];
      if (tgs.includes(id)) return { ...prev, tags: tgs.filter(x => x !== id) };
      return { ...prev, tags: [...tgs, id] };
    });
  };

  const clearAll = () => {
    setFilters({ from: "", to: "", cats: [], tags: [], acc: "", type: "", cd: "" });
  };

  const activeCount = (filters.cats?.length || 0) + (filters.tags?.length || 0) 
    + (filters.from ? 1 : 0) + (filters.to ? 1 : 0) + (filters.acc ? 1 : 0) + (filters.type ? 1 : 0) + (filters.cd ? 1 : 0);

  const lbl = { fontSize: 11, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 };
  const selectStyle = { width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", color: C.text, outline: "none", fontSize: 13, fontFamily: "inherit" };

  const chip = (active, color = C.primary) => ({
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .15s",
    background: active ? color + "22" : "transparent",
    border: `1px solid ${active ? color : C.border}`,
    color: active ? color : C.sub,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "inherit",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Date Range — compact row */}
      <div>
        <div style={lbl}>Date Range</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, color: C.sub, fontWeight: 600 }}>From</span>
            <input type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} style={{ ...selectStyle, width: "100%", maxWidth: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, color: C.sub, fontWeight: 600 }}>To</span>
            <input type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} style={{ ...selectStyle, width: "100%", maxWidth: "100%", boxSizing: "border-box" }} />
          </div>
        </div>
      </div>

      {/* Type + Nature — compact row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={lbl}>Type</div>
          <select value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value }))} style={selectStyle}>
            <option value="">All</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
            <option value="Investment">Investment</option>
          </select>
        </div>
        <div>
          <div style={lbl}>Nature</div>
          <select value={filters.cd} onChange={e => setFilters(p => ({ ...p, cd: e.target.value }))} style={selectStyle}>
            <option value="">All</option>
            <option value="Credit">Credit</option>
            <option value="Debit">Debit</option>
          </select>
        </div>
      </div>

      {/* Account */}
      {accounts.length > 0 && (
        <div>
          <div style={lbl}>Account</div>
          <select value={filters.acc} onChange={e => setFilters(p => ({ ...p, acc: e.target.value }))} style={selectStyle}>
            <option value="">All Accounts</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>
      )}

      {/* Categories — compact scrollable chips */}
      <div>
        <div style={lbl}>Categories {(filters.cats?.length || 0) > 0 && <span style={{ color: C.primary, fontWeight: 900 }}>({filters.cats.length})</span>}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflowY: "auto" }} className="premium-scroll">
          {categories.filter(c => !c.deleted).map(cat => (
            <button key={cat.id} onClick={() => toggleCat(cat.id)} style={chip((filters.cats || []).includes(cat.id), cat.color || C.primary)}>
              {cat.icon ? <Icon name={cat.icon} size={13} /> : <span style={{ fontSize: 13 }}>{cat.emoji}</span>}{cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div style={lbl}>Tags {(filters.tags?.length || 0) > 0 && <span style={{ color: C.secondary || C.primary, fontWeight: 900 }}>({filters.tags.length})</span>}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 80, overflowY: "auto" }} className="premium-scroll">
            {tags.map(tag => (
              <button key={tag.id} onClick={() => toggleTag(tag.id)} style={chip((filters.tags || []).includes(tag.id), tag.color || C.secondary)}>
                {tag.icon ? <Icon name={tag.icon} size={10} /> : <Ico n="tag" sz={10} />}{tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={clearAll} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px", color: C.sub, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Clear{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <button onClick={onClose} style={{ flex: 1, background: C.primary, border: "none", borderRadius: 12, padding: "10px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Apply
        </button>
      </div>
    </div>
  );
};
