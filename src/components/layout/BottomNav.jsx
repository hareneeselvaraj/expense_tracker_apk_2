import React from "react";
import { Ico } from "../ui/Ico.jsx";

export const BottomNav = ({ page, setPage, theme }) => {
  const C = theme;
  const items = [
    {id:"dashboard",icon:"home",label:"Home"},
    {id:"transactions",icon:"list",label:"Txns"},
    {id:"reports",icon:"chart",label:"Report"},
    {id:"organize",icon:"grid",label:"Organize"},
    {id:"vault",icon:"bank",label:"Vault"}
  ];

  return (
    <nav style={{position:"fixed",bottom:0,left:0,width:"100%",background:C.navBg,borderTop:`1px solid ${C.borderLight}`,display:"flex",padding:"8px 16px calc(8px + env(safe-area-inset-bottom))",zIndex:200, boxShadow:"0 -4px 20px rgba(0,0,0,0.03)"}}>
      {items.map(n=>(
        <button key={n.id} onClick={()=>setPage(n.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"6px 0",color:page===n.id?C.primary:C.sub,fontFamily:"inherit", transition:"all .2s"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"center", background:page===n.id?C.primaryDim:"transparent", padding:"4px 16px", borderRadius:16, transition:"background .3s"}}>
            <Ico n={n.icon} sz={22} c={page===n.id?C.primary:C.sub}/>
          </div>
          <span style={{fontSize:10,fontWeight:600, color:page===n.id?C.primary:C.sub}}>{n.label}</span>
        </button>
      ))}
    </nav>
  );
};
