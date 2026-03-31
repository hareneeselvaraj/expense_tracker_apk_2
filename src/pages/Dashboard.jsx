import React, { useState } from "react";
import { Ico } from "../components/ui/Ico.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { TxRow } from "../components/cards/TxRow.jsx";
import { fmtAmt, fmtDate, todayISO } from "../utils/format.js";
import { uid } from "../utils/id.js";
import { getRecentTx } from "../utils/analytics.js";
import { BLANK_TX } from "../constants/defaults.js";

const Sparkline = ({ data, color, height = 30 }) => {
  if(!data || data.length < 2) return null;
  const max = Math.max(...data.map(Math.abs), 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${50 - (v / max) * 40}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height, opacity: 0.6 }}>
      <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
};

const QuickAdd = ({ categories, onSave, theme }) => {
  const [amt, setAmt] = useState("");
  const [cat, setCat] = useState(categories[0]?.id || "");
  const C = theme;

  const submit = () => {
    if(!amt || isNaN(amt)) return;
    const selCat = categories.find(c => c.id === cat);
    const inferredType = selCat?.type || "Expense";
    const inferredCd = inferredType === "Income" ? "Credit" : "Debit";
    onSave({ ...BLANK_TX, id: uid(), amount: parseFloat(amt), category: cat, date: todayISO(), txType: inferredType, creditDebit: inferredCd });
    setAmt("");
  };

  return (
    <div style={{background:C.surface, border:`1px solid ${C.borderLight}`, borderRadius:24, padding:12, display:"flex", alignItems:"center", gap:10, boxShadow:C.shadow}}>
      <div style={{flex:1, position:"relative"}}>
        <span style={{position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", color:C.sub, fontSize:14, fontWeight:800}}>₹</span>
        <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="0.00" style={{width:"100%", background:C.input, border:"none", borderRadius:16, padding:"12px 12px 12px 28px", color:C.text, fontSize:16, fontWeight:800, fontFamily:"inherit"}} />
      </div>
      <select value={cat} onChange={e=>setCat(e.target.value)} style={{background:C.input, border:"none", borderRadius:16, padding:"12px", color:C.text, fontSize:14, fontWeight:700, outline:"none", cursor:"pointer"}}>
        {categories.slice(0, 8).map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
      </select>
      <button onClick={submit} style={{width:44, height:44, borderRadius:16, background:C.primary, color:"#fff", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform .15s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.95)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}><Ico n="plus" sz={20}/></button>
    </div>
  );
};

export default function Dashboard({ user, transactions, categories, tags, accounts, stats, netWorth, getDayFlow, viewDate, setViewDate, onEditTx, onAddTx, onSave, onSmartSync, isSyncing, theme }) {
  const C = theme;
  const dateRef = React.useRef(null);
  
  return (
    <div className="page-enter" style={{padding:"20px 20px 100px 20px",display:"flex",flexDirection:"column",gap:24}}>
      
      {/* Greeting + Month Picker */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,color:C.text,margin:0,letterSpacing:"-.03em"}}>Hello, {user?.name?.split(" ")[0]||"User"}!</h1>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
            <button onClick={()=>setViewDate(new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1))} style={{background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:"50%",padding:4,color:C.sub,cursor:"pointer"}}><Ico n="chevronLeft" sz={14}/></button>
            <span 
              onClick={() => {
                try { dateRef.current?.showPicker(); } catch (e) {}
              }}
              style={{fontSize:13,color:C.sub,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em", position:"relative", cursor:"pointer"}}
            >
              {viewDate.toLocaleString("en",{month:"long",year:"numeric"})}
              <input 
                ref={dateRef}
                type="date"
                value={viewDate.toISOString().split("T")[0]}
                onChange={(e) => {
                  if (e.target.value) setViewDate(new Date(e.target.value));
                }}
                style={{
                  position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                  opacity: 0, cursor: "pointer"
                }}
              />
            </span>
            <button onClick={()=>setViewDate(new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1))} style={{background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:"50%",padding:4,color:C.sub,cursor:"pointer"}}><Ico n="chevronRight" sz={14}/></button>
          </div>
        </div>
        <div style={{display:"flex", alignItems:"center", gap: 12}}>
          <button 
             onClick={onSmartSync} 
             disabled={isSyncing}
             style={{
               background: isSyncing ? C.muted : C.primaryDim,
               border: `1px solid ${isSyncing ? C.border : C.primary + "33"}`,
               borderRadius: 14, padding: "8px 12px", 
               color: isSyncing ? C.sub : C.primary,
               display: "flex", alignItems: "center", gap: 6,
               cursor: isSyncing ? "wait" : "pointer",
               fontWeight: 800, fontSize: 13, transition: "all .2s"
             }}
          >
             <Ico n="sync" sz={16} />
             {isSyncing ? "Syncing..." : "Sync"}
          </button>
          {user?.picture && <img src={user.picture} style={{width:44,height:44,borderRadius:14,border:`2px solid ${C.borderLight}`,boxShadow:C.shadow}} alt="Profile"/>}
        </div>
      </div>

      {/* Net Worth Hero Card */}
      <div style={{
        background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 32, padding: 24,
        position: "relative", overflow: "hidden", boxShadow: C.shadow
      }}>
        <div style={{color:C.sub, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em"}}>Current Net Worth</div>
        <div style={{color:C.text, fontSize:36, fontWeight:800, margin:"8px 0", letterSpacing:"-0.03em"}}>{fmtAmt(netWorth)}</div>
        
        <div style={{display:"flex", alignItems:"center", gap:12, marginTop:20, borderTop: `1px dashed ${C.border}`, paddingTop: 20}}>
          <div style={{flex:1}}>
            <div style={{color:C.sub, fontSize:10, fontWeight:700, marginBottom:8}}>30D FLOW</div>
            <Sparkline data={getDayFlow(30)} color={C.primary} height={36} />
          </div>
          <div style={{width:1, height:40, background:C.borderLight}}/>
          <div style={{textAlign:"right"}}>
            <div style={{color:C.income, fontSize:16, fontWeight:800}}>+{fmtAmt(transactions.filter(t=>t.creditDebit==="Credit" && t.date.startsWith(new Date().toISOString().slice(0,7))).reduce((s,t)=>s+t.amount,0))}</div>
            <div style={{color:C.sub, fontSize:10, fontWeight:700, marginTop:4}}>THIS MONTH</div>
          </div>
        </div>
      </div>

      {/* Vitals Grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:12}}>
        {[
          {l:"Inflow",a:stats.income,co:C.income,ic:"trendUp"},
          {l:"Outflow",a:stats.expense,co:C.expense,ic:"trendDown"},
          {l:"Growth",a:stats.invest,co:C.invest,ic:"stars"}
        ].map((s,i)=>(
          <div key={i} style={{
            background:C.surface, border:`1px solid ${C.borderLight}`, borderRadius:24, padding:16,
            display:"flex", flexDirection:"column", gap:12, transition:"transform .2s", boxShadow:"0 4px 12px rgba(0,0,0,0.02)"
          }}>
            <div style={{width:32,height:32,borderRadius:12,background:s.co+"15",display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${s.co}10`}}>
              <Ico n={s.ic} sz={16} c={s.co}/>
            </div>
            <div>
              <div style={{color:C.sub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em"}}>{s.l}</div>
              <div style={{color:C.text,fontSize:14,fontWeight:800,marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{fmtAmt(s.a)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Expenses (Pastel Grid) */}
      {Object.keys(stats.catMap).length>0 && (
        <div style={{background:C.surface, border:`1px solid ${C.borderLight}`, borderRadius:32, padding:24, boxShadow:C.shadow}}>
          
          <div style={{textAlign:"center", marginBottom:24}}>
            <h2 style={{color:C.text, fontSize:18, fontWeight:800, margin:0, letterSpacing:"-.02em"}}>Top Expenses</h2>
            <div style={{color:C.sub, fontSize:12, fontWeight:600, marginTop:4}}>{viewDate.toLocaleString("en",{month:"long",year:"numeric"})}</div>
          </div>
          
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24}}>
            {Object.entries(stats.catMap).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([name,amt],idx)=>{
              const cat = categories.find(c=>c.name===name);
              const max = Math.max(...Object.values(stats.catMap)); 
              const pct = Math.round((amt/max)*100);
              const bgStr = C.pastel?.[idx % C.pastel.length] || C.muted;
              
              return (
                <div key={name} style={{
                  background: bgStr, borderRadius:24, padding:16, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:8
                }}>
                   <div style={{width:36, height:36, borderRadius:12, background:"rgba(255,255,255,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18}}>
                     {cat?.emoji || "📦"}
                   </div>
                   <div style={{color:C.text, fontSize:13, fontWeight:700}}>{name}</div>
                   <div style={{background:"rgba(255,255,255,0.6)", borderRadius:12, padding:"6px 10px", fontSize:12, fontWeight:800, color:C.text, display:"inline-flex", alignItems:"center", gap:6, width:"100%", justifyContent:"center"}}>
                     {fmtAmt(amt)} 
                     <span style={{fontSize:10, fontWeight:700, opacity:0.6}}>{pct}%</span>
                   </div>
                </div>
              );
            })}
          </div>

          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", background:C.input, borderRadius:20, padding:"12px 16px", marginBottom:20}}>
            <div>
              <div style={{color:C.sub, fontSize:11, fontWeight:600}}>Total Expense</div>
              <div style={{color:C.text, fontSize:18, fontWeight:800}}>{fmtAmt(stats.expense)}</div>
            </div>
            <div style={{width:1, height:30, background:C.borderLight}}/>
            <div style={{textAlign:"right"}}>
              <div style={{color:C.sub, fontSize:11, fontWeight:600}}>Remaining Budget</div>
              <div style={{color:C.income, fontSize:18, fontWeight:800}}>{stats.expense < 50000 ? fmtAmt(50000 - stats.expense) : "Overridden"}</div>
            </div>
          </div>
          
          <button style={{width:"100%", background:`linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color:"#fff", border:"none", borderRadius:20, padding:16, fontSize:14, fontWeight:800, letterSpacing:".05em", cursor:"pointer", transition:"transform .2s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.98)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
            VIEW ALL
          </button>
        </div>
      )}

      {/* Recent Activity */}
      <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:32,padding:24, boxShadow:C.shadow}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <div style={{color:C.text,fontSize:18,fontWeight:800, letterSpacing:"-.02em"}}>Recent Activity</div>
        </div>
        <div style={{display:"flex",flexDirection:"column"}}>
          {getRecentTx(transactions, 5).map((t, idx, arr)=>(
            <React.Fragment key={t.id}>
              <div style={{padding:"8px 0"}}>
                <TxRow t={t} categories={categories} tags={tags} accounts={accounts} onClick={()=>onEditTx(t)} theme={C}/>
              </div>
              {idx < arr.length - 1 && <div style={{height:1, background:C.borderLight, margin:"4px 0"}} />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
