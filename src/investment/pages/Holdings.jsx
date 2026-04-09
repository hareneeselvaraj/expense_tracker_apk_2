import React, { useState } from "react";
import { ASSET_TYPES } from "../constants/assetTypes.js";
import { Ico } from "../../components/ui/Ico.jsx";
import { fmtAmt } from "../../utils/format.js";
import { calcHoldingValue } from "../utils/valuation.js";

export const HoldingsPage = ({ investData, theme, onEditHolding, onDeleteHolding }) => {
  const C = theme;
  const [sortBy, setSortBy] = useState("value"); // "value", "name", "date"
  
  const rawHoldings = (investData.holdings || []).filter(h => !h.deleted);
  
  const holdings = [...rawHoldings].sort((a, b) => {
     if (sortBy === "value") {
        return calcHoldingValue(b) - calcHoldingValue(a);
     } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
     } else {
        return new Date(b.startDate || 0) - new Date(a.startDate || 0);
     }
  });

  return (
    <div className="page-enter" style={{ padding: "12px 12px 100px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: C.sub, fontSize: 13, fontWeight: 600 }}>{holdings.length} holdings</div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "4px 8px", fontSize: 11, fontWeight: 600, outline: "none" }}>
           <option value="value">Sort by Value</option>
           <option value="name">Sort by Name</option>
           <option value="date">Sort by Date</option>
        </select>
      </div>
      {holdings.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: 40, textAlign: "center", boxShadow: C.shadow }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ color: C.text, fontSize: 16, fontWeight: 800, marginBottom: 6 }}>No Holdings Yet</div>
          <div style={{ color: C.sub, fontSize: 13 }}>Tap + to add your first investment.</div>
        </div>
      ) : (
        holdings.map(h => {
          const at = ASSET_TYPES.find(a => a.id === h.type) || ASSET_TYPES[0];
          return (
            <div key={h.id} style={{
              background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 18,
              padding: 14, display: "flex", alignItems: "center", gap: 12, boxShadow: C.shadow,
              transition: "transform .15s"
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: at.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {at.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{h.name}</div>
                <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  {at.label}
                  <span style={{color: C.borderLight}}>•</span>
                  {(() => {
                    const val = calcHoldingValue(h);
                    const gain = val - (h.principal || 0);
                    return (
                      <span style={{ display: "flex", gap: 6 }}>
                        <span style={{color: C.text, fontWeight: 700}}>{fmtAmt(val)}</span>
                        {gain !== 0 && (
                          <span style={{color: gain > 0 ? C.income : C.expense}}>
                             {gain > 0 ? "+" : ""}{fmtAmt(gain)}
                          </span>
                        )}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button 
                  onClick={() => onEditHolding(h)}
                  style={{ background: C.input, border: "none", width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <Ico n="edit" sz={16} c={C.text} />
                </button>
                <button 
                  onClick={() => onDeleteHolding(h)}
                  style={{ background: C.expense + "22", border: `1px solid ${C.expense}40`, width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <Ico n="trash" sz={16} c={C.expense} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
