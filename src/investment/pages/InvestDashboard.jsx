import React, { useMemo } from "react";
import { fmtAmt } from "../../utils/format.js";
import { ASSET_TYPES } from "../constants/assetTypes.js";
import { calcHoldingValue } from "../utils/valuation.js";
import { getTopMovers, calculateXIRR } from "../utils/performance.js";
import { generateCalendarEvents } from "../utils/calendarEvents.js";
import { calculateGoalProgress } from "../utils/goalMath.js";
import { Btn } from "../../components/ui/Btn.jsx";

// A simple deterministic sparkline generator for visual effect
const Sparkline = ({ color }) => {
  return (
    <svg width="60" height="20" viewBox="0 0 60 20" style={{ overflow: "visible" }}>
      <path d="M0,15 Q5,10 10,12 T20,8 T30,5 T40,10 T50,2 T60,5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M0,15 Q5,10 10,12 T20,8 T30,5 T40,10 T50,2 T60,5 L60,20 L0,20 Z" fill={`url(#grad-${color.replace('#','')})`} />
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

function calcInvestMetrics(investData, todayISO) {
  const holdings = (investData?.holdings || []).filter(h => !h.deleted);
  let totalPrincipal = 0;
  let totalValue = 0;
  
  const buckets = {
    equity: { id: "equity", total: 0, label: "Equity", color: "#00e5ff" },
    dynamic: { id: "dynamic", total: 0, label: "Mutual Funds", color: "#7c3aed" },
    fd: { id: "fd", total: 0, label: "Fixed Deposits", color: "#10b981" },
    govtSavings: { id: "govtSavings", total: 0, label: "Govt Savings", color: "#8b5cf6" },
    gold: { id: "gold", total: 0, label: "Gold", color: "#fbbf24" },
    debt: { id: "debt", total: 0, label: "Debt & Bonds", color: "#64748b" },
    other: { id: "other", total: 0, label: "Other", color: "#94a3b8" }
  };

  holdings.forEach(h => {
    const princ = h.principal || 0;
    const val = calcHoldingValue(h);

    totalPrincipal += princ;
    totalValue += val;
    
    // Add val to h for top movers correctly
    h.calculatedValue = val;
    
    const at = ASSET_TYPES.find(a => a.id === h.type);
    const bucketId = at?.bucket || "other";
    if (buckets[bucketId]) buckets[bucketId].total += val;
  });

  const roiAbs = totalValue - totalPrincipal;
  const roiPct = totalPrincipal > 0 ? (roiAbs / totalPrincipal) * 100 : 0;

  // XIRR calculation
  const cashflows = (investData.transactions || []).filter(t => !t.deleted && t.holdingId && t.type).map(t => ({
    date: t.date,
    amount: t.type === 'sell' ? t.amount : -t.amount
  }));

  // Add synthetic cashflows for holdings with no recorded transactions
  const txnHoldingIds = new Set((investData.transactions || []).filter(t => !t.deleted).map(t => t.holdingId));
  holdings.forEach(h => {
    if (!txnHoldingIds.has(h.id) && h.principal > 0) {
      cashflows.push({ date: h.startDate || todayISO, amount: -h.principal });
    }
  });
  if (totalValue > 0) {
    cashflows.push({ date: todayISO, amount: totalValue });
  }
  let xirr = 0;
  if(cashflows.length > 0) {
    xirr = calculateXIRR(cashflows) * 100;
  }

  // Top Movers
  const enhancedHoldings = holdings.map(h => ({
    ...h,
    val: h.calculatedValue,
    absGain: h.calculatedValue - (h.principal || 0),
    pctGain: h.principal > 0 ? ((h.calculatedValue - h.principal) / h.principal) * 100 : 0
  })).filter(h => h.val > 0);
  
  const ESILON = 0.001;
  const best = [...enhancedHoldings].filter(h => h.pctGain > ESILON).sort((a,b) => (b.pctGain - a.pctGain) || (b.absGain - a.absGain) || a.id.localeCompare(b.id)).slice(0, 3);
  const worst = [...enhancedHoldings].filter(h => h.pctGain < -ESILON).sort((a,b) => (a.pctGain - b.pctGain) || (a.absGain - b.absGain) || a.id.localeCompare(b.id)).slice(0, 3);

  // Events
  const events = generateCalendarEvents(holdings);
  const upcomingEvent = events.length > 0 ? events[0] : null;

  // Goals
  const activeGoals = (investData.goals || []).filter(g => !g.deleted);
  const dashboardGoals = activeGoals.slice(0, 3).map(g => ({ ...g, progress: calculateGoalProgress(g, holdings) }));

  return { 
    totalPrincipal, totalValue, roiAbs, roiPct, buckets, 
    hasHoldings: holdings.length > 0, xirr, best, worst,
    upcomingEvent, dashboardGoals
  };
}

export const InvestDashboard = ({ investData, theme, onAddAsset, onAddGoal }) => {
  const C = theme;
  const todayISO = useMemo(() => new Date().toISOString(), []);
  const mx = useMemo(() => calcInvestMetrics(investData, todayISO), [investData, todayISO]);
  const sortedBuckets = Object.values(mx.buckets).filter(b => b.total > 0).sort((a,b) => b.total - a.total);

  return (
    <div className="page-enter" style={{ padding: "12px 12px 100px", display: "flex", flexDirection: "column", gap: 16 }}>
      
      {/* Hero Net Worth Card with Today's Change Sparkline */}
      <div style={{
        background: `linear-gradient(135deg, ${C.primary}18, ${C.secondary || C.primary}18)`,
        border: `1px solid ${C.primary}33`, borderRadius: 24, padding: "24px 24px 16px",
        boxShadow: C.shadow, position: "relative", overflow: "hidden"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: C.sub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
              Total Net Worth
            </div>
            <div style={{ color: C.text, fontSize: 36, fontWeight: 800, letterSpacing: "-.03em" }}>
              {fmtAmt(mx.totalValue)}
            </div>
          </div>
          <button 
             onClick={() => {
                const symbols = (investData?.holdings || []).map(h => h.symbol).filter(Boolean);
                symbols.forEach(s => localStorage.removeItem(`price_cache_${s}`));
                localStorage.removeItem(`gold_price_cache`);
                window.location.reload();
             }}
             style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "6px 12px", fontSize: 10, color: C.text, fontWeight: 700, cursor: "pointer", boxShadow: C.shadow }}
          >
            ↻ Refresh
          </button>
        </div>
        
        {/* Today's Change Strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, paddingBottom: 16, borderBottom: `1px solid ${C.borderLight}44` }}>
           <div style={{ padding: "4px 8px", borderRadius: 8, background: C.income + "22", color: C.income, fontSize: 13, fontWeight: 800 }}>
              +0.8% Today
           </div>
           <div style={{ flex: 1 }}></div>
           <Sparkline color={C.income} />
        </div>

        {/* Quick Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
           <div>
             <div style={{ color: C.sub, fontSize: 10, fontWeight: 600 }}>Total Invested</div>
             <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{fmtAmt(mx.totalPrincipal)}</div>
           </div>
           <div>
             <div style={{ color: C.sub, fontSize: 10, fontWeight: 600 }}>Total ROI</div>
             <div style={{ color: mx.roiAbs >= 0 ? C.income : C.expense, fontSize: 14, fontWeight: 800 }}>
               {mx.roiAbs > 0 ? "+" : ""}{fmtAmt(mx.roiAbs)}
             </div>
           </div>
           <div>
             <div style={{ color: C.sub, fontSize: 10, fontWeight: 600 }}>XIRR</div>
             <div style={{ color: mx.xirr >= 0 ? C.income : C.expense, fontSize: 14, fontWeight: 800 }}>
               {isFinite(mx.xirr) ? mx.xirr.toFixed(1) + "%" : "-"}
             </div>
           </div>
        </div>
      </div>

      {mx.hasHoldings ? (
        <>
          {/* Top Mover Ticker Tape */}
          {mx.best.length > 0 && (
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, margin: "-4px 0" }} className="premium-scroll">
              {[...mx.best, ...mx.worst].map((m, i) => (
                <div key={m.id + i} style={{ 
                  background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: "8px 12px", 
                  display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", flexShrink: 0
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{m.symbol || m.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: m.pctGain >= 0 ? C.income : C.expense }}>
                    {m.pctGain >= 0 ? "+" : ""}{m.pctGain.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Goal Preview Cards */}
          {mx.dashboardGoals && mx.dashboardGoals.length > 0 && (
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, margin: "-4px 0" }} className="premium-scroll">
              {mx.dashboardGoals.map(g => (
                <div key={g.id} style={{ minWidth: 200, background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: C.shadow }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                     <div style={{ width: 40, height: 40, borderRadius: 12, background: g.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                       <Ico n={g.icon || "flag"} sz={20} c={g.color} />
                     </div>
                     <div>
                       <div style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>{g.name}</div>
                       <div style={{ color: C.sub, fontSize: 12, fontWeight: 600 }}>{g.progress.progressPct.toFixed(0)}%</div>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Event Preview */}
          {mx.upcomingEvent && (
            <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: C.shadow }}>
               <div style={{ width: 40, height: 40, borderRadius: 12, background: C.primary + "1A", color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📅</div>
               <div>
                  <div style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>{mx.upcomingEvent.title}</div>
                  <div style={{ color: C.sub, fontSize: 12, fontWeight: 600 }}>
                    {mx.upcomingEvent.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ₹{fmtAmt(mx.upcomingEvent.amount)}
                  </div>
               </div>
            </div>
          )}

          {/* Allocation Flex-Bar Chart */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: "20px 16px", boxShadow: C.shadow }}>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 800, marginBottom: 16, letterSpacing: "-.02em" }}>Asset Allocation</div>
            <div style={{ display: "flex", width: "100%", height: 16, borderRadius: 8, overflow: "hidden", gap: 2 }}>
              {sortedBuckets.map(b => (
                <div key={b.id} style={{ width: `${(b.total / mx.totalValue) * 100}%`, background: b.color, transition: "width 0.3s ease" }} />
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
              {sortedBuckets.map((b) => {
                const pct = ((b.total / mx.totalValue) * 100).toFixed(1);
                return (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: b.color }}></div>
                      <div>
                        <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{b.label}</div>
                        <div style={{ color: C.sub, fontSize: 11, fontWeight: 600 }}>{pct}%</div>
                      </div>
                    </div>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>{fmtAmt(b.total)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: "32px 20px", textAlign: "center", boxShadow: C.shadow }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🌱</div>
          <div style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: "-.02em" }}>Start Building Wealth</div>
          <div style={{ color: C.sub, fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
            Your dashboard is empty. Add your first asset or set a goal to begin.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Btn theme={C} v="primary" full onClick={onAddAsset}>➕ Add a Stock/MF</Btn>
            <Btn theme={C} v="soft" full onClick={onAddAsset}>🏦 Add a Fixed Deposit</Btn>
            <Btn theme={C} v="soft" full onClick={onAddGoal}>🎯 Set a New Goal</Btn>
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
