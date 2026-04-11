// src/investment/pages/Holdings.jsx

import React, { useState, useMemo } from "react";
import { ASSET_TYPES } from "../constants/assetTypes.js";
import { Ico } from "../../components/ui/Ico.jsx";
import { fmtAmt } from "../../utils/format.js";
import { calcHoldingValue } from "../utils/valuation.js";
import { getLivePriceSmart } from "../services/priceEngine.js";

const OverallCard = ({ overall, theme: C }) => (
  <div style={{
    background: `linear-gradient(135deg, ${C.primary}18, ${C.secondary || C.primary}18)`,
    border: `1px solid ${C.primary}33`, borderRadius: 24, padding: 20,
    boxShadow: C.shadow, position: "relative", overflow: "hidden"
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ color: C.sub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
          Total Portfolio Value
        </div>
        <div style={{ color: C.text, fontSize: 32, fontWeight: 800, letterSpacing: "-.03em" }}>
          {fmtAmt(overall.value)}
        </div>
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
       <div>
         <div style={{ color: C.sub, fontSize: 10, fontWeight: 600 }}>Invested</div>
         <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{fmtAmt(overall.invested)}</div>
       </div>
       <div style={{ width: 1, height: 24, background: C.borderLight }}></div>
       <div>
         <div style={{ color: C.sub, fontSize: 10, fontWeight: 600 }}>Overall P/L</div>
         <div style={{ color: overall.gain >= 0 ? C.income : C.expense, fontSize: 14, fontWeight: 800 }}>
           {overall.gain > 0 ? "+" : ""}{fmtAmt(overall.gain)} ({overall.gain > 0 ? "+" : ""}{overall.pct.toFixed(1)}%)
         </div>
       </div>
    </div>
  </div>
);

const TypeTab = ({ id, label, icon, color, count, active, onClick, theme: C }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 12px", borderRadius: 20,
    background: active ? color + "22" : C.surface,
    border: `1px solid ${active ? color + "66" : C.borderLight}`,
    color: active ? color : C.sub,
    fontWeight: 700, fontSize: 12, cursor: "pointer",
    whiteSpace: "nowrap", flexShrink: 0,
    transition: "all 0.2s"
  }}>
    <span style={{ fontSize: 14 }}>{icon}</span>
    <span style={{ color: active ? C.text : C.sub }}>{label}</span>
    <div style={{
      background: active ? color : C.borderLight, color: active ? "#000" : C.sub,
      fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 10, marginLeft: 2
    }}>
      {count}
    </div>
  </button>
);

const TypeSummaryBar = ({ summary, type, theme: C }) => {
  const at = ASSET_TYPES.find(a => a.id === type) || ASSET_TYPES[0];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 800 }}>{at.label}</div>
        <div style={{ color: C.sub, fontSize: 11, fontWeight: 600 }}>{summary.count} holdings • Invested: {fmtAmt(summary.invested)}</div>
      </div>
      <div style={{ textAlign: "right" }}>
         <div style={{ color: C.text, fontSize: 15, fontWeight: 800 }}>{fmtAmt(summary.value)}</div>
         <div style={{ color: summary.gain >= 0 ? C.income : C.expense, fontSize: 11, fontWeight: 700 }}>
           {summary.gain > 0 ? "+" : ""}{fmtAmt(summary.gain)} ({summary.invested ? ((summary.gain/summary.invested)*100).toFixed(1) : 0}%)
         </div>
      </div>
    </div>
  );
};

