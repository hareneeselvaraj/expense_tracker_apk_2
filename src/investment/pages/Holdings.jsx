import React from "react";
import { ASSET_TYPES } from "../constants/assetTypes.js";
import { Ico } from "../../components/ui/Ico.jsx";
import { fmtAmt } from "../../utils/format.js";

export const HoldingsPage = ({ investData, theme, onEditHolding, onDeleteHolding }) => {
  const C = theme;
  const holdings = (investData.holdings || []).filter(h => !h.deleted);

  return (
    <div className="page-enter" style={{ padding: "12px 12px 100px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: C.sub, fontSize: 13, fontWeight: 600 }}>{holdings.length} holdings</div>
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
                <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                  {at.label} • {h.principal ? fmtAmt(h.principal) : "0"}
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
