import React from "react";
import { Ico } from "../../components/ui/Ico.jsx";
import { Btn } from "../../components/ui/Btn.jsx";

export default function RulesPanel({ rules, categories, onAddRule, onEditRule, onDeleteRule, onMagicWand, theme }) {
  const C = theme;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:C.surface, border:`1px solid ${C.borderLight}`, borderRadius:24, padding:16, display:"flex", alignItems:"center", gap:12, boxShadow:C.shadow}}>
        <div style={{width:40, height:40, borderRadius:12, background:C.input, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#000", fontSize:18}}>🪄</div>
        <div style={{flex:1}}>
           <div style={{color:C.text, fontSize:14, fontWeight:800, letterSpacing:"-.01em"}}>Auto-Categorization</div>
           <div style={{color:C.sub, fontSize:12, fontWeight:600, marginTop:2}}>Rules automatically set categories based on keywords.</div>
        </div>
        <Btn theme={C} sm icon="plus" onClick={onAddRule}>Add</Btn>
      </div>

      {rules.length === 0 ? (
        <div style={{padding:40, textAlign:"center", color:C.sub, fontSize:13}}>No rules defined yet.</div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          {rules.map(rule => (
            <div key={rule.id} style={{background:C.surface, borderRadius:24, padding:20, border:`1px solid ${C.borderLight}`, display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:C.shadow}}>
               <div style={{display:"flex", flexDirection:"column", gap:6}}>
                  <div style={{color:C.text, fontSize:14, fontWeight:700}}>If description contains <span style={{color:C.primary}}>"{rule.pattern}"</span></div>
                  <div style={{display:"flex", alignItems:"center", gap:8}}>
                     <div style={{width:8, height:8, borderRadius:"50%", background:categories.find(c=>c.id===rule.categoryId)?.color || C.primary}}/>
                     <div style={{color:C.sub, fontSize:12, fontWeight:600}}>Set category to {categories.find(c=>c.id===rule.categoryId)?.name}</div>
                  </div>
               </div>
               <div style={{display:"flex", gap:8}}>
                  <button onClick={()=>onEditRule(rule)} style={{background:C.input, border:"none", color:C.sub, cursor:"pointer", width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><Ico n="pen" sz={14}/></button>
                  <button onClick={()=>onDeleteRule(rule.id)} style={{background:C.input, border:"none", color:C.expense, cursor:"pointer", width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><Ico n="trash" sz={14}/></button>
               </div>
            </div>
          ))}
        </div>
      )}

      <Btn theme={C} v="soft" full icon="stars" onClick={onMagicWand}>Magic Wand: Apply to All</Btn>
    </div>
  );
}