const HoldingCard = ({ h, onEdit, onDelete, theme: C }) => {
  const at = ASSET_TYPES.find(a => a.id === h.type) || ASSET_TYPES[0];
  const val = calcHoldingValue(h);
  const gain = val - (h.principal || 0);
  const pct = h.principal ? (gain / h.principal) * 100 : 0;
  
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 18,
      padding: "12px 10px", display: "flex", alignItems: "center", gap: 8, boxShadow: C.shadow,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: at.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
        {at.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</div>
        <div style={{ color: C.sub, fontSize: 10, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap" }}>
          {h.qty && h.principal ? `${h.qty} @ ₹${(h.principal/h.qty).toFixed(2)}` : `Invested: ${fmtAmt(h.principal || 0)}`}
        </div>
      </div>
      <div style={{ textAlign: "right", marginRight: 4, flexShrink: 0 }}>
         <div style={{ color: C.text, fontSize: 13, fontWeight: 800 }}>{fmtAmt(val)}</div>
         {gain !== 0 && (
           <div style={{ color: gain > 0 ? C.income : C.expense, fontSize: 10, fontWeight: 700 }}>
             {gain > 0 ? "+" : ""}{fmtAmt(gain)} ({gain > 0 ? "+" : ""}{pct.toFixed(1)}%)
           </div>
         )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ background: C.input, border: "none", width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Ico n="edit" sz={12} c={C.text} />
        </button>
        <button onClick={onDelete} style={{ background: C.expense + "15", border: "none", width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Ico n="trash" sz={12} c={C.expense} />
        </button>
      </div>
    </div>
  );
};

const EmptyState = ({ type, theme: C }) => {
  const at = type === "all" ? null : ASSET_TYPES.find(a => a.id === type);
  return (
    <div style={{ background: C.surface, border: `1px dashed ${C.borderLight}`, borderRadius: 24, padding: 40, textAlign: "center", margin: "20px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{at ? at.icon : "📭"}</div>
      <div style={{ color: C.text, fontSize: 16, fontWeight: 800, marginBottom: 6 }}>No {at ? at.label : "Holdings"} Found</div>
      <div style={{ color: C.sub, fontSize: 13 }}>Tap + to add your first {at ? at.label.toLowerCase() : "investment"}.</div>
    </div>
  );
};

export const HoldingsPage = ({ investData, setInvestData, theme, onEditHolding, onDeleteHolding }) => {
  const C = theme;
  const [activeType, setActiveType] = useState("all"); // "all" | "stock" | "mf" | ...
  const [sortBy, setSortBy] = useState("value");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const all = (investData.holdings || []).filter(h => !h.deleted);

  // Automatically reset active tab if the active type is now empty (NEW-11)
  React.useEffect(() => {
    if (activeType !== "all") {
      const typeCount = all.filter(h => h.type === activeType).length;
      if (typeCount === 0) setActiveType("all");
    }
  }, [all.length, activeType]);

  // Group by type once
  const byType = useMemo(() => {
    const g = {};
    for (const h of all) {
      if (!g[h.type]) g[h.type] = [];
      g[h.type].push(h);
    }
    return g;
  }, [all]);

  // Aggregate per type
  const typeSummary = useMemo(() => {
    const out = {};
    for (const t of ASSET_TYPES) {
      const hs = byType[t.id] || [];
      const value = hs.reduce((s, h) => s + calcHoldingValue(h), 0);
      const invested = hs.reduce((s, h) => s + (h.principal || 0), 0);
      out[t.id] = { count: hs.length, value, invested, gain: value - invested };
    }
    return out;
  }, [byType]);

  const overall = useMemo(() => {
    const value = Object.values(typeSummary).reduce((s, x) => s + x.value, 0);
    const invested = Object.values(typeSummary).reduce((s, x) => s + x.invested, 0);
    return { value, invested, gain: value - invested,
             pct: invested ? ((value - invested) / invested) * 100 : 0 };
  }, [typeSummary]);

  const visibleHoldings = (activeType === "all" ? all : (byType[activeType] || []))
    .filter(h => {
      if (!debouncedQuery) return true;
      const q = debouncedQuery.toLowerCase();
      return (h.name && h.name.toLowerCase().includes(q)) || (h.symbol && h.symbol.toLowerCase().includes(q));
    });

  const sorted = [...visibleHoldings].sort((a, b) => {
     if (sortBy === "value") {
        return calcHoldingValue(b) - calcHoldingValue(a);
     } else if (sortBy === "gain") {
        return (calcHoldingValue(b) - (b.principal || 0)) - (calcHoldingValue(a) - (a.principal || 0));
     } else if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
     } else {
        return new Date(b.startDate || 0) - new Date(a.startDate || 0);
     }
  });

  const handleRefreshAll = async () => {
     setIsRefreshing(true);
     const symbols = all.filter(h => ["stock", "mf"].includes(h.type) && h.symbol).map(h => h.symbol);
     for (const sym of symbols) {
       localStorage.removeItem(`price_cache_${sym}`);
     }
     localStorage.removeItem(`gold_price_cache`);
     setIsRefreshing(false);
     if (typeof setInvestData === "function") {
       setInvestData(prev => ({ ...prev }));
     }
  };

  return (
    <div className="page-enter" style={{ padding: "12px 12px 100px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* OVERALL SUMMARY CARD */}
      <OverallCard overall={overall} theme={C} />
      
      {/* ACTION ROW & SEARCH */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", gap: 8 }}>
        <input 
          type="text" 
          placeholder="Search name or symbol..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "8px 12px", fontSize: 13, outline: "none", width: "100%" }}
        />
        <button onClick={handleRefreshAll} disabled={isRefreshing} style={{ background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "8px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: C.shadow, flexShrink: 0 }}>
          {isRefreshing ? "⏳" : "↻ Refresh"}
        </button>
      </div>

      {/* TAB BAR — horizontal scroll, pill style */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }} className="premium-scroll">
        <TypeTab
          id="all" label="All" icon="🗂️" color={C.primary}
          count={all.length} active={activeType === "all"}
          onClick={() => setActiveType("all")} theme={C}
        />
        {ASSET_TYPES.map(t => {
          const s = typeSummary[t.id];
          if (s.count === 0) return null;   // hide empty types
          return (
            <TypeTab
              key={t.id} id={t.id} label={t.label} icon={t.icon} color={t.color}
              count={s.count} active={activeType === t.id}
              onClick={() => setActiveType(t.id)} theme={C}
            />
          );
        })}
      </div>

      {/* ACTIVE TAB SUMMARY (only when not "all") */}
      {activeType !== "all" && (
        <TypeSummaryBar summary={typeSummary[activeType]} type={activeType} theme={C} />
      )}

      {/* SORT + COUNT ROW */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: C.sub, fontSize: 13, fontWeight: 600 }}>
          {sorted.length} {sorted.length === 1 ? "holding" : "holdings"}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "6px 10px", fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}>
          <option value="value">Value</option>
          <option value="gain">Gain/Loss</option>
          <option value="name">Name</option>
          <option value="date">Date</option>
        </select>
      </div>

      {/* HOLDING CARDS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.length === 0
          ? <EmptyState type={activeType} theme={C} />
          : sorted.map(h => <HoldingCard key={h.id} h={h} theme={C}
                              onEdit={() => onEditHolding(h)}
                              onDelete={() => onDeleteHolding(h)} />)
        }
      </div>
    </div>
  );
};
