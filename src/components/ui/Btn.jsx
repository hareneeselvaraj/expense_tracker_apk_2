import React from "react";
import { Ico } from "./Ico.jsx";

export const Btn = ({children,onClick,v="primary",icon,disabled,full,sm,theme,style:xStyle,type}) => {
  const C = theme;
  const isGlass = C.isGlass;

  const vs={
    primary: isGlass
      ? { bg: "rgba(124, 92, 252, 0.35)", co: "#fff", bo: `1px solid rgba(160, 140, 255, 0.30)`,
          shadow: "0 4px 16px rgba(100, 80, 240, 0.20), inset 0 1px 0 rgba(255,255,255,0.15)",
          backdrop: "blur(16px) saturate(160%)" }
      : { bg: C.primary, co: "#fff", bo: "none" },
    ghost: isGlass
      ? { bg: "rgba(255, 255, 255, 0.06)", co: C.text, bo: `1px solid rgba(140, 120, 255, 0.20)`,
          shadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
          backdrop: "blur(12px) saturate(150%)" }
      : { bg: "transparent", co: C.text, bo: `1px solid ${C.border}` },
    danger: isGlass
      ? { bg: "rgba(255, 107, 107, 0.25)", co: "#fff", bo: `1px solid rgba(255, 120, 120, 0.30)`,
          shadow: "0 4px 16px rgba(255, 80, 80, 0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
          backdrop: "blur(16px) saturate(160%)" }
      : { bg: C.expense, co: "#fff", bo: "none" },
    soft: isGlass
      ? { bg: "rgba(255, 255, 255, 0.08)", co: C.text, bo: `1px solid rgba(140, 120, 255, 0.12)`,
          shadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          backdrop: "blur(12px) saturate(150%)" }
      : { bg: C.muted, co: C.text, bo: "none" }
  };
  const s=vs[v]||vs.primary;
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: s.bg,
      color:s.co,
      border: s.bo === "none" ? "none" : s.bo,
      borderRadius:sm?10:14,
      padding:sm?"5px 10px":"12px 18px",
      fontSize:sm?11:14,fontWeight:sm?700:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,
      display:"flex",alignItems:"center",gap:sm?5:8,justifyContent:"center",
      width:full?"100%":"auto",fontFamily:"inherit",transition:"all .2s ease",
      minHeight:sm?28:44, touchAction:"manipulation", WebkitTapHighlightColor:"transparent",
      boxShadow: isGlass ? (s.shadow || "none") : "none",
      backdropFilter: isGlass ? (s.backdrop || undefined) : undefined,
      WebkitBackdropFilter: isGlass ? (s.backdrop || undefined) : undefined,
      ...xStyle,
    }} onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform="scale(0.97)";}} onMouseUp={e=>{if(!disabled)e.currentTarget.style.transform="scale(1)";}} onMouseLeave={e=>{if(!disabled)e.currentTarget.style.transform="scale(1)";}}>
      {icon&&<Ico n={icon} sz={sm?12:16} c={s.co}/>}{children}
    </button>
  );
};
