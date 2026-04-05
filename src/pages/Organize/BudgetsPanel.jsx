import React, { useState } from "react";
import { Ico } from "../../components/ui/Ico.jsx";
import { Btn } from "../../components/ui/Btn.jsx";
import { fmtAmt } from "../../utils/format.js";

export default function BudgetsPanel({ categories, tags, budgets, transactions, onAddBudget, onEditBudget, onDeleteBudget, theme }) {
  const C = theme;
  const [subTab, setSubTab] = useState("categories");
  const [confirmId, setConfirmId] = useState(null);
  const isCat = subTab === "categories";

  // Only show items that HAVE a budget set
  const budgetedItems = budgets
    .filter(b => isCat ? b.categoryId : b.tagId)
    .map(b => {
      const source = isCat
        ? categories.find(c => c.id === b.categoryId)
        : tags.find(t => t.id === b.tagId);
      if (!source) return null;
      return { ...source, budget: b };
    })
    .filter(Boolean);

  const handleDelete = (budgetId) => {
    onDeleteBudget(budgetId);
    setConfirmId(null);
  };

  return (
    <div className="page-enter" style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.text,letterSpacing:"-.01em"}}>Monthly Limits</h2>
          <p style={{margin:0,color:C.sub,fontSize:12}}>Control your spending velocity.</p>
        </div>
        <Btn theme={C} icon="plus" sm onClick={() => onAddBudget(subTab)}>Add</Btn>
      </div>

      {/* Sub-tab Switcher */}
      <div style={{display:"flex", background:C.surface, borderRadius:14, padding:4, border:`1px solid ${C.border}`, width:"100%"}}>
        {["categories", "tags"].map(t => (
          <button key={t} onClick={() => { setSubTab(t); setConfirmId(null); }} style={{
            flex:1, padding:8, borderRadius:10, cursor:"pointer",
            fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".05em",
            background: subTab === t ? C.primaryDim : "transparent",
            color: subTab === t ? C.primary : C.sub,
            border: subTab === t ? `1px solid ${C.primary}33` : `1px solid transparent`,
            transition: "all .3s"
          }}>{t}</button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {budgetedItems.length === 0 ? (
          <div style={{background:C.surface, border:`1px solid ${C.borderLight}`, borderRadius:32, padding:"50px 24px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:14, boxShadow:C.shadow}}>
            <div style={{width:70,height:70,borderRadius:20,background:C.input,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34}}>📊</div>
            <div style={{color:C.sub, fontSize:13, maxWidth:260}}>No {isCat ? "category" : "tag"} budgets set yet. Tap <strong>+ Add</strong> above to start tracking.</div>
          </div>
        ) : budgetedItems.map(item => {
          const b = item.budget;
          const now = new Date();
          const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

          const spent = transactions
            .filter(t => {
              if (t.deleted) return false;
              if (!t.date?.startsWith(monthKey)) return false;
              const matchesEntity = isCat
                ? t.category === item.id
                : (t.tags || []).includes(item.id);
              return matchesEntity && t.creditDebit === "Debit";
            })
            .reduce((s, t) => s + t.amount, 0);

          const pct = b ? Math.min((spent / b.amount) * 100, 100) : 0;
          const isOver = b && spent > b.amount;
          const isConfirming = confirmId === b.id;

          return (
            <div key={item.id} style={{
              background:C.surface, borderRadius:24, padding:20, border:`1px solid ${isConfirming ? C.expense+'66' : isOver ? C.expense+'44' : C.borderLight}`,
              display:"flex", flexDirection:"column", gap:14, position:"relative", overflow:"hidden",
              boxShadow: isConfirming ? `0 0 20px ${C.expense}25` : isOver ? `0 0 20px ${C.expense}15` : C.shadow, transition:"all .2s ease"
            }}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div style={{display:"flex", alignItems:"center", gap:12}}>
                  <div style={{
                    width:44, height:44, borderRadius:14, background:`${item.color}1a`,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, color:item.color
                  }}>
                    {isCat ? (item.emoji || "📦") : "#"}
                  </div>
                  <div>
                    <div style={{color:C.text, fontSize:15, fontWeight:800}}>{isCat ? item.name : `#${item.name}`}</div>
                    <div style={{color:C.sub, fontSize:12, fontWeight:600}}>{fmtAmt(spent)} of {fmtAmt(b.amount)}</div>
                  </div>
                </div>

                {isConfirming ? (
                  <div style={{display:"flex", gap:8, alignItems:"center"}}>
                    <span style={{color:C.expense, fontSize:10, fontWeight:900}}>DELETE?</span>
                    <button onClick={() => handleDelete(b.id)} style={{background:C.expense, border:"none", color:"#fff", cursor:"pointer", borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:800}}>Yes</button>
                    <button onClick={() => setConfirmId(null)} style={{background:"none", border:`1px solid ${C.border}`, color:C.sub, cursor:"pointer", borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:800}}>No</button>
                  </div>
                ) : (
                  <div style={{display:"flex", gap:6}}>
                    <button onClick={() => onEditBudget(item.id, b, subTab)} style={{background:"none", border:"none", color:C.sub, cursor:"pointer", padding:6, transition:"color .2s"}} onMouseEnter={e => e.currentTarget.style.color = C.primary} onMouseLeave={e => e.currentTarget.style.color = C.sub}><Ico n="pen" sz={15} /></button>
                    <button onClick={() => setConfirmId(b.id)} style={{background:"none", border:"none", color:C.sub, cursor:"pointer", padding:6, transition:"color .2s"}} onMouseEnter={e => e.currentTarget.style.color = C.expense} onMouseLeave={e => e.currentTarget.style.color = C.sub}><Ico n="trash" sz={15} /></button>
                  </div>
                )}
              </div>

              <div style={{height:12, background:C.input, borderRadius:6, overflow:"hidden"}}>
                <div style={{
                  height:"100%", width:`${pct}%`,
                  background: isOver ? C.expense : C.primary,
                  borderRadius:6, transition:"width .5s ease"
                }}/>
              </div>

              {isOver && (
                <div style={{color:C.expense, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".05em"}}>
                  ⚠ Over budget by {fmtAmt(spent - b.amount)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
