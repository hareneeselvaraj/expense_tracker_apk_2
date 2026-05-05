import React, { useState, useMemo } from "react";
import { Ico } from "../../components/ui/Ico.jsx";
import Icon from "../../components/ui/Icon.jsx";
import { Btn } from "../../components/ui/Btn.jsx";
import { fmtAmt, startOfWeek, toISO } from "../../utils/format.js";

export default function BudgetsPanel({ categories, tags, budgets, transactions, onAddBudget, onEditBudget, onDeleteBudget, theme }) {
  const C = theme;
  const [subTab, setSubTab] = useState("categories");
  const [confirmId, setConfirmId] = useState(null);
  const isCat = subTab === "categories";

  // Pre-compute period ranges
  const { weekRange, monthRange } = useMemo(() => {
    const now = new Date();
    const mon = startOfWeek(now);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const y = now.getFullYear(), m = now.getMonth();
    const pad = n => String(n).padStart(2, '0');
    return {
      weekRange: [toISO(mon), toISO(sun)],
      monthRange: [`${y}-${pad(m + 1)}-01`, `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`],
    };
  }, []);

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

  // Count weekly vs monthly budgets
  const weeklyCount = budgets.filter(b => b.period === "weekly").length;
  const monthlyCount = budgets.filter(b => !b.period || b.period === "monthly").length;

  return (
    <div className="page-enter" style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.text,letterSpacing:"-.01em"}}>Spending Limits</h2>
          <p style={{margin:0,color:C.sub,fontSize:11}}>
            {weeklyCount > 0 && monthlyCount > 0
              ? `${weeklyCount} weekly · ${monthlyCount} monthly`
              : weeklyCount > 0
                ? "Weekly budget tracking"
                : "Monthly budget tracking"
            }
          </p>
        </div>
        <Btn theme={C} icon="plus" sm onClick={() => onAddBudget(subTab)}>Add</Btn>
      </div>

      {/* Sub-tab Switcher (Pill style) */}
      <div style={{
        display: "flex", 
        background: C.input, 
        borderRadius: 30, 
        padding: 4, 
        gap: 2,
        alignItems: "center"
      }}>
        {["categories", "tags"].map(t => (
          <button key={t} onClick={() => { setSubTab(t); setConfirmId(null); }} style={{
            flex:1, padding: "8px 0", borderRadius: 25, cursor:"pointer",
            fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".05em",
            fontFamily: "inherit",
            background: subTab === t ? C.primary : "transparent",
            color: subTab === t ? "#fff" : C.sub,
            border: "none",
            transition: "all .2s ease"
          }}>{t}</button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {budgetedItems.length === 0 ? (
          <div style={{background:C.surface, border:`1px solid ${C.borderLight}`, borderRadius:24, padding:"32px 20px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:10, boxShadow:C.shadow}}>
            <div style={{width:54,height:54,borderRadius:16,background:C.input,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="BarChart" size={24} color={C.text} /></div>
            <div style={{color:C.sub, fontSize:12, maxWidth:240}}>No {isCat ? "category" : "tag"} budgets set yet. Tap <strong>+ Add</strong> above to start tracking.</div>
          </div>
        ) : budgetedItems.map(item => {
          const b = item.budget;
          const period = b.period || "monthly";
          const [from, to] = period === "weekly" ? weekRange : monthRange;

          const spent = transactions
            .filter(t => {
              if (t.deleted) return false;
              if (t.date < from || t.date > to) return false;
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
              background:C.surface, borderRadius:16, padding:14, border:`1px solid ${isConfirming ? C.expense+'66' : isOver ? C.expense+'44' : C.borderLight}`,
              display:"flex", flexDirection:"column", gap:10, position:"relative", overflow:"hidden",
              boxShadow: isConfirming ? `0 0 16px ${C.expense}20` : isOver ? `0 0 16px ${C.expense}10` : C.shadow, transition:"all .2s ease"
            }}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div style={{display:"flex", alignItems:"center", gap:10}}>
                  <div style={{
                    width:36, height:36, borderRadius:10, background:`${item.color}1a`,
                    display:"flex", alignItems:"center", justifyContent:"center", color:item.color
                  }}>
                    {isCat 
                      ? (item.icon ? <Icon name={item.icon} size={18} color={item.color} /> : <Icon name="Package" size={18} color={item.color} />) 
                      : (item.icon ? <Icon name={item.icon} size={18} color={item.color} /> : <Ico n="tag" sz={16} c={item.color} />)}
                  </div>
                  <div>
                    <div style={{display:"flex", alignItems:"center", gap:6}}>
                      <span style={{color:C.text, fontSize:13, fontWeight:800}}>{isCat ? item.name : `#${item.name}`}</span>
                      <span style={{
                        fontSize: 8,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        padding: "2px 6px",
                        borderRadius: 6,
                        background: period === "weekly" ? C.primary + "18" : C.secondary ? C.secondary + "18" : C.primary + "10",
                        color: period === "weekly" ? C.primary : C.secondary || C.primary,
                      }}>
                        {period === "weekly" ? "Weekly" : "Monthly"}
                      </span>
                    </div>
                    <div style={{color:C.sub, fontSize:11, fontWeight:600}}>{fmtAmt(spent)} of {fmtAmt(b.amount)}</div>
                  </div>
                </div>

                {isConfirming ? (
                  <div style={{display:"flex", gap:6, alignItems:"center"}}>
                    <span style={{color:C.expense, fontSize:9, fontWeight:900}}>DEL?</span>
                    <button onClick={() => handleDelete(b.id)} style={{background:C.expense, border:"none", color:"#fff", cursor:"pointer", borderRadius:6, padding:"4px 10px", fontSize:10, fontWeight:800}}>Yes</button>
                    <button onClick={() => setConfirmId(null)} style={{background:"none", border:`1px solid ${C.border}`, color:C.sub, cursor:"pointer", borderRadius:6, padding:"4px 10px", fontSize:10, fontWeight:800}}>No</button>
                  </div>
                ) : (
                  <div style={{display:"flex", gap:4}}>
                    <button onClick={() => onEditBudget(item.id, b, subTab)} style={{background:"none", border:"none", color:C.sub, cursor:"pointer", padding:4}}><Ico n="pen" sz={13} /></button>
                    <button onClick={() => setConfirmId(b.id)} style={{background:"none", border:"none", color:C.sub, cursor:"pointer", padding:4}}><Ico n="trash" sz={13} /></button>
                  </div>
                )}
              </div>

              <div style={{height:8, background:C.input, borderRadius:4, overflow:"hidden"}}>
                <div style={{
                  height:"100%", width:`${pct}%`,
                  background: isOver ? C.expense : C.primary,
                  transition:"width .5s ease"
                }}/>
              </div>

              {isOver && (
                <div style={{color:C.expense, fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:".05em"}}>
                  ⚠ Over by {fmtAmt(spent - b.amount)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
