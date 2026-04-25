import React, { useState } from "react";
import { Ico } from "../ui/Ico.jsx";
import { Btn } from "../ui/Btn.jsx";
import { FInput, FLabel } from "../ui/FInput.jsx";
import { CdToggle } from "../ui/CdToggle.jsx";
import { TypeToggle } from "../ui/TypeToggle.jsx";
import { CustomSelect } from "../ui/PremiumSelect.jsx";
import { uid } from "../../utils/id.js";
import { fmtAmt } from "../../utils/format.js";
import { BLANK_TX } from "../../constants/defaults.js";
import { checkImportBatch } from "../../services/duplicateEngine.js";

export const TxForm = ({init, initialDate, categories, tags, accounts, existingTransactions, onSave, onDelete, onClose, theme}) => {
  const [tx, setTx] = useState({...BLANK_TX, ...(initialDate ? {date: initialDate} : {}), ...init});
  const [isSplitting, setIsSplitting] = useState(false);
  const [splits, setSplits] = useState([{id:uid(), amount:"", category:init?.category||"c13"}]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const C = theme;
  
  const f = k => v => setTx(p=>({...p,[k]:v}));
  const fEv = k => e => setTx(p=>({...p,[k]:e.target.value}));

  const toggleTag = tid => setTx(p=>({...p,tags:(p.tags||[]).includes(tid)?p.tags.filter(x=>x!==tid):[...(p.tags||[]),tid]}));

  const valid = tx.description.trim() && parseFloat(tx.amount) > 0;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>

      {/* Row 1: Date + Credit/Debit */}
      <div style={{display:"flex", gap:8, alignItems:"flex-end"}}>
        <div style={{flex:"0 0 auto", minWidth:0}}>
          <FLabel theme={C}>Date</FLabel>
          <FInput theme={C} value={tx.date} onChange={fEv("date")} type="date" style={{width:"auto", minWidth:0}}/>
        </div>
        <div style={{flex:1, minWidth:0}}>
          <FLabel theme={C}>Credit / Debit</FLabel>
          <CdToggle theme={C} value={tx.creditDebit} onChange={v=>{
            setTx(p=>({...p, creditDebit:v, txType:v==="Credit"?"Income":"Expense"}));
          }}/>
        </div>
      </div>

      {/* Row 2: Transaction Type */}
      <div>
        <FLabel theme={C}>Type</FLabel>
        <TypeToggle theme={C} value={tx.txType} onChange={f("txType")}/>
      </div>

      {/* Row 3: Category + Description side by side */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
        <CustomSelect 
          theme={C}
          label="Category" 
          value={tx.category} 
          options={categories.filter(c=>c.type===tx.txType && !c.deleted)} 
          onChange={f("category")}
        />
        <div>
          <FLabel theme={C}>Description</FLabel>
          <FInput theme={C} value={tx.description} onChange={fEv("description")} placeholder="e.g. Swiggy"/>
        </div>
      </div>

      {/* Row 4: Amount */}
      <div style={{display:"flex", alignItems:"flex-end", gap:8}}>
        <div style={{flex:1}}>
          <FLabel theme={C}>Amount (₹)</FLabel>
          <FInput theme={C} value={tx.amount} onChange={fEv("amount")} type="number" placeholder="0" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:700,color:tx.creditDebit==="Credit"?C.income:C.expense}}/>
        </div>
        {!init?.id && (
          <button onClick={() => setIsSplitting(!isSplitting)} style={{background:isSplitting?C.primaryDim:C.muted, border:`1px solid ${isSplitting?C.primary:C.border}`, borderRadius:10, padding:"6px 10px", color:isSplitting?C.primary:C.sub, fontSize:10, fontWeight:800, cursor:"pointer", transition:"all .2s", height:36, display:"flex", alignItems:"center", gap:4}}>
            <Ico n="analyze" sz={12}/> Split
          </button>
        )}
      </div>

      {isSplitting && (
        <div style={{background:C.muted, padding:10, borderRadius:14, display:"flex", flexDirection:"column", gap:8}}>
           <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span style={{color:C.text, fontSize:10, fontWeight:800, textTransform:"uppercase"}}>Breakdown</span>
              <button onClick={() => setSplits([...splits, {id:uid(), amount:"", category:"c13"}])} style={{background:C.primary, border:"none", borderRadius:6, padding:"3px 8px", color:"#000", fontSize:9, fontWeight:800, cursor:"pointer"}}>+ Row</button>
           </div>
           {splits.map((s, i) => (
             <div key={s.id} style={{display:"flex", gap:6, alignItems:"center"}}>
                <div style={{flex:1}}>
                  <FInput theme={C} value={s.amount} onChange={e => {
                    const newSplits = [...splits];
                    newSplits[i].amount = e.target.value;
                    setSplits(newSplits);
                  }} type="number" placeholder="Amt" style={{padding:"6px 8px", fontSize:14}}/>
                </div>
                <div style={{flex:1.5}}>
                  <CustomSelect
                    theme={C}
                    value={s.category}
                    options={categories.filter(c=>c.type===tx.txType && !c.deleted)}
                    onChange={v => {
                      const newSplits = [...splits];
                      newSplits[i].category = v;
                      setSplits(newSplits);
                    }}
                    placeholder="Cat"
                    searchable={false}
                  />
                </div>
                {splits.length > 1 && (
                  <button onClick={() => setSplits(splits.filter(x => x.id !== s.id))} style={{background:"none", border:"none", color:C.expense, cursor:"pointer", padding:2}}><Ico n="close" sz={14}/></button>
                )}
             </div>
           ))}
           <div style={{display:"flex", justifyContent:"space-between", paddingTop:6, borderTop:`1px solid ${C.border}`}}>
              <span style={{color:C.sub, fontSize:10, fontWeight:700}}>Total: {fmtAmt(splits.reduce((acc,curr)=>acc+(parseFloat(curr.amount)||0), 0))}</span>
              <span style={{color:Math.abs(tx.amount - splits.reduce((acc,curr)=>acc+(parseFloat(curr.amount)||0), 0)) < 0.01 ? C.income : C.expense, fontSize:10, fontWeight:900}}>
                {Math.abs(tx.amount - splits.reduce((acc,curr)=>acc+(parseFloat(curr.amount)||0), 0)) < 0.01 ? "✓ Balanced" : `Remaining: ${fmtAmt(tx.amount - splits.reduce((acc,curr)=>acc+(parseFloat(curr.amount)||0), 0))}`}
              </span>
           </div>
        </div>
      )}

      {/* Row 5: Tags + Account */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
        <CustomSelect 
          theme={C}
          label="Tags" 
          value={tx.tags||[]} 
          options={tags} 
          multi={true}
          placeholder="None"
          onChange={f("tags")}
        />
        <CustomSelect 
          theme={C}
          label="Account" 
          value={tx.accountId||""} 
          options={[{id:"", name:"None", color:C.sub}, ...accounts.map(a=>({...a}))]} 
          onChange={f("accountId")}
        />
      </div>

      {/* Row 6: Notes */}
      <div>
        <FLabel theme={C}>Notes</FLabel>
        <FInput theme={C} value={tx.notes||""} onChange={fEv("notes")} placeholder="Optional…"/>
      </div>

      <div style={{display:"flex",gap:8,paddingTop:8, borderTop:`1px solid ${C.border}`}}>
        {onDelete && (
          confirmDelete ? (
            <div style={{display:"flex", alignItems:"center", gap:6, background:C.expense+"11", padding:"3px 10px", borderRadius:10, border:`1px solid ${C.expense}40`}}>
              <span style={{color:C.expense, fontSize:9, fontWeight:900, textTransform:"uppercase"}}>Confirm?</span>
              <button type="button" onClick={()=>onDelete(tx.id)} style={{background:C.expense, border:"none", color:"#fff", cursor:"pointer", borderRadius:6, padding:"4px 10px", fontSize:10, fontWeight:800}}>YES</button>
              <button type="button" onClick={()=>setConfirmDelete(false)} style={{background:"none", border:`1px solid ${C.border}`, color:C.sub, cursor:"pointer", borderRadius:6, padding:"4px 10px", fontSize:10, fontWeight:800}}>NO</button>
            </div>
          ) : (
            <Btn theme={C} v="ghost" sm icon="trash" onClick={()=>setConfirmDelete(true)} style={{color:C.expense}}>Delete</Btn>
          )
        )}
        <div style={{flex:1}}/>
        <Btn theme={C} v="ghost" sm onClick={onClose}>Cancel</Btn>
        <Btn theme={C} v="primary" sm disabled={!valid || (isSplitting && Math.abs(tx.amount - splits.reduce((a,c)=>a+(parseFloat(c.amount)||0), 0)) > 0.01)} onClick={()=>{
          if (!init?.id) {
            if (!existingTransactions) {
              console.warn("TxForm: existingTransactions prop missing — duplicate check skipped");
            }
            const result = checkImportBatch([{ ...tx, id: "_temp_" }], existingTransactions || []);
            if (result.duplicates.length > 0) {
              const dup = result.duplicates[0];
              const proceed = window.confirm(
                `This looks like a duplicate of:\n\n` +
                `"${dup.existing.description}"\n` +
                `${new Date(dup.existing.date).toLocaleDateString()} • ${fmtAmt(dup.existing.amount)}\n\n` +
                `Save anyway?`
              );
              if (!proceed) return;
            }
          }
          if(isSplitting) {
            const splitTxs = splits.map(s => ({
              ...tx, 
              id: uid(), 
              amount: parseFloat(s.amount), 
              category: s.category, 
              description: `${tx.description} (${categories.find(c=>c.id===s.category)?.name})`
            }));
            onSave(splitTxs);
          } else {
            onSave(init?.id ? { ...tx, amount: parseFloat(tx.amount) || 0 } : { ...tx, id: uid(), amount: parseFloat(tx.amount) || 0 });
          }
        }}>{init?.id ? "Save" : isSplitting ? "Save Splits" : "Add"}</Btn>
      </div>
    </div>
  );
};
