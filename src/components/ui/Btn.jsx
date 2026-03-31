import React from "react";
import { Ico } from "./Ico.jsx";

export const Btn = ({children,onClick,v="primary",icon,disabled,full,sm,theme}) => {
  const C = theme;
  const vs={
    primary:{bg:C.primary,co:"#fff",bo:"none"},
    ghost:{bg:"transparent",co:C.text,bo:`1px solid ${C.border}`},
    danger:{bg:C.expense,co:"#fff",bo:"none"},
    soft:{bg:C.muted,co:C.text,bo:"none"}
  };
  const s=vs[v]||vs.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      backgroundColor: s.bg,
      color:s.co,borderWidth:s.bo==="none"?0:1,borderStyle:"solid",borderColor:s.bo==="none"?"transparent":C.border,borderRadius:14,padding:sm?"6px 12px":"10px 18px",
      fontSize:sm?12:14,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,
      display:"flex",alignItems:"center",gap:8,justifyContent:"center",
      width:full?"100%":"auto",fontFamily:"inherit",transition:"transform .15s ease",
    }} onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform="scale(0.98)";}} onMouseUp={e=>{if(!disabled)e.currentTarget.style.transform="scale(1)";}} onMouseLeave={e=>{if(!disabled)e.currentTarget.style.transform="scale(1)";}}>
      {icon&&<Ico n={icon} sz={sm?14:16} c={s.co}/>}{children}
    </button>
  );
};
