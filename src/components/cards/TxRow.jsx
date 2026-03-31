import React from "react";
import { Ico } from "../ui/Ico.jsx";
import { fmtAmt, fmtDate } from "../../utils/format.js";

export const TxRow = ({t, categories, tags, accounts, onClick, selected, onSelect, theme}) => {
  const C = theme;
  const cat = categories.find(c=>c.id===t.category);
  const txTags = (t.tags||[]).map(tid=>tags.find(tg=>tg.id===tid)).filter(Boolean);
  const amtColor = t.creditDebit==="Credit" ? C.credit : C.debit;

  return (
    <div style={{display:"flex", gap:10, alignItems:"center"}}>
      {onSelect && (
        <div onClick={(e)=>{e.stopPropagation(); onSelect(!selected);}} style={{
          width:24, height:24, borderRadius:8, border:`2px solid ${selected?C.primary:C.borderLight}`, 
          background:selected?C.primary:"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all .2s"
        }}>
          {selected && <Ico n="check" sz={14} c="#fff"/>}
        </div>
      )}
      <div onClick={onClick} style={{
        flex:1, background:C.surface, borderWidth:1, borderStyle:"solid", borderColor:selected?C.primary:C.borderLight, borderRadius:24, padding:"16px", cursor:"pointer",
        display:"flex", flexDirection:"column", gap:12, transition:"all .2s ease",
        boxShadow:selected?`0 4px 16px ${C.primaryDim}`:"none", transform:selected?"scale(1.01)":"none"
      }} onMouseEnter={e=>{if(!selected){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.muted;}}} onMouseLeave={e=>{if(!selected){e.currentTarget.style.borderColor=C.borderLight;e.currentTarget.style.background=C.surface;}}}>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:16,background:C.input,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
             {cat?.emoji || "💳"}
          </div>
          <div style={{display:"flex",flexDirection:"column"}}>
            <span style={{color:C.text,fontSize:15,fontWeight:700,letterSpacing:"-.01em"}}>{t.description}</span>
            <span style={{color:C.sub,fontSize:12,fontWeight:600}}>{fmtDate(t.date)}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <span style={{color:amtColor,fontSize:16,fontWeight:800}}>
            {t.creditDebit==="Credit"?"+":"−"}{fmtAmt(t.amount)}
          </span>
          <div style={{fontSize:10,fontWeight:700,color:C.sub,marginTop:2,textTransform:"capitalize"}}>{t.txType}</div>
        </div>
      </div>

      {(txTags.length>0 || t.accountId) && (
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap", paddingTop:8, borderTop:`1px dashed ${C.borderLight}`}}>
          {txTags.map(tg=>(
            <span key={tg.id} style={{background:C.input,color:C.sub,borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700}}>#{tg.name}</span>
          ))}
          {t.accountId && accounts.find(a=>a.id===t.accountId) && (
            <span style={{color:C.sub,fontSize:11,fontWeight:600,marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
               <Ico n="bank" sz={12}/> {accounts.find(a=>a.id===t.accountId)?.name}
            </span>
          )}
        </div>
      )}
    </div>
  </div>
);
};
