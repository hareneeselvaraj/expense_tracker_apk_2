import React from "react";
import { Ico } from "../ui/Ico.jsx";
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

  const sectionStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 24
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 800,
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: ".05em"
  };

  const chipContainerStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  };

  const getChipStyle = (isActive, color = C.primary) => ({
    padding: "6px 14px",
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .2s",
    background: isActive ? color + "22" : "transparent",
    border: `1px solid ${isActive ? color : C.border}`,
    color: isActive ? color : C.sub,
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "inherit"
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      
      {/* Date Range */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Date Range</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, color: C.sub }}>From</span>
            <input 
              type="date" 
              value={filters.from} 
              onChange={e => setFilters(p => ({ ...p, from: e.target.value }))}
              style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, color: C.text, outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, color: C.sub }}>To</span>
            <input 
              type="date" 
              value={filters.to} 
              onChange={e => setFilters(p => ({ ...p, to: e.target.value }))}
              style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, color: C.text, outline: "none" }}
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Categories</div>
        <div style={chipContainerStyle}>
          {categories.map(cat => {
            const active = (filters.cats || []).includes(cat.id);
            return (
              <button 
                key={cat.id} 
                onClick={() => toggleCat(cat.id)}
                style={getChipStyle(active, C.primary)}
              >
                <span>{cat.emoji}</span>
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Tags</div>
        <div style={chipContainerStyle}>
          {tags.map(tag => {
            const active = (filters.tags || []).includes(tag.id);
            return (
              <button 
                key={tag.id} 
                onClick={() => toggleTag(tag.id)}
                style={getChipStyle(active, C.secondary)}
              >
                <Ico n="tag" sz={12} />
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction Type & CR/DR */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={sectionStyle}>
          <div style={labelStyle}>Type</div>
          <select 
            value={filters.type} 
            onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
            style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, color: C.text, outline: "none" }}
          >
            <option value="">All Types</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
            <option value="Investment">Investment</option>
          </select>
        </div>
        <div style={sectionStyle}>
          <div style={labelStyle}>Nature</div>
          <select 
            value={filters.cd} 
            onChange={e => setFilters(p => ({ ...p, cd: e.target.value }))}
            style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, color: C.text, outline: "none" }}
          >
            <option value="">All</option>
            <option value="Credit">Credit (CR)</option>
            <option value="Debit">Debit (DR)</option>
          </select>
        </div>
      </div>

      {/* Account */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Account</div>
        <select 
          value={filters.acc} 
          onChange={e => setFilters(p => ({ ...p, acc: e.target.value }))}
          style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, color: C.text, outline: "none" }}
        >
          <option value="">All Accounts</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <Btn theme={C} v="ghost" block onClick={clearAll}>Clear All</Btn>
        <Btn theme={C} block onClick={onClose}>Apply Filters</Btn>
      </div>

    </div>
  );
};
