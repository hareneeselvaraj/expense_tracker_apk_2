import React, { useState, useEffect } from "react";
import { Ico } from "./Ico.jsx";

export const Modal = ({open,onClose,title,children,theme}) => {
  const [active, setActive] = useState(false);
  const C = theme;
  useEffect(() => { if(open) setTimeout(()=>setActive(true), 10); else setActive(false); }, [open]);
  if(!open) return null;
  const isMobile = window.innerWidth < 600;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:5000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",transition:"opacity .3s ease",opacity:active?1:0, padding:isMobile?0:20}}>
      <div className="premium-scroll" onClick={e=>e.stopPropagation()} style={{
        background:C.surface, borderRadius:isMobile?"32px 32px 0 0":"24px", width:"100%", maxWidth:600, maxHeight:isMobile?"92vh":"85vh", overflow:"auto",
        boxShadow:C.shadow, transform:active?"translateY(0)":"translateY(100%)", transition:"transform .4s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>
        {isMobile && <div style={{width: 40, height: 4, background: C.border, borderRadius: 2, margin: "12px auto 0"}} />}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px 16px",borderBottom:`1px solid ${C.borderLight}`,position:"sticky",top:0,background:C.surface,zIndex:1}}>
          <span style={{color:C.text,fontSize:18,fontWeight:700}}>{title}</span>
          <button onClick={onClose} style={{background:C.input,border:"none",borderRadius:"50%",color:C.text,cursor:"pointer",padding:8,display:"flex",transition:"background .2s"}} onMouseOver={e=>e.currentTarget.style.background=C.muted} onMouseOut={e=>e.currentTarget.style.background=C.input}><Ico n="close" sz={20}/></button>
        </div>
        <div style={{padding:"20px 24px 40px"}}>{children}</div>
      </div>
    </div>
  );
};
