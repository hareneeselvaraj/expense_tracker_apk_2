import React from "react";
import { Ico } from "../ui/Ico.jsx";

export const Header = ({ title, theme, themeMode, toggleTheme, onOpenSettings, syncStatus, onOpenSync, isOffline }) => {

  const C = theme;
  return (
    <div style={{position:"sticky",top:0,zIndex:300,background:C.headerBg,borderBottom:`1px solid ${C.borderLight}`,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex", alignItems:"center", gap:10}}>
        <div style={{width: 8, height: 8, borderRadius: "50%", background: C.primary}} />
        <span style={{fontSize:20,fontWeight:800,letterSpacing:"-.02em", color:C.text}}>{title}</span>
      </div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={toggleTheme} style={{background:C.input,border:"none",borderRadius:12,padding:"8px",color:C.text,cursor:"pointer",display:"flex",transition:"transform .2s"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}>
          <Ico n={themeMode==="dark"?"sun":"moon"} sz={18}/>
        </button>
         <button onClick={onOpenSettings} style={{background:C.input,border:"none",borderRadius:12,padding:"8px",color:C.text,cursor:"pointer",display:"flex",transition:"transform .2s"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}>
          <Ico n="settings" sz={18}/>
        </button>
      </div>
    </div>
  );
};
