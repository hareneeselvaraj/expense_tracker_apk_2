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
    <div className="page-enter" style={{padding:"16px 16px 100px 16px",display:"flex",flexDirection:"column",gap:20}}>
      
      {/* Period Navigator */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20, marginTop:10}}>
        <button onClick={()=>setOrgDate(stepDate(orgPeriodTab, orgDate, -1))} style={{background:C.primaryDim,border:`1px solid ${C.primary}33`,borderRadius:"50%",padding:10,color:C.primary,cursor:"pointer",display:"flex", transition:"transform .2s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}><Ico n="chevronLeft" sz={18}/></button>
        <span 
          onClick={() => {
            try { dateRef.current?.showPicker(); } catch (e) {}
          }}
          style={{fontSize:16,color:C.text,fontWeight:900,textTransform:"uppercase",letterSpacing:".05em", background:C.surface, padding:"8px 16px", borderRadius:12, border:`1px solid ${C.border}`, cursor:"pointer", position:"relative"}}
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
        <button onClick={()=>setOrgDate(stepDate(orgPeriodTab, orgDate, 1))} style={{background:C.primaryDim,border:`1px solid ${C.primary}33`,borderRadius:"50%",padding:10,color:C.primary,cursor:"pointer",display:"flex", transition:"transform .2s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}><Ico n="chevronRight" sz={18}/></button>
      </div>

      {/* Sub-tab switcher */}
      <div style={{display:"flex",background:C.input,borderRadius:24,padding:4}}>
        {[{id:"categories",label:"Categories"},{id:"tags",label:"Tags"},{id:"budgets",label:"Budgets"},{id:"rules",label:"Rules"}].map(t=>(
          <button key={t.id} onClick={()=>setOrganizeTab(t.id)} style={{
            flex:1,padding:"10px",borderRadius:20,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,textTransform:"capitalize",
            background:organizeTab===t.id?C.primary:"transparent",
            color:organizeTab===t.id?"#fff":C.sub,
            boxShadow:organizeTab===t.id?`0 4px 12px ${C.primary}40`:"none",
            transition:"all .2s ease"
          }}>{t.label}</button>
        ))}
      </div>

      {organizeTab === "categories" && <CategoriesPanel {...{categories, transactions: filteredTransactions, DEF_CATS, onAddCat, onEditCat, onDeleteCat, theme}} />}
      {organizeTab === "tags" && <TagsPanel {...{tags, transactions: filteredTransactions, onAddTag, onEditTag, onDeleteTag, theme}} />}
      {organizeTab === "budgets" && <BudgetsPanel {...{categories, tags, budgets, transactions: filteredTransactions, onAddBudget, onEditBudget, onDeleteBudget, theme}} />}
      {organizeTab === "rules" && <RulesPanel {...{rules, categories, tags, onAddRule, onEditRule, onDeleteRule, onMagicWand, theme}} />}
    </div>
  );
}
