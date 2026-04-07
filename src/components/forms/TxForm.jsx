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

export const TxForm = ({init, categories, tags, accounts, existingTransactions, onSave, onDelete, onClose, theme}) => {
  const [tx, setTx] = useState({...BLANK_TX, ...init});
  const [isSplitting, setIsSplitting] = useState(false);
  const [splits, setSplits] = useState([{id:uid(), amount:"", category:init?.category||"c13"}]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const C = theme;
  
  const f = k => v => setTx(p=>({...p,[k]:v}));
  const fEv = k => e => setTx(p=>({...p,[k]:e.target.value}));

  const toggleTag = tid => setTx(p=>({...p,tags:(p.tags||[]).includes(tid)?p.tags.filter(x=>x!==tid):[...(p.tags||[]),tid]}));

  const valid = tx.description.trim() && parseFloat(tx.amount) > 0;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* Row 1: Date */}
      <div>
        <FLabel theme={C}>Date</FLabel>
        <FInput theme={C} value={tx.date} onChange={fEv("date")} type="date"/>
      </div>

      {/* Row 2: Credit / Debit toggle */}
      <div>
        <FLabel theme={C}>Credit / Debit</FLabel>
        <CdToggle theme={C} value={tx.creditDebit} onChange={v=>{
          setTx(p=>({...p, creditDebit:v, txType:v==="Credit"?"Income":"Expense"}));
        }}/>
      </div>

      {/* Row 3: Transaction Type */}
      <div>
        <FLabel theme={C}>Transaction Type</FLabel>
        <TypeToggle theme={C} value={tx.txType} onChange={f("txType")}/>
      </div>

      {/* Row 4: Category */}
      <CustomSelect 
        theme={C}
        label="Category" 
        value={tx.category} 
        options={categories.filter(c=>c.type===tx.txType && !c.deleted)} 
        onChange={f("category")}
      />

      {/* Row 5: Description */}
      <div>
        <FLabel theme={C}>Description</FLabel>
        <FInput theme={C} value={tx.description} onChange={fEv("description")} placeholder="e.g. Swiggy, Salary, Rent…"/>
      </div>

      {/* Row 6: Amount */}
      <div style={{display:"flex", alignItems:"flex-end", gap:10}}>
        <div style={{flex:1}}>
          <FLabel theme={C}>Amount (₹)</FLabel>
          <FInput theme={C} value={tx.amount} onChange={fEv("amount")} type="number" placeholder="0" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:700,color:tx.creditDebit==="Credit"?C.income:C.expense}}/>
        </div>
        {!init?.id && (
          <button onClick={() => setIsSplitting(!isSplitting)} style={{background:isSplitting?C.primaryDim:C.muted, border:`1px solid ${isSplitting?C.primary:C.border}`, borderRadius:10, padding:"8px 12px", color:isSplitting?C.primary:C.sub, fontSize:11, fontWeight:800, cursor:"pointer", transition:"all .2s", height:42, display:"flex", alignItems:"center", gap:6}}>
            <Ico n="analyze" sz={14}/> {isSplitting ? "Cancel Split" : "Split"}
          </button>
        )}
      </div>

      {isSplitting && (
        <div style={{background:C.muted, padding:14, borderRadius:18, display:"flex", flexDirection:"column", gap:12, marginTop:-4}}>
           <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span style={{color:C.text, fontSize:11, fontWeight:800, textTransform:"uppercase"}}>Breakdown</span>
              <button onClick={() => setSplits([...splits, {id:uid(), amount:"", category:"c13"}])} style={{background:C.primary, border:"none", borderRadius:6, padding:"4px 8px", color:"#000", fontSize:10, fontWeight:800, cursor:"pointer"}}>+ Add Row</button>
           </div>
           {splits.map((s, i) => (
             <div key={s.id} style={{display:"flex", gap:8, alignItems:"center"}}>
                <div style={{flex:1}}>
                  <FInput theme={C} value={s.amount} onChange={e => {
                    const newSplits = [...splits];
                    newSplits[i].amount = e.target.value;
                    setSplits(newSplits);
                  }} type="number" placeholder="Amt" style={{padding:"8px 10px", fontSize:16}}/>
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
                  <button onClick={() => setSplits(splits.filter(x => x.id !== s.id))} style={{background:"none", border:"none", color:C.expense, cursor:"pointer", padding:4}}><Ico n="close" sz={16}/></button>
                )}
             </div>
           ))}
           <div style={{display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:`1px solid ${C.border}`}}>
              <span style={{color:C.sub, fontSize:11, fontWeight:700}}>Total: {fmtAmt(splits.reduce((acc,curr)=>acc+(parseFloat(curr.amount)||0), 0))}</span>
              <span style={{color:Math.abs(tx.amount - splits.reduce((acc,curr)=>acc+(parseFloat(curr.amount)||0), 0)) < 0.01 ? C.income : C.expense, fontSize:11, fontWeight:900}}>
                {Math.abs(tx.amount - splits.reduce((acc,curr)=>acc+(parseFloat(curr.amount)||0), 0)) < 0.01 ? "✓ Balanced" : `Remaining: ${fmtAmt(tx.amount - splits.reduce((acc,curr)=>acc+(parseFloat(curr.amount)||0), 0))}`}
              </span>
           </div>
        </div>
      )}

      {/* Row 7: Tags + Account */}
      <div style={{display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:12}}>
        <CustomSelect 
          theme={C}
          label="Tags" 
          value={tx.tags||[]} 
          options={tags} 
          multi={true}
          placeholder="No tags"
          onChange={f("tags")}
        />
        <CustomSelect 
          theme={C}
          label="Account" 
          value={tx.accountId||""} 
          options={[{id:"", name:"Default (None)", color:C.sub}, ...accounts.map(a=>({...a}))]} 
          onChange={f("accountId")}
        />
      </div>

      {/* Row 8: Notes */}
      <div>
        <FLabel theme={C}>Notes</FLabel>
        <FInput theme={C} value={tx.notes||""} onChange={fEv("notes")} placeholder="Optional details…"/>
      </div>

      <div style={{display:"flex",gap:10,paddingTop:12, borderTop:`1px solid ${C.border}`}}>
        {onDelete && (
          confirmDelete ? (
            <div style={{display:"flex", alignItems:"center", gap:8, background:C.expense+"11", padding:"4px 12px", borderRadius:12, border:`1px solid ${C.expense}40`}}>
              <span style={{color:C.expense, fontSize:10, fontWeight:900, textTransform:"uppercase"}}>Confirm?</span>
              <button type="button" onClick={()=>onDelete(tx.id)} style={{background:C.expense, border:"none", color:"#fff", cursor:"pointer", borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:800}}>YES</button>
              <button type="button" onClick={()=>setConfirmDelete(false)} style={{background:"none", border:`1px solid ${C.border}`, color:C.sub, cursor:"pointer", borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:800}}>NO</button>
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
        }}>{init?.id ? "Save Changes" : isSplitting ? "Save Splits" : "Add Transaction"}</Btn>
      </div>
    </div>
  );
};
