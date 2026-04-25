import React from "react";
import { Ico } from "../components/ui/Ico.jsx";
import { fmtAmt, fmtDate, dateRange, periodLabel } from "../utils/format.js";

export default function ReportsPage({ 
  reportTab, 
  setReportTab, 
  reportsMode, 
  setReportsMode, 
  reportsSubTab, 
  setReportsSubTab, 
  reportDate, 
  setReportDate, 
  filtered, // Globally filtered transactions from App.jsx
  categories,
  tags,
  theme 
}) {
  const C = theme;
  const dateRef = React.useRef(null);

  // 1. Filter by current Report's timeframe (Week/Month/Year)
  const reportTx = React.useMemo(() => {
    const [from, to] = dateRange(reportTab, reportDate);
    return filtered.filter(t => t.date >= from && t.date <= to);
  }, [filtered, reportTab, reportDate]);

  // 2. Calculate Stats
  const stats = React.useMemo(() => {
    const inc = reportTx.filter(t => t.txType === "Income").reduce((s, t) => s + t.amount, 0);
    const exp = reportTx.filter(t => t.txType === "Expense").reduce((s, t) => s + t.amount, 0);
    const inv = reportTx.filter(t => t.txType === "Investment").reduce((s, t) => s + t.amount, 0);
    return { inc, exp, inv, net: inc - exp - inv };
  }, [reportTx]);

  const savingsRate = stats.inc > 0 ? Math.round(((stats.inc - stats.exp) / stats.inc) * 100) : 0;

  // 3. Aggregate for Breakdown view
  const aggrData = React.useMemo(() => {
    const expenseTx = reportTx.filter(t => t.txType === "Expense");
    const map = expenseTx.reduce((acc, t) => {
      if (reportsMode === "category") {
        const k = categories.find(c => c.id === t.category)?.name || "Other";
        acc[k] = (acc[k] || 0) + t.amount;
      } else {
        // Tag mode: iterate ALL tags per transaction
        const txTags = (t.tags || []).filter(tid => {
          const tg = tags.find(tg => tg.id === tid);
          return tg && !tg.deleted;
        });
        if (txTags.length === 0) {
          acc["Untagged"] = (acc["Untagged"] || 0) + t.amount;
        } else {
          txTags.forEach(tid => {
            const name = tags.find(tg => tg.id === tid)?.name || "Tag";
            acc[name] = (acc[name] || 0) + t.amount;
          });
        }
      }
      return acc;
    }, {});
    return Object.entries(map).sort((a,b) => b[1] - a[1]);
  }, [reportTx, reportsMode, categories, tags]);

  const maxVal = aggrData.length > 0 ? aggrData[0][1] : 1;

  // 4. Trend Data calculation
  const trendData = React.useMemo(() => {
    if (reportsSubTab !== "trend" || reportTx.length === 0) return [];
    const map = {};
    reportTx.filter(t => t.txType === "Expense").forEach(t => {
      const gKey = reportTab === "year" ? (t.date?.substring(0, 7) || "") : (t.date || "");
      map[gKey] = (map[gKey] || 0) + t.amount;
    });
    const sorted = Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
    if (sorted.length === 0) return [];
    const max = Math.max(...sorted.map(x=>x[1]));
    return sorted.map(([k,v]) => ({ 
      label: reportTab === "year" ? new Date(k+"-01").toLocaleString("en", {month:"short"}).toUpperCase() : k.slice(-2), 
      val: v, 
      pct: (v/max)*100 
    }));
  }, [reportTx, reportTab, reportsSubTab]);

  return (
    <div className="page-enter" style={{padding:"0 0 80px 0",display:"flex",flexDirection:"column",gap:16}}>
      {/* Tab Selector (Week/Month/Year) */}
      <div style={{display:"flex",background:C.input,borderRadius:20,padding:3}}>
        {["week","month","year"].map(t=>(
          <button key={t} onClick={()=>setReportTab(t)} style={{
            flex:1,padding:"8px",borderRadius:16,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,textTransform:"capitalize",
            background:reportTab===t?C.primary:"transparent", 
            color:reportTab===t? "#fff" : C.sub,
            boxShadow:reportTab===t?`0 2px 8px ${C.primary}40`:"none",
            transition:"all .2s ease"
          }}>{t}</button>
        ))}
      </div>

      {/* Mode & Sub-Tab Switchers */}
      <div style={{display:"flex", flexDirection:"column", gap:8}}>
        <div style={{display:"flex", background:C.input, borderRadius:20, padding:4}}>
          {[{id:"category",icon:"grid",label:"Category"},{id:"tag",icon:"tag",label:"Tag"},{id:"breakdown",icon:"analyze",label:"Breakdown"},{id:"trend",icon:"trendUp",label:"Trend"}].map(m => {
            const isMode = m.id === "category" || m.id === "tag";
            const isActive = isMode ? reportsMode === m.id : reportsSubTab === m.id;
            const onClick = isMode ? () => setReportsMode(m.id) : () => setReportsSubTab(m.id);
            return (
              <button key={m.id} onClick={onClick} style={{
                flex:1, padding:"8px 6px", borderRadius:16, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                background:isActive?C.surface:"transparent",
                color:isActive?C.primary:C.sub, transition:"all .2s",
                boxShadow:isActive?"0 2px 8px rgba(0,0,0,0.02)":"none"
              }}>
                <Ico n={m.icon} sz={14} c={isActive?C.primary:C.sub}/>
                <span style={{fontSize:11, fontWeight:700}}>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16, marginTop:6}}>
        <button onClick={()=>{
          const d = new Date(reportDate);
          if(reportTab==="week") d.setDate(d.getDate()-7);
          else if(reportTab==="month") d.setMonth(d.getMonth()-1);
          else d.setFullYear(d.getFullYear()-1);
          setReportDate(d);
        }} style={{background:C.primaryDim,border:`1px solid ${C.primary}33`,borderRadius:"50%",padding:6,color:C.primary,cursor:"pointer",display:"flex", transition:"transform .2s"}}><Ico n="chevronLeft" sz={14}/></button>
        <span 
          onClick={() => {
            try { dateRef.current?.showPicker(); } catch (e) {}
          }}
          style={{fontSize:13,color:C.text,fontWeight:800,minWidth:140,textAlign:"center", letterSpacing:"-.02em", textTransform:"capitalize", fontFamily:"'JetBrains Mono',monospace", position:"relative", display:"inline-block", cursor:"pointer"}}
        >
          {reportTab==="week" ? `Wk ${fmtDate(reportDate).slice(0,6)}` : reportTab==="month" ? reportDate.toLocaleString("en",{month:"long",year:"numeric"}) : `Year ${reportDate.getFullYear()}`}
          <input 
            ref={dateRef}
            type="date"
            value={reportDate.toISOString().split("T")[0]}
            onChange={(e) => {
              if (e.target.value) setReportDate(new Date(e.target.value));
            }}
            style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              opacity: 0, cursor: "pointer"
            }}
          />
        </span>
        <button onClick={()=>{
          const d = new Date(reportDate);
          if(reportTab==="week") d.setDate(d.getDate()+7);
          else if(reportTab==="month") d.setMonth(d.getMonth()+1);
          else d.setFullYear(d.getFullYear()+1);
          setReportDate(d);
        }} style={{background:C.primaryDim,border:`1px solid ${C.primary}33`,borderRadius:"50%",padding:6,color:C.primary,cursor:"pointer",display:"flex", transition:"transform .2s"}}><Ico n="chevronRight" sz={14}/></button>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Re-structured Net Flow Hero & Stats */}
          <div style={{
            borderRadius: 14, padding: "12px", overflow: "hidden",
            boxShadow: C.shadow, border: `1px solid ${C.borderLight}`, background: C.surface
          }}>
            {/* Net Flow — compact row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{color:C.sub,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em"}}>Net</span>
                <span style={{color:stats.net>=0?C.income:C.expense,fontSize:16,fontWeight:900,letterSpacing:"-.02em"}}>
                  {stats.net>=0?"+":"−"}{fmtAmt(Math.abs(stats.net))}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{color:C.text,fontSize:11,fontWeight:700}}>{reportTx.length} items</span>
                {stats.inc > 0 && <span style={{color:C.sub,fontSize:10,fontWeight:600,background:C.input,padding:"2px 8px",borderRadius:8}}>{savingsRate}%</span>}
              </div>
            </div>

            {/* INC / EXP / INV — compact pills */}
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ flex: 1, background: C.input, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{color:C.sub,fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",marginBottom:2}}>Income</div>
                <div style={{color:C.income,fontSize:13,fontWeight:800}}>{fmtAmt(stats.inc)}</div>
              </div>
              <div style={{ flex: 1, background: C.input, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{color:C.sub,fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",marginBottom:2}}>Expense</div>
                <div style={{color:C.expense,fontSize:13,fontWeight:800}}>{fmtAmt(stats.exp)}</div>
              </div>
              {stats.inv > 0 && (
                <div style={{ flex: 1, background: C.input, borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{color:C.sub,fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",marginBottom:2}}>Invest</div>
                  <div style={{color:C.invest,fontSize:13,fontWeight:800}}>{fmtAmt(stats.inv)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Content Area (Breakdown vs Trend) */}
          <div style={{background:C.surface, borderRadius:14,padding:12, border:`1px solid ${C.borderLight}`, boxShadow:C.shadow}}>
            <div style={{color:C.text,fontSize:12,fontWeight:800,marginBottom:10,display:"flex",alignItems:"center",gap:6, letterSpacing:"-.02em"}}>
              <Ico n={reportsSubTab==="trend"?"trendUp":"chart"} sz={14} c={C.primary}/> 
              {reportsSubTab==="trend" ? "Expense Trend" : `${reportsMode==="category"?"Category":"Tag"} Allocation`}
            </div>

            {reportsSubTab === "trend" ? (
              <div style={{width:"100%", overflowX:"auto", scrollbarWidth:"none"}}>
                {trendData.length === 0 ? (
                  <div style={{width:"100%", padding:40, textAlign:"center", color:C.sub, fontSize:13, fontWeight:600}}>No expense data for trend</div>
                ) : (() => {
                  const W = Math.max(trendData.length * 60, 300);
                  const H = 200;
                  const pad = {t:20, r:20, b:40, l:20};
                  const cW = W - pad.l - pad.r;
                  const cH = H - pad.t - pad.b;
                  const maxV = Math.max(...trendData.map(d => d.val), 1);
                  const pts = trendData.map((d,i) => ({
                    x: pad.l + (i / Math.max(trendData.length - 1, 1)) * cW,
                    y: pad.t + cH - (d.val / maxV) * cH,
                    ...d
                  }));
                  const linePath = pts.map((p,i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
                  const areaPath = linePath + ` L${pts[pts.length-1].x},${pad.t+cH} L${pts[0].x},${pad.t+cH} Z`;
                  return (
                    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
                      <defs>
                        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.primary} stopOpacity="0.25"/>
                          <stop offset="100%" stopColor={C.primary} stopOpacity="0.02"/>
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      {[0,0.25,0.5,0.75,1].map((f,i) => (
                        <line key={i} x1={pad.l} x2={W-pad.r} y1={pad.t+cH*(1-f)} y2={pad.t+cH*(1-f)} stroke={C.borderLight} strokeWidth="1" strokeDasharray="4 4"/>
                      ))}
                      {/* Area fill */}
                      <path d={areaPath} fill="url(#trendFill)"/>
                      {/* Line */}
                      <path d={linePath} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      {/* Dots + Labels */}
                      {pts.map((p,i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="4" fill={C.primary} stroke={C.surface} strokeWidth="2"/>
                          <text x={p.x} y={p.y - 10} textAnchor="middle" fill={C.sub} fontSize="9" fontWeight="700">{fmtAmt(p.val)}</text>
                          <text x={p.x} y={H - 8} textAnchor="middle" fill={C.sub} fontSize="10" fontWeight="700">{p.label}</text>
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {aggrData.length === 0 ? (
                  <div style={{padding:24, textAlign:"center", color:C.sub, fontSize:11, fontWeight:600}}>No data available</div>
                ) : aggrData.map(([name,val],idx)=>(
                  <div key={idx}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:700,marginBottom:4}}>
                      <span style={{color:C.text, letterSpacing:"-.01em"}}>{name}</span>
                      <span style={{color:C.text,fontWeight:800}}>{fmtAmt(val)}</span>
                    </div>
                    <div style={{height:6,background:C.input,borderRadius:3,overflow:"hidden"}}>
                      <div style={{
                        height:"100%",width:`${(val/maxVal)*100}%`,borderRadius:3,
                        background:C.primary
                      }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
