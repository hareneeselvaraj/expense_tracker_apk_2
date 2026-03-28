import React from "react";
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
  theme 
}) {
  const C = theme;

  return (
    <div className="page-enter" style={{padding:"20px 20px 100px 20px",display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
         <h1 style={{fontSize:24,fontWeight:900,color:C.text,margin:0,letterSpacing:"-.03em", textShadow:`0 0 20px ${C.primary}44`}}>Settings</h1>
         <div style={{background:C.primaryDim, color:C.primary, padding:"4px 12px", borderRadius:8, fontSize:10, fontWeight:900, fontFamily:"'JetBrains Mono',monospace", border:`1px solid ${C.primary}44`, boxShadow:`0 0 10px ${C.primary}22`}}>V2.2.0 "OBSIDIAN"</div>
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:16}}>
        <div className="glass-card cyber-accent" style={{borderRadius:24, padding:24, display:"flex", flexDirection:"column", gap:18}}>
           <div style={{color:C.primary, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".2em", fontFamily:"'JetBrains Mono',monospace"}}>// Data Management</div>
           <div style={{display:"flex", flexDirection:"column", gap:12}}>
              <Btn theme={C} v="soft" full icon="cloud" onClick={onShowBackup} style={{boxShadow:`0 4px 15px ${C.primaryDim}`}}>Cloud Sync & Backups</Btn>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
                <Btn theme={C} v="ghost" sm icon="down" onClick={onExportBackup}>Export JSON</Btn>
                <Btn theme={C} v="ghost" sm icon="upload" onClick={onImportBackup}>Import JSON</Btn>
              </div>
              <Btn theme={C} v="danger" full icon="trash" onClick={onClearData} style={{opacity:0.8}}>Clear System Data</Btn>
           </div>
        </div>

        <div className="glass-card cyber-accent" style={{borderRadius:24, padding:24, display:"flex", flexDirection:"column", gap:18}}>
           <div style={{color:C.primary, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".2em", fontFamily:"'JetBrains Mono',monospace"}}>// Preferences</div>
           <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0"}}>
              <div style={{display:"flex", alignItems:"center", gap:14}}>
                 <div style={{width:40, height:40, borderRadius:12, background:C.primaryDim, display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${C.primary}33`}}>
                   <Ico n={themeMode==="dark"?"moon":"sun"} sz={18} c={C.primary}/>
                 </div>
                 <div>
                   <div style={{fontSize:15, fontWeight:800, color:C.text}}>Dark Mode</div>
                   <div style={{fontSize:10, color:C.sub, fontWeight:700, textTransform:"uppercase"}}>System-wide theme</div>
                 </div>
              </div>
              <button 
                onClick={toggleTheme} 
                style={{
                  width:54, height:28, borderRadius:14, background:themeMode==="dark"?C.primary:"#222", border:`1px solid ${themeMode==="dark"?C.primary:C.border}`, 
                  position:"relative", cursor:"pointer", transition:"all .4s",
                  boxShadow: themeMode==="dark"?`0 0 20px ${C.primary}44` : "none"
                }}
              >
                  <div style={{
                    position:"absolute", left:themeMode==="dark"?"calc(100% - 24px)":"4px", top:3, width:20, height:20, borderRadius:"50%", 
                    background:themeMode==="dark"?"#000":"#555", transition:"all .4s ease-in-out",
                    boxShadow: themeMode==="dark"?"0 0 10px rgba(0,0,0,0.5)": "none"
                  }}/>
              </button>
           </div>
        </div>

        <div className="glass-card cyber-accent" style={{borderRadius:24, padding:24, display:"flex", flexDirection:"column", gap:18}}>
           <div style={{color:C.primary, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".2em", fontFamily:"'JetBrains Mono',monospace"}}>// Account</div>
           <Btn theme={C} v="ghost" full icon="logOut" onClick={onLogout}>Sign Out</Btn>
        </div>

        <div className="glass-card cyber-accent" style={{borderRadius:32, padding:32, textAlign:"center", position:"relative"}}>
           <div className="scan-line" />
           <div style={{fontSize:48, marginBottom:16, filter:"drop-shadow(0 0 10px #00e5ff44)"}}>💎</div>
           <div style={{color:C.text, fontSize:18, fontWeight:900, letterSpacing:"-.02em"}}>Expense Tracker <span style={{color:C.primary}}>Cloud</span></div>
           <div style={{color:C.sub, fontSize:12, fontWeight:500, marginTop:6, maxWidth:200, margin:"6px auto 0", lineHeight:1.4}}>Advanced personal financial command center.</div>
           
           <div style={{display:"flex", justifyContent:"center", gap:20, marginTop:24, borderTop:`1px solid ${C.border}`, paddingTop:20}}>
              <div style={{textAlign:"center"}}>
                 <div style={{fontSize:10, color:C.sub, fontWeight:800, textTransform:"uppercase"}}>Status</div>
                 <div style={{fontSize:11, color:C.income, fontWeight:900, display:"flex", alignItems:"center", gap:4}}><div style={{width:6, height:6, borderRadius:"50%", background:C.income}}/> Online</div>
              </div>
              <div style={{textAlign:"center"}}>
                 <div style={{fontSize:10, color:C.sub, fontWeight:800, textTransform:"uppercase"}}>Region</div>
                 <div style={{fontSize:11, color:C.text, fontWeight:900}}>Global-1</div>
              </div>
           </div>
           
           <div style={{color:C.sub, fontSize:10, marginTop:24, fontFamily:"'JetBrains Mono',monospace", opacity:0.5}}>© 2026 ANTIGRAVITY OS v2.2</div>
        </div>
      </div>
    </div>
  );
}
