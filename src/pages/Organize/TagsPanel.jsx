import React, { useState } from "react";
import { Ico } from "../../components/ui/Ico.jsx";
import { Btn } from "../../components/ui/Btn.jsx";
import { fmtAmt } from "../../utils/format.js";

export default function TagsPanel({ tags, transactions, onAddTag, onEditTag, onDeleteTag, theme }) {
  const C = theme;
  const [confirmId, setConfirmId] = useState(null);

  return (
    <div className="page-enter" style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:800,color:C.text,letterSpacing:"-.02em"}}>Tags</h2>
          <p style={{margin:0,color:C.sub,fontSize:12}}>Track spending across custom events.</p>
        </div>
        <Btn theme={C} icon="plus" sm onClick={onAddTag}>New Tag</Btn>
      </div>

      {tags.length === 0 ? (
        <div style={{background:C.surface,border:`1px solid ${C.borderLight}`,borderRadius:32,padding:"60px 24px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:14,boxShadow:C.shadow}}>
          <div style={{width:80,height:80,borderRadius:24,background:C.input,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40}}>🏷</div>
          <div style={{color:C.sub,fontSize:14,maxWidth:260}}>No tags yet. Add tags to organize transactions.</div>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))",gap:16}}>
          {tags.map(tg => {
            const txns = transactions.filter(t => (t.tags || []).includes(tg.id));
            const income = txns.filter(t => t.creditDebit === "Credit").reduce((s, t) => s + t.amount, 0);
            const expense = txns.filter(t => t.creditDebit === "Debit").reduce((s, t) => s + t.amount, 0);
            const net = income - expense;
            return (
              <div key={tg.id} style={{
                background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: 16,
                display: "flex", flexDirection:"column", gap: 12, transition: "all .2s ease",
                position:"relative", overflow: "hidden", minHeight: 140, boxShadow: C.shadow
              }} onMouseEnter={e => { e.currentTarget.style.borderColor = tg.color; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.transform = "translateY(0)"; }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `${tg.color}1a`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ico n="tag" sz={20} c={tg.color} />
                  </div>
                  <div style={{ display: "flex", gap: 6, background:C.input, borderRadius:12, padding:2 }}>
                    {confirmId === tg.id ? (
                      <div style={{display:"flex", alignItems:"center", gap:4, padding:"0 4px"}}>
                        <span style={{color:C.expense, fontSize:9, fontWeight:900, marginRight:2}}>DELETE?</span>
                        <button onClick={()=>onDeleteTag(tg.id)} style={{background:C.expense, border:"none", color:"#fff", cursor:"pointer", borderRadius:8, padding:"4px 8px", fontSize:10, fontWeight:800}}>YES</button>
                        <button onClick={()=>setConfirmId(null)} style={{background:"none", border:`1px solid ${C.border}`, color:C.sub, cursor:"pointer", borderRadius:8, padding:"4px 8px", fontSize:10, fontWeight:800}}>NO</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => onEditTag(tg)} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", transition: "color .2s", padding:6 }} onMouseEnter={e => e.currentTarget.style.color = C.primary} onMouseLeave={e => e.currentTarget.style.color = C.sub}><Ico n="pen" sz={15} /></button>
                        <button onClick={() => setConfirmId(tg.id)} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", transition: "color .2s", padding:6 }} onMouseEnter={e => e.currentTarget.style.color = C.expense} onMouseLeave={e => e.currentTarget.style.color = C.sub}><Ico n="trash" sz={15} /></button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ color: C.text, fontSize: 16, fontWeight: 800, letterSpacing:"-.01em" }}>#{tg.name}</div>
                  <div style={{ color: C.sub, fontSize: 12, marginTop: 4, fontWeight: 600 }}>{txns.length} transaction{txns.length !== 1 ? "s" : ""}</div>
                </div>

                <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 12, marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  {income > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: C.sub, fontSize: 10, fontWeight: 700 }}>IN</span>
                      <span style={{ color: C.income, fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>+{fmtAmt(income)}</span>
                    </div>
                  )}
                  {expense > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: C.sub, fontSize: 10, fontWeight: 700 }}>OUT</span>
                      <span style={{ color: C.expense, fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>−{fmtAmt(expense)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                    <span style={{ color: C.sub, fontSize: 10, fontWeight: 800 }}>NET</span>
                    <span style={{ color: net >= 0 ? C.income : C.expense, fontSize: 15, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace" }}>
                      {net >= 0 ? "+" : "−"}{fmtAmt(Math.abs(net))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
