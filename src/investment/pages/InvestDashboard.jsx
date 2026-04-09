import React, { useMemo } from "react";
import { fmtAmt } from "../../utils/format.js";
import { ASSET_TYPES } from "../constants/assetTypes.js";

function calcInvestMetrics(investData) {
  const holdings = (investData?.holdings || []).filter(h => !h.deleted);
  let totalPrincipal = 0;
  let totalValue = 0;
  
  const buckets = {
    equity: { id: "equity", total: 0, label: "Equity", color: "#00e5ff", emoji: "📈" },
    dynamic: { id: "dynamic", total: 0, label: "Mutual Funds & NPS", color: "#7c3aed", emoji: "📊" },
    fd: { id: "fd", total: 0, label: "Fixed Deposits (FD & RD)", color: "#10b981", emoji: "🏦" },
    govtSavings: { id: "govtSavings", total: 0, label: "Govt Savings (PPF/EPF)", color: "#8b5cf6", emoji: "🛡️" },
    gold: { id: "gold", total: 0, label: "Gold", color: "#fbbf24", emoji: "🥇" },
    debt: { id: "debt", total: 0, label: "Debt & Bonds", color: "#64748b", emoji: "📜" },
    other: { id: "other", total: 0, label: "Other", color: "#94a3b8", emoji: "💼" }
  };

  holdings.forEach(h => {
    const princ = h.principal || 0;
    
    let val = princ; // default to principal fallback
    if (h.qty !== undefined && h.currentPrice !== undefined) {
      val = h.qty * h.currentPrice;
    } else if (h.currentPrice !== undefined) {
      val = h.currentPrice;
    }

    totalPrincipal += princ;
    totalValue += val;
    
    const at = ASSET_TYPES.find(a => a.id === h.type);
    const bucketId = at?.bucket || "other";
    
    if (buckets[bucketId]) {
      buckets[bucketId].total += val;
    }
  });

  const roiAbs = totalValue - totalPrincipal;
  const roiPct = totalPrincipal > 0 ? (roiAbs / totalPrincipal) * 100 : 0;

  return { totalPrincipal, totalValue, roiAbs, roiPct, buckets, hasHoldings: holdings.length > 0 };
}

export const InvestDashboard = ({ investData, theme }) => {
  const C = theme;
  const mx = useMemo(() => calcInvestMetrics(investData), [investData]);
  
  const sortedBuckets = Object.values(mx.buckets)
    .filter(b => b.total > 0)
    .sort((a,b) => b.total - a.total);

  return (
    <div className="page-enter" style={{ padding: "12px 12px 100px", display: "flex", flexDirection: "column", gap: 16 }}>
      
      {/* Hero Net Worth Card */}
      <div style={{
        background: `linear-gradient(135deg, ${C.primary}18, ${C.secondary || C.primary}18)`,
        border: `1px solid ${C.primary}33`, borderRadius: 24, padding: 24,
        boxShadow: C.shadow, position: "relative", overflow: "hidden"
      }}>
        <div style={{ color: C.sub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
          Total Net Worth
        </div>
        <div style={{ color: C.text, fontSize: 36, fontWeight: 800, letterSpacing: "-.03em" }}>
          {fmtAmt(mx.totalValue)}
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
           <div>
             <div style={{ color: C.sub, fontSize: 10, fontWeight: 600 }}>Total Principal</div>
             <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{fmtAmt(mx.totalPrincipal)}</div>
           </div>
           
           <div style={{ width: 1, height: 24, background: C.borderLight }}></div>
           
           <div>
             <div style={{ color: C.sub, fontSize: 10, fontWeight: 600 }}>Total ROI</div>
             <div style={{ color: mx.roiAbs >= 0 ? C.income : C.expense, fontSize: 14, fontWeight: 800 }}>
               {mx.roiAbs > 0 ? "+" : ""}{fmtAmt(mx.roiAbs)} ({mx.roiAbs > 0 ? "+" : ""}{mx.roiPct.toFixed(2)}%)
             </div>
           </div>
        </div>
      </div>

      {mx.hasHoldings ? (
        <>
          {/* Allocation Flex-Bar Chart */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: "20px 16px", boxShadow: C.shadow }}>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 800, marginBottom: 16, letterSpacing: "-.02em" }}>Asset Allocation</div>
            
            {/* The Flex Bar */}
            <div style={{ display: "flex", width: "100%", height: 16, borderRadius: 8, overflow: "hidden", gap: 2 }}>
              {sortedBuckets.map(b => (
                <div key={b.id} style={{ width: `${(b.total / mx.totalValue) * 100}%`, background: b.color, transition: "width 0.3s ease" }} title={`${b.label}: ${fmtAmt(b.total)}`} />
              ))}
            </div>

            {/* Allocation Breakdown List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
              {sortedBuckets.map((b, idx) => {
                const pct = ((b.total / mx.totalValue) * 100).toFixed(1);
                return (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: b.color }}></div>
                      <div>
                        <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{b.label}</div>
                        <div style={{ color: C.sub, fontSize: 11, fontWeight: 600 }}>{pct}% of portfolio</div>
                      </div>
                    </div>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>
                      {fmtAmt(b.total)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: 40, textAlign: "center", boxShadow: C.shadow }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Start Investing</div>
          <div style={{ color: C.sub, fontSize: 13, lineHeight: 1.5, maxWidth: 260, margin: "0 auto" }}>
            Add your first holding by tapping the + button below to begin tracking your investment portfolio.
          </div>
        </div>
      )}

      {/* Unassigned Transactions */}
      {(() => {
        const unassigned = (investData.transactions || []).filter(t => !t.deleted && !t.holdingId);
        if (unassigned.length === 0) return null;
        const totalUnassigned = unassigned.reduce((s, t) => s + (t.amount || 0), 0);
        return (
          <div style={{ background: C.primary + "12", border: `2px dashed ${C.primary}33`, borderRadius: 24, padding: 20, boxShadow: C.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                 <div style={{ color: C.primary, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>Unassigned Investments</div>
                 <div style={{ color: C.sub, fontSize: 11 }}>{unassigned.length} items from Expense Tracker</div>
              </div>
              <div style={{ color: C.text, fontSize: 18, fontWeight: 800 }}>{fmtAmt(totalUnassigned)}</div>
            </div>
            
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }} className="premium-scroll">
               {unassigned.slice(0, 5).map(u => (
                 <div key={u.id} style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "8px 12px", minWidth: 140 }}>
                    <div style={{ color: C.text, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.description || "Investment"}</div>
                    <div style={{ color: C.primary, fontSize: 13, fontWeight: 800, marginTop: 2 }}>{fmtAmt(u.amount)}</div>
                 </div>
               ))}
               {unassigned.length > 5 && (
                 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px", color: C.sub, fontSize: 11, fontWeight: 700 }}>
                   +{unassigned.length - 5} more
                 </div>
               )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
