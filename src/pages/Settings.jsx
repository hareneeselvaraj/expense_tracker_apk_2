import React, { useState, useMemo } from "react";
import { Ico } from "../components/ui/Ico.jsx";
import { Btn } from "../components/ui/Btn.jsx";

export default function SettingsPage({ 
  themeMode, 
  toggleTheme, 
  onShowBackup, 
  onExportBackup, 
  onImportBackup, 
  onClearData,
  onLogout,
  onOpenInvestments,
  investData,
  user,
  transactions,
  emailPrefs,
  onSetEmailPrefs,
  onSendYearSummary,
  theme 
}) {
  const C = theme;

  const portfolioValue = useMemo(() => {
    const holdings = (investData?.holdings || []).filter(h => !h.deleted);
    return holdings.reduce((sum, h) => {
      if (h.qty !== undefined && h.currentPrice !== undefined) return sum + (h.qty * h.currentPrice);
      if (h.currentPrice !== undefined) return sum + h.currentPrice;
      return sum + (h.principal || 0);
    }, 0);
  }, [investData]);
  
  const availableYears = useMemo(() => {
    if (!transactions?.length) return [new Date().getFullYear()];
    const years = new Set(transactions.map(t => parseInt(t.date?.split("-")[0] || 0)).filter(y => y > 2000));
    return Array.from(years).sort((a,b) => b - a);
  }, [transactions]);
  
  const [selectedYear, setSelectedYear] = useState(availableYears[0] || new Date().getFullYear());
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleSendYearSummary = async () => {
    setSendingEmail(true);
    try {
      if (onSendYearSummary) await onSendYearSummary(selectedYear);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="page-enter" style={{padding:"20px 10px 100px",display:"flex",flexDirection:"column",gap:24}}>

      <div style={{display:"flex", flexDirection:"column", gap:16}}>

        {/* Investment Tracker Card moved down */}

        <div style={{background:C.surface, borderRadius:32, padding:24, display:"flex", flexDirection:"column", gap:20, border:`1px solid ${C.borderLight}`, boxShadow:C.shadow}}>
           <div style={{color:C.sub, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em"}}>Data Management</div>
           <div style={{display:"flex", flexDirection:"column", gap:12}}>
              <Btn theme={C} v="soft" full icon="cloud" onClick={onShowBackup}>Cloud Sync & Backups</Btn>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
                <Btn theme={C} v="ghost" sm icon="down" onClick={onExportBackup}>Export JSON</Btn>
                <Btn theme={C} v="ghost" sm icon="upload" onClick={onImportBackup}>Import JSON</Btn>
              </div>
              <Btn theme={C} v="danger" full icon="trash" onClick={onClearData} style={{opacity:0.9}}>Clear System Data</Btn>
           </div>
        </div>

         <div style={{background:C.surface, borderRadius:32, padding:24, display:"flex", flexDirection:"column", gap:20, border:`1px solid ${C.borderLight}`, boxShadow:C.shadow}}>
           <div style={{color:C.sub, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em"}}>Preferences</div>
           <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0"}}>
              <div style={{display:"flex", alignItems:"center", gap:14}}>
                 <div style={{width:44, height:44, borderRadius:16, background:C.input, display:"flex", alignItems:"center", justifyContent:"center"}}>
                   <Ico n={themeMode==="dark"?"moon":"sun"} sz={20} c={C.primary}/>
                 </div>
                 <div>
                   <div style={{fontSize:15, fontWeight:700, color:C.text, letterSpacing:"-.01em"}}>Dark Mode</div>
                   <div style={{fontSize:12, color:C.sub, fontWeight:600}}>System-wide theme</div>
                 </div>
              </div>
              <button 
                onClick={toggleTheme} 
                style={{
                  width:56, height:30, borderRadius:15, background:themeMode==="dark"?C.primary:C.muted, border:"none", 
                  position:"relative", cursor:"pointer", transition:"all .3s"
                }}
              >
                  <div style={{
                    position:"absolute", left:themeMode==="dark"?"calc(100% - 26px)":"4px", top:4, width:22, height:22, borderRadius:"50%", 
                    background:C.surface, transition:"all .3s cubic-bezier(0.16, 1, 0.3, 1)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
                  }}/>
              </button>
           </div>
        </div>

        <div style={{background:C.surface, borderRadius:32, border:`1px solid ${C.borderLight}`, padding:24, boxShadow:C.shadow}}>
          <div style={{color:C.sub, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:20}}>
            Email Reports
          </div>
          
          {/* Budget Alerts Toggle */}
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${C.borderLight}`}}>
            <div>
              <div style={{fontSize:14, fontWeight:700, color:C.text}}>Budget exceed alerts</div>
              <div style={{fontSize:11, color:C.sub, fontWeight:600, marginTop:2}}>Email when any budget is exceeded</div>
            </div>
            <button 
              onClick={() => onSetEmailPrefs && onSetEmailPrefs(p => ({...p, budgetAlerts: !p.budgetAlerts}))}
              style={{
                width:50, height:28, borderRadius:14, background:emailPrefs?.budgetAlerts ? C.primary : C.muted, border:"none", 
                position:"relative", cursor:"pointer", transition:"all .3s"
              }}
            >
              <div style={{
                position:"absolute", left:emailPrefs?.budgetAlerts ? "calc(100% - 24px)" : "4px", top:4, width:20, height:20, borderRadius:"50%", 
                background:C.surface, transition:"all .3s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
              }}/>
            </button>
          </div>

          {/* Year-End Summary Toggle */}
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", marginBottom:16}}>
            <div>
              <div style={{fontSize:14, fontWeight:700, color:C.text}}>Year-end summary</div>
              <div style={{fontSize:11, color:C.sub, fontWeight:600, marginTop:2}}>Auto-email your annual report in December</div>
            </div>
            <button 
              onClick={() => onSetEmailPrefs && onSetEmailPrefs(p => ({...p, yearEndSummary: !p.yearEndSummary}))}
              style={{
                width:50, height:28, borderRadius:14, background:emailPrefs?.yearEndSummary ? C.primary : C.muted, border:"none", 
                position:"relative", cursor:"pointer", transition:"all .3s"
              }}
            >
              <div style={{
                position:"absolute", left:emailPrefs?.yearEndSummary ? "calc(100% - 24px)" : "4px", top:4, width:20, height:20, borderRadius:"50%", 
                background:C.surface, transition:"all .3s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
              }}/>
            </button>
          </div>

          {/* Manual Report Section */}
          <div style={{color:C.sub, fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:".08em", marginBottom:12}}>Manual Reports</div>
          
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              style={{background:C.input, border:`1px solid ${C.borderLight}`, borderRadius:12, padding:"12px 16px", color:C.text, fontSize:14, fontWeight:700, outline:"none"}}
            >
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button 
            onClick={handleSendYearSummary} 
            disabled={sendingEmail || !user?.email}
            style={{
              width:"100%", padding:"14px 20px", background:"linear-gradient(135deg, #00e5ff, #6366f1)",
              border:"none", borderRadius:16, color:"#000", fontSize:14, fontWeight:800,
              cursor: sendingEmail || !user?.email ? "not-allowed" : "pointer", opacity: sendingEmail || !user?.email ? 0.6 : 1,
              transition: "transform 0.1s"
            }}
          >
            {sendingEmail ? "Sending..." : `📊 Email ${selectedYear} Financial Summary`}
          </button>
          
          <div style={{color:C.sub, fontSize:11, marginTop:12, textAlign:"center"}}>
            {user?.email ? `Sends a summary email with CSV attachment to ${user.email}` : "Sign in to send email reports"}
          </div>
        </div>

        <div style={{background:C.surface, borderRadius:32, padding:24, display:"flex", flexDirection:"column", gap:20, border:`1px solid ${C.borderLight}`, boxShadow:C.shadow}}>
           <div style={{color:C.sub, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em"}}>Account</div>
           <Btn theme={C} v="ghost" full icon="logOut" onClick={onLogout}>Sign Out</Btn>
        </div>

        {/* Investment Tracker Card */}
        <div style={{
          background: `linear-gradient(135deg, ${C.primary}20, ${(C.secondary || C.primary)}20)`,
          border: `1px solid ${C.primary}40`,
          borderRadius: 32, padding: 24,
          display: "flex", flexDirection: "column", gap: 16,
          boxShadow: C.shadow
        }}>
          <div style={{display: "flex", alignItems: "center", gap: 12}}>
            <div style={{fontSize: 32}}>💎</div>
            <div>
              <div style={{fontSize: 18, fontWeight: 800, color: C.text}}>Investments</div>
              <div style={{fontSize: 12, color: C.sub, marginTop: 2, display: "flex", alignItems: "center", gap: 6}}>
                {portfolioValue > 0 ? (
                   <span style={{ color: C.primary, fontWeight: 700 }}>Value: ₹{portfolioValue.toLocaleString()}</span>
                ) : (
                   <span>Track stocks, MFs, gold & more</span>
                )}
              </div>
            </div>
          </div>
          <Btn theme={C} v="primary" full icon="arrowRight" onClick={onOpenInvestments}>
            Open Investment Tracker
          </Btn>
        </div>

        <div style={{background:C.surface, borderRadius:32, padding:32, textAlign:"center", position:"relative", border:`1px solid ${C.borderLight}`, boxShadow:C.shadow}}>
           <div style={{fontSize:48, marginBottom:16}}>💳</div>
           <div style={{color:C.text, fontSize:20, fontWeight:800, letterSpacing:"-.02em"}}>Expense Tracker</div>
           <div style={{color:C.sub, fontSize:13, fontWeight:600, marginTop:8, maxWidth:200, margin:"8px auto 0", lineHeight:1.4}}>Your personal financial companion.</div>
           
           <div style={{display:"flex", justifyContent:"center", gap:32, marginTop:24, borderTop:`1px solid ${C.borderLight}`, paddingTop:24}}>
              <div style={{textAlign:"center"}}>
                 <div style={{fontSize:11, color:C.sub, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4}}>Status</div>
                 <div style={{fontSize:13, color:C.income, fontWeight:700, display:"flex", alignItems:"center", gap:6, justifyContent:"center"}}><div style={{width:8, height:8, borderRadius:"50%", background:C.income}}/> Online</div>
              </div>
              <div style={{textAlign:"center", borderLeft:`1px solid ${C.borderLight}`, paddingLeft:32}}>
                 <div style={{fontSize:11, color:C.sub, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4}}>Sync</div>
                 <div style={{fontSize:13, color:C.text, fontWeight:700}}>Active</div>
              </div>
           </div>
           
           <div style={{color:C.sub, fontSize:12, marginTop:32, fontWeight:600}}>© 2026 Developer</div>
        </div>
      </div>
    </div>
  );
}
