import React from "react";
import CategoriesPanel from "./Organize/CategoriesPanel.jsx";
import TagsPanel from "./Organize/TagsPanel.jsx";
import BudgetsPanel from "./Organize/BudgetsPanel.jsx";
import RulesPanel from "./Organize/RulesPanel.jsx";
import { Ico } from "../components/ui/Ico.jsx";
import { dateRange, stepDate, periodLabel } from "../utils/format.js";

export default function OrganizePage({ 
  organizeTab, 
  setOrganizeTab, 
  orgDate, setOrgDate, orgPeriodTab, setOrgPeriodTab,
  categories, 
  transactions, 
  tags, 
  budgets, 
  rules, 
  DEF_CATS,
  onAddCat, onEditCat, onDeleteCat,
  onAddTag, onEditTag, onDeleteTag,
  onAddBudget, onEditBudget, onDeleteBudget,
  onAddRule, onEditRule, onDeleteRule, onMagicWand,
  theme 
}) {
  const C = theme;
  const dateRef = React.useRef(null);

  const filteredTransactions = React.useMemo(() => {
    const [from, to] = dateRange(orgPeriodTab, orgDate);
    return transactions.filter(t => t.date >= from && t.date <= to);
  }, [transactions, orgPeriodTab, orgDate]);

  return (
    <div className="page-enter" style={{padding:"8px 10px 100px",display:"flex",flexDirection:"column",gap:10}}>
      
      {/* Period Navigator */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10, marginTop:4}}>
        <button onClick={()=>setOrgDate(stepDate(orgPeriodTab, orgDate, -1))} style={{
          width:28,height:28,background:C.input,border:"none",borderRadius:8,
          color:C.sub,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
        }}><Ico n="chevronLeft" sz={14}/></button>
        <span 
          onClick={() => { try { dateRef.current?.showPicker(); } catch (e) {} }}
          style={{fontSize:13,color:C.text,fontWeight:800,textTransform:"uppercase",letterSpacing:".04em", background:C.surface, padding:"6px 14px", borderRadius:8, border:`1px solid ${C.borderLight}`, cursor:"pointer", position:"relative"}}
        >
          {periodLabel(orgPeriodTab, orgDate)}
          <input 
            ref={dateRef}
            type="date"
            value={orgDate.toISOString().split("T")[0]}
            onChange={(e) => {
              if (e.target.value) setOrgDate(new Date(e.target.value));
            }}
            style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              opacity: 0, cursor: "pointer"
            }}
          />
        </span>
        <button onClick={()=>setOrgDate(stepDate(orgPeriodTab, orgDate, 1))} style={{
          width:28,height:28,background:C.input,border:"none",borderRadius:8,
          color:C.sub,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
        }}><Ico n="chevronRight" sz={14}/></button>
      </div>

      {/* Sub-tab switcher (Pill style) */}
      <div style={{
        display: "flex", 
        background: C.input, 
        borderRadius: 30, 
        padding: 4, 
        gap: 2,
        alignItems: "center"
      }}>
        {[
          { id: "categories", label: "Categories" },
          { id: "tags", label: "Tags" },
          { id: "budgets", label: "Budgets" },
          { id: "rules", label: "Rules" }
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setOrganizeTab(t.id)} 
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 25,
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 800,
              fontFamily: "inherit",
              background: organizeTab === t.id ? C.primary : "transparent",
              color: organizeTab === t.id ? "#fff" : C.sub,
              transition: "all .2s ease"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {organizeTab === "categories" && <CategoriesPanel {...{categories, transactions: filteredTransactions, DEF_CATS, onAddCat, onEditCat, onDeleteCat, theme}} />}
      {organizeTab === "tags" && <TagsPanel {...{tags, transactions: filteredTransactions, onAddTag, onEditTag, onDeleteTag, theme}} />}
      {organizeTab === "budgets" && <BudgetsPanel {...{categories, tags, budgets, transactions, onAddBudget, onEditBudget, onDeleteBudget, theme}} />}
      {organizeTab === "rules" && <RulesPanel {...{rules, categories, tags, onAddRule, onEditRule, onDeleteRule, onMagicWand, theme}} />}
    </div>
  );
}
