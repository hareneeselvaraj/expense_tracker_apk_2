import React, { useState } from "react";
import { Ico } from "../../components/ui/Ico.jsx";
import Icon from "../../components/ui/Icon.jsx";
import { Btn } from "../../components/ui/Btn.jsx";
import { fmtAmt } from "../../utils/format.js";

export default function TagsPanel({ tags, transactions, onAddTag, onEditTag, onDeleteTag, theme }) {
  const C = theme;
  const [confirmId, setConfirmId] = useState(null);

  return (
    <div className="page-enter" style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.text,letterSpacing:"-.01em"}}>Tags</h2>
          <p style={{margin:0,color:C.sub,fontSize:11}}>Track spending across custom events.</p>
        </div>
        <Btn theme={C} icon="plus" sm onClick={onAddTag}>New Tag</Btn>
      </div>

      {tags.length === 0 ? (
        <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:24,padding:"40px 20px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12,boxShadow:C.shadow}}>
          <div style={{width:60,height:60,borderRadius:18,background:C.input,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>🏷</div>
          <div style={{color:C.sub,fontSize:12,maxWidth:240}}>No tags yet. Add tags to organize transactions.</div>
        </div>
      ) : (
        <div style={{background:C.surface, borderRadius:16, border:`1px solid ${C.borderLight}`, overflow:"hidden", boxShadow:C.shadow}}>
          {tags.map((tg, idx) => {
            const txns = transactions.filter(t => !t.deleted && (t.tags || []).includes(tg.id));
            const income = txns.filter(t => t.creditDebit === "Credit").reduce((s, t) => s + t.amount, 0);
            const expense = txns.filter(t => t.creditDebit === "Debit").reduce((s, t) => s + t.amount, 0);
            const isLast = idx === tags.length - 1;

            return (
              <div key={tg.id} 
                onClick={() => onEditTag(tg)}
                style={{
                display: "flex", flexDirection: "column", padding: "10px 14px",
                borderBottom: isLast ? "none" : `1px solid ${C.borderLight}`,
                background: confirmId === tg.id ? C.expense + "11" : "transparent",
                transition: "background .2s", cursor: "pointer", position: "relative"
              }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {/* Left: Icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${tg.color}1a`, display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    {tg.icon ? <Icon name={tg.icon} size={18} color={tg.color} /> : <Ico n="tag" sz={18} c={tg.color} />}
                  </div>

                  {/* Middle: Info */}
                  <div style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>#{tg.name}</div>
                    <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginTop: 1 }}>{txns.length} txns</div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 6 }}>
                    <button onClick={(e)=>{e.stopPropagation(); setConfirmId(tg.id);}} style={{ background: "transparent", border: "none", color: C.sub, cursor: "pointer", padding: 6 }}>
                      <Ico n="trash" sz={13} />
                    </button>
                    <Ico n="chevronRight" sz={12} c={C.sub} opacity={0.5} />
                  </div>
                </div>

                {/* Net amount detail */}
                {txns.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, marginLeft: 46 }}>
                    {income > 0 && <div style={{ fontSize: 11, color: C.income, fontWeight: 700 }}>+{fmtAmt(income)}</div>}
                    {expense > 0 && <div style={{ fontSize: 11, color: C.expense, fontWeight: 700 }}>−{fmtAmt(expense)}</div>}
                  </div>
                )}

                {/* Delete Confirmation Overlay */}
                {confirmId === tg.id && (
                  <div onClick={(e) => e.stopPropagation()} style={{
                    position: "absolute", inset: 0, background: C.surface, 
                    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px",
                    borderBottom: isLast ? "none" : `1px solid ${C.borderLight}`
                  }}>
                    <div style={{ color: C.expense, fontSize: 12, fontWeight: 800 }}>Delete #{tg.name}?</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={()=>setConfirmId(null)} style={{background:C.input, border:"none", color:C.text, cursor:"pointer", borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:800}}>No</button>
                      <button onClick={()=>onDeleteTag(tg.id)} style={{background:C.expense, border:"none", color:"#fff", cursor:"pointer", borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:800}}>Yes</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
