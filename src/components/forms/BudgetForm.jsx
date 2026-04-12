import React, { useState } from "react";
import { Ico } from "../ui/Ico.jsx";
import Icon from "../ui/Icon.jsx";
import { Btn } from "../ui/Btn.jsx";

export function BudgetForm({ item: initialItem, type, currentBudget, onSave, onCancel, theme, availables = [] }) {
  const C = theme;
  const [selectedItem, setSelectedItem] = useState(initialItem);
  const [amount, setAmount] = useState(currentBudget?.amount || "");
  const isCat = type === "categories";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    onSave(selectedItem.id, Number(amount));
  };

  if (!selectedItem) {
    return (
      <div style={{padding:24, display:"flex", flexDirection:"column", gap:20}}>
        <div style={{color:C.sub, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".1em"}}>Select {isCat ? "Category" : "Tag"} to Budget</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:12, maxHeight:300, overflowY:"auto", padding:4}}>
          {availables.map(x => (
            <button key={x.id} onClick={() => setSelectedItem(x)} style={{
              background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:12, cursor:"pointer",
              display:"flex", alignItems:"center", gap:10, transition:"all .2s", textAlign:"left"
            }} onMouseEnter={e => { e.currentTarget.style.borderColor = x.color; e.currentTarget.style.background = x.color + "11"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}>
              <div style={{width:32, height:32, borderRadius:8, background:x.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:x.color, flexShrink:0}}>
                {isCat ? (x.icon ? <Icon name={x.icon} size={16} /> : "📦") : "#"}
              </div>
              <div style={{color:C.text, fontSize:12, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                {isCat ? x.name : x.name}
              </div>
            </button>
          ))}
        </div>
        <Btn theme={C} v="ghost" full onClick={onCancel}>Cancel</Btn>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{padding:24, display:"flex", flexDirection:"column", gap:24}}>
      <div style={{display:"flex", gap:20, alignItems:"center", padding:16, background:C.input, borderRadius:20, border:`1px solid ${C.border}`, position:"relative"}}>
        <button type="button" onClick={() => setSelectedItem(null)} style={{position:"absolute", top:10, right:10, background:"none", border:"none", color:C.sub, cursor:"pointer"}}><Ico n="pen" sz={12} /></button>
        <div style={{
          width:56, height:56, borderRadius:16, background:`linear-gradient(135deg, ${selectedItem.color}33, ${selectedItem.color}11)`,
          display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${selectedItem.color}66`,
          fontSize:28, boxShadow:`0 10px 20px ${selectedItem.color}22`, backdropFilter:"blur(10px)",
          color: isCat ? "inherit" : selectedItem.color
        }}>
          {isCat ? (selectedItem.icon ? <Icon name={selectedItem.icon} size={28} color={selectedItem.color} /> : "📦") : "#"}
        </div>
        <div>
          <div style={{color:C.text, fontSize:18, fontWeight:900}}>{isCat ? selectedItem.name : `#${selectedItem.name}`}</div>
          <div style={{color:C.sub, fontSize:12, fontWeight:700, textTransform:"uppercase"}}>Setting Monthly Limit</div>
        </div>
      </div>

      <div>
        <label style={{color:C.sub, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".1em"}}>Monthly Budget Amount</label>
        <div style={{display:"flex", alignItems:"center", gap:12, borderBottom:`2px solid ${C.border}`, transition:"all .3s"}} onFocusCapture={e=>e.currentTarget.style.borderColor=C.primary} onBlurCapture={e=>e.currentTarget.style.borderColor=C.border}>
          <span style={{fontSize:24, fontWeight:900, color:C.primary}}>₹</span>
          <input 
            autoFocus
            type="number"
            value={amount}
            onChange={e=>setAmount(e.target.value)}
            placeholder="0.00"
            style={{
              width:"100%", background:"none", border:"none",
              color:C.text, fontSize:32, fontWeight:900, padding:"12px 0", outline:"none",
              fontFamily:"'JetBrains Mono',monospace"
            }}
          />
        </div>
      </div>

      <p style={{margin:0, color:C.sub, fontSize:11, lineHeight:1.5, fontStyle:"italic"}}>
        Setting a budget helps you track your spending velocity. You'll see a progress bar for this category in the Organize hub.
      </p>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:8}}>
        <Btn theme={C} v="ghost" full onClick={onCancel}>Cancel</Btn>
        <Btn theme={C} v="primary" full type="submit">Save Budget</Btn>
      </div>
    </form>
  );
}
