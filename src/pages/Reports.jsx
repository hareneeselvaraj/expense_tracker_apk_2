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
    return { inc, exp, net: inc - exp };
  }, [reportTx]);

  const savingsRate = stats.inc > 0 ? Math.round(((stats.inc - stats.exp) / stats.inc) * 100) : 0;

  // 3. Aggregate for Breakdown view
  const aggrData = React.useMemo(() => {
    const expenseTx = reportTx.filter(t => t.txType === "Expense");
    const map = expenseTx.reduce((acc, t) => {
      const k = reportsMode === "category" 
        ? (categories.find(c => c.id === t.category)?.name || "Other") 
        : (t.tags?.[0] ? (tags.find(tg => tg.id === t.tags[0])?.name || "Tag") : "Untagged");
      acc[k] = (acc[k] || 0) + t.amount;
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
      const gKey = reportTab === "year" ? t.date.substring(0, 7) : t.date;
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
    <div className="page-enter" style={{padding:"20px 20px 100px 20px",display:"flex",flexDirection:"column",gap:24}}>
      <div style={{height:10}} />

      {/* Tab Selector (Week/Month/Year) */}
      <div style={{display:"flex",background:C.input,borderRadius:24,padding:4}}>
        {["week","month","year"].map(t=>(
          <button key={t} onClick={()=>setReportTab(t)} style={{
            flex:1,padding:"10px",borderRadius:20,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,textTransform:"capitalize",
            background:reportTab===t?C.primary:"transparent", 
            color:reportTab===t? "#fff" : C.sub,
            boxShadow:reportTab===t?`0 4px 12px ${C.primary}40`:"none",
            transition:"all .2s ease"
          }}>{t}</button>
        ))}
      </div>

      {/* Mode & Sub-Tab Switchers */}
      <div style={{display:"flex", gap:12, alignItems:"center"}}>
        <div style={{display:"flex", background:C.input, borderRadius:20, padding:4, flex:1}}>
          {[{id:"category",icon:"grid",label:"Category"},{id:"tag",icon:"tag",label:"Tag"}].map(m => (
            <button key={m.id} onClick={()=>setReportsMode(m.id)} style={{
              flex:1, padding:"8px", borderRadius:16, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              background:reportsMode===m.id?C.surface:"transparent",
              color:reportsMode===m.id?C.primary:C.sub, transition:"all .2s",
              boxShadow:reportsMode===m.id?"0 2px 8px rgba(0,0,0,0.02)":"none"
            }}>
              <Ico n={m.icon} sz={16} c={reportsMode===m.id?C.primary:C.sub}/>
              <span style={{fontSize:12, fontWeight:700, textTransform:"capitalize"}}>{m.label}</span>
            </button>
          ))}
        </div>
        
        <div style={{display:"flex", background:C.input, borderRadius:20, padding:4, flex:1.2}}>
          {[{id:"breakdown",icon:"analyze",label:"Breakdown"},{id:"trend",icon:"trendUp",label:"Trend"}].map(s => (
            <button key={s.id} onClick={()=>setReportsSubTab(s.id)} style={{
              flex:1, padding:"8px", borderRadius:16, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              background:reportsSubTab===s.id?C.surface:"transparent",
              color:reportsSubTab===s.id?C.primary:C.sub, transition:"all .2s",
              boxShadow:reportsSubTab===s.id?"0 2px 8px rgba(0,0,0,0.02)":"none"
            }}>
              <Ico n={s.icon} sz={16} c={reportsSubTab===s.id?C.primary:C.sub}/>
              <span style={{fontSize:12, fontWeight:700, textTransform:"capitalize"}}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Period Navigation */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20, marginTop:10}}>
        <button onClick={()=>{
          const d = new Date(reportDate);
          if(reportTab==="week") d.setDate(d.getDate()-7);
          else if(reportTab==="month") d.setMonth(d.getMonth()-1);
          else d.setFullYear(d.getFullYear()-1);
          setReportDate(d);
        }} style={{background:C.primaryDim,border:`1px solid ${C.primary}33`,borderRadius:"50%",padding:10,color:C.primary,cursor:"pointer",display:"flex", transition:"transform .2s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}><Ico n="chevronLeft" sz={18}/></button>
        <span 
          onClick={() => {
            try { dateRef.current?.showPicker(); } catch (e) {}
          }}
          style={{fontSize:15,color:C.text,fontWeight:800,minWidth:160,textAlign:"center", letterSpacing:"-.02em", textTransform:"capitalize", fontFamily:"'JetBrains Mono',monospace", position:"relative", display:"inline-block", cursor:"pointer"}}
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
        }} style={{background:C.primaryDim,border:`1px solid ${C.primary}33`,borderRadius:"50%",padding:10,color:C.primary,cursor:"pointer",display:"flex", transition:"transform .2s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}><Ico n="chevronRight" sz={18}/></button>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Compressed Net Flow Hero & Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16,
            borderRadius:32, padding: "24px", position:"relative", overflow:"hidden",
            boxShadow: C.shadow,
            border:`1px solid ${C.borderLight}`, alignItems:"center", background:C.surface
          }}>
            
            {/* NET */}
            <div style={{ borderRight: `1px solid ${C.borderLight}`, paddingRight: 16, position:"relative", zIndex:2 }}>
              <div style={{color:C.sub,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",marginBottom:8}}>Net Flow</div>
              <div style={{color:stats.net>=0?C.income:C.expense,fontSize:28,fontWeight:900,letterSpacing:"-.02em"}}>
                {stats.net>=0?"+":"−"}{fmtAmt(Math.abs(stats.net))}
              </div>
              <div style={{color:C.sub,fontSize:12,marginTop:6,fontWeight:600}}>{reportTx.length} items {stats.inc > 0 ? `• ${savingsRate}% saved` : ""}</div>
            </div>

            {/* INC */}
            <div style={{ paddingLeft: 8, position:"relative", zIndex:2 }}>
              <div style={{color:C.sub,fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:6, letterSpacing:".05em"}}>Income</div>
              <div style={{color:C.income,fontSize:20,fontWeight:800}}>{fmtAmt(stats.inc)}</div>
            </div>

            {/* EXP */}
            <div style={{ position:"relative", zIndex:2 }}>
              <div style={{color:C.sub,fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:6, letterSpacing:".05em"}}>Expense</div>
              <div style={{color:C.expense,fontSize:20,fontWeight:800}}>{fmtAmt(stats.exp)}</div>
            </div>
          </div>

          {/* Content Area (Breakdown vs Trend) */}
          <div style={{background:C.surface, borderRadius:32,padding:24, border:`1px solid ${C.borderLight}`, boxShadow:C.shadow}}>
            <div style={{color:C.text,fontSize:18,fontWeight:800,marginBottom:28,display:"flex",alignItems:"center",gap:10, letterSpacing:"-.02em"}}>
              <Ico n={reportsSubTab==="trend"?"trendUp":"chart"} sz={22} c={C.primary}/> 
              {reportsSubTab==="trend" ? "Expense Trend" : `${reportsMode==="category"?"Category":"Tag"} Allocation`}
            </div>

            {reportsSubTab === "trend" ? (
              <div style={{display:"flex", alignItems:"flex-end", gap:12, height:200, paddingBottom:20, overflowX:"auto", scrollbarWidth:"none"}}>
                {trendData.length === 0 ? (
                  <div style={{width:"100%", padding:40, textAlign:"center", color:C.sub, fontSize:13, fontWeight:600}}>No expense data for trend</div>
                ) : trendData.map((d, i) => (
                  <div key={i} style={{flex:1, minWidth:32, display:"flex", flexDirection:"column", alignItems:"center", gap:8, height:"100%"}}>
                    <div style={{flex:1, display:"flex", alignItems:"flex-end", width:"100%", justifyContent:"center"}}>
                      <div style={{
                        width:"100%", maxWidth:32, height:`${Math.max(d.pct, 4)}%`, borderRadius:8,
                        background:C.primary,
                        transition:"height 0.4s ease"
                      }} />
                    </div>
                    <div style={{color:C.sub, fontSize:11, fontWeight:700}} title={fmtAmt(d.val)}>{d.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:20}}>
                {aggrData.length === 0 ? (
                  <div style={{padding:40, textAlign:"center", color:C.sub, fontSize:13, fontWeight:600}}>No data available for display</div>
                ) : aggrData.map(([name,val],idx)=>(
                  <div key={idx}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,marginBottom:10}}>
                      <span style={{color:C.text, letterSpacing:"-.01em"}}>{name}</span>
                      <span style={{color:C.text,fontWeight:800}}>{fmtAmt(val)}</span>
                    </div>
                    <div style={{height:12,background:C.input,borderRadius:6,overflow:"hidden"}}>
                      <div style={{
                        height:"100%",width:`${(val/maxVal)*100}%`,borderRadius:6,
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
