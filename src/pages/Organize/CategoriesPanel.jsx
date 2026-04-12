import React, { useState } from "react";
import { Ico } from "../../components/ui/Ico.jsx";
import Icon from "../../components/ui/Icon.jsx";
import { Btn } from "../../components/ui/Btn.jsx";
import { fmtAmt } from "../../utils/format.js";

export default function CategoriesPanel({ categories, transactions, DEF_CATS, onAddCat, onEditCat, onDeleteCat, theme }) {
  const C = theme;
  const [confirmId, setConfirmId] = useState(null);

  return (
    <div className="page-enter" style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:800,color:C.text,letterSpacing:"-.02em"}}>Categories</h2>
          <p style={{margin:0,color:C.sub,fontSize:12}}>{categories.length} categories active</p>
        </div>
        <Btn theme={C} icon="plus" sm onClick={onAddCat}>Add</Btn>
      </div>

      {["Expense","Income","Investment"].map(type=>{
        const cats=categories.filter(c=>c.type===type); if(!cats.length) return null;
        return (
          <div key={type}>
            <div style={{color:C.sub,fontSize:12,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",marginBottom:12,paddingLeft:4,display:"flex",alignItems:"center",gap:10}}>
              {type} <div style={{flex:1,height:1,background:C.borderLight}}/>
            </div>
            
            <div style={{background:C.surface, borderRadius:20, border:`1px solid ${C.borderLight}`, overflow:"hidden", boxShadow:C.shadow}}>
              {cats.map((cat, idx)=>{
                const txns=transactions.filter(t=>!t.deleted && t.category===cat.id);
                const count=txns.length;
                const total=txns.reduce((s,t)=>s+t.amount,0);
                const isLast = idx === cats.length - 1;

                return (
                  <div key={cat.id} 
                    onClick={() => onEditCat(cat)}
                    style={{
                    display:"flex", alignItems:"center", padding:"12px 16px",
                    borderBottom: isLast ? "none" : `1px solid ${C.borderLight}`,
                    background: confirmId === cat.id ? C.expense + "11" : "transparent",
                    transition: "background .2s", cursor: "pointer", position: "relative"
                  }}>
                    {/* Left: Icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: `${cat.color}1a`, display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      {cat.icon ? <Icon name={cat.icon} size={20} color={cat.color} /> : "📦"}
                    </div>

                    {/* Middle: Info */}
                    <div style={{flex:1, minWidth:0, marginLeft:12}}>
                      <div style={{color:C.text, fontSize:15, fontWeight:800, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{cat.name}</div>
                      <div style={{color:C.sub, fontSize:12, fontWeight:600, marginTop:2}}>{count} entries {count > 0 && `· ${fmtAmt(total)}`}</div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{display:"flex", alignItems:"center", gap: 10, paddingLeft: 8}}>
                      <button onClick={(e)=>{e.stopPropagation(); setConfirmId(cat.id);}} style={{background:"transparent", border:"none", color:C.sub, cursor:"pointer", padding:8, borderRadius:10}}>
                        <Ico n="trash" sz={16}/>
                      </button>
                      <Ico n="chevronRight" sz={14} c={C.sub} opacity={0.5} />
                    </div>

                    {/* Delete Confirmation Overlay */}
                    {confirmId === cat.id && (
                      <div onClick={(e) => e.stopPropagation()} style={{
                        position: "absolute", inset: 0, background: C.surface, 
                        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px",
                        borderBottom: isLast ? "none" : `1px solid ${C.borderLight}`
                      }}>
                        <div style={{ color: C.expense, fontSize: 13, fontWeight: 800 }}>Delete {cat.name}?</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={()=>setConfirmId(null)} style={{background:C.input, border:"none", color:C.text, cursor:"pointer", borderRadius:12, padding:"8px 16px", fontSize:12, fontWeight:800}}>Cancel</button>
                          <button onClick={()=>onDeleteCat(cat.id)} style={{background:C.expense, border:"none", color:"#fff", cursor:"pointer", borderRadius:12, padding:"8px 16px", fontSize:12, fontWeight:800}}>Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
