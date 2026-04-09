import React, { useMemo } from "react";
import { fmtAmt, fmtDate } from "../../utils/format.js";
import { ASSET_TYPES } from "../constants/assetTypes.js";
import { calcHoldingValue } from "../utils/valuation.js";

export const InvestReportsPage = ({ investData, theme }) => {
  const C = theme;
  
  const activeHoldings = useMemo(() => (investData?.holdings || []).filter(h => !h.deleted), [investData]);
  const activeTxs = useMemo(() => 
    (investData?.transactions || [])
      .filter(t => !t.deleted)
      .sort((a,b) => (b.date || "").localeCompare(a.date || "")), 
  [investData]);

  const stats = useMemo(() => {
    let principal = 0;
    let currentVal = 0;
    activeHoldings.forEach(h => {
      principal += h.principal || 0;
      currentVal += calcHoldingValue(h);
    });
    const profit = currentVal - principal;
    const roi = principal > 0 ? (profit / principal) * 100 : 0;
    return { principal, currentVal, profit, roi };
  }, [activeHoldings]);

  if (activeHoldings.length === 0 && activeTxs.length === 0) {
    return (
      <div className="page-enter" style={{ padding: "12px 12px 100px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: 40, textAlign: "center", boxShadow: C.shadow }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No Data Yet</div>
          <div style={{ color: C.sub, fontSize: 13, lineHeight: 1.5 }}>Add your first investment to see performance reports and transaction history here.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ padding: "12px 12px 100px", display: "flex", flexDirection: "column", gap: 16 }}>
      
      {/* Performance Card */}
      <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: 20, boxShadow: C.shadow }}>
          <div style={{ color: C.sub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Overall Performance</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
             <div>
                <div style={{ color: C.text, fontSize: 24, fontWeight: 800 }}>{fmtAmt(stats.currentVal)}</div>
                <div style={{ color: C.sub, fontSize: 11, fontWeight: 600 }}>Market Value</div>
             </div>
             <div style={{ textAlign: "right" }}>
                <div style={{ color: stats.profit >= 0 ? C.income : C.expense, fontSize: 18, fontWeight: 800 }}>
                   {stats.profit > 0 ? "+" : ""}{fmtAmt(stats.profit)}
                </div>
                <div style={{ color: stats.profit >= 0 ? C.income : C.expense, fontSize: 11, fontWeight: 700 }}>
                   {stats.profit > 0 ? "+" : ""}{stats.roi.toFixed(2)}% ROI
                </div>
             </div>
          </div>
      </div>

      {/* Transaction History Ledger */}
      <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: "20px 16px", boxShadow: C.shadow }}>
        <div style={{ color: C.text, fontSize: 16, fontWeight: 800, marginBottom: 16, letterSpacing: "-.02em" }}>Investment Ledger</div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {activeTxs.map((tx, idx) => {
            const holding = activeHoldings.find(h => h.id === tx.holdingId);
            const holdingType = ASSET_TYPES.find(at => at.id === (holding?.type || "other"));
            
            return (
              <div key={tx.id} style={{ 
                padding: "12px 0", 
                borderBottom: idx === activeTxs.length - 1 ? "none" : `1px solid ${C.borderLight}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: (holdingType?.color || C.primary) + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {holdingType?.icon || "💎"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {holding?.name || tx.description || "Unassigned Investment"}
                    </div>
                    <div style={{ color: C.sub, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>
                      {tx.type} • {fmtDate(tx.date || "")}
                    </div>
                  </div>
                </div>
                
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>{fmtAmt(tx.amount)}</div>
                  {tx.qty && <div style={{ color: C.sub, fontSize: 10, fontWeight: 600 }}>{tx.qty} {holding?.type === "gold" ? "g" : "units"}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
