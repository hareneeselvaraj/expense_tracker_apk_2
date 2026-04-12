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
            <div style={{color:C.sub,fontSize:12,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",marginBottom:16,paddingLeft:4,display:"flex",alignItems:"center",gap:10}}>
              {type} <div style={{flex:1,height:1,background:C.borderLight}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))",gap:12}}>
              {cats.map(cat=>{
                const txns=transactions.filter(t=>!t.deleted && t.category===cat.id);
                const count=txns.length;
                const total=txns.reduce((s,t)=>s+t.amount,0);
                return (
                  <div key={cat.id} style={{
                    background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:24,padding:16,
                    display:"flex",flexDirection:"column",gap:12,transition:"all .2s ease",
                    backdropFilter:"blur(10px)",position:"relative",overflow:"hidden", minHeight:150
                  }} onMouseEnter={e=>{e.currentTarget.style.borderColor=cat.color;e.currentTarget.style.transform="translateY(-4px)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)"}}>
                    <div style={{position:"absolute",top:-20,right:-20,width:60,height:60,background:cat.color,filter:"blur(30px)",opacity:0.15}}/>
                    
                      <div style={{width:48,height:48,borderRadius:16,background:`linear-gradient(135deg,${cat.color}33,${cat.color}11)`,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${cat.color}55`, fontSize:24, boxShadow:`0 10px 20px ${cat.color}1a`, backdropFilter:"blur(10px)", color:cat.color}}>
                        {cat.icon ? <Icon name={cat.icon} size={24} /> : "📦"}
                      </div>
                      <div style={{display:"flex",gap:4, background:C.surface+"66", borderRadius:12, padding:2, border:`1px solid ${C.border}`, backdropFilter:"blur(8px)"}}>
                        {confirmId === cat.id ? (
                          <div style={{display:"flex", alignItems:"center", gap:4, padding:"0 4px"}}>
                            <span style={{color:C.expense, fontSize:9, fontWeight:900}}>DELETE?</span>
                            <button onClick={()=>onDeleteCat(cat.id)} style={{background:C.expense, border:"none", color:"#fff", cursor:"pointer", borderRadius:8, padding:"4px 8px", fontSize:10, fontWeight:800}}>YES</button>
                            <button onClick={()=>setConfirmId(null)} style={{background:"none", border:`1px solid ${C.border}`, color:C.sub, cursor:"pointer", borderRadius:8, padding:"4px 8px", fontSize:10, fontWeight:800}}>NO</button>
                          </div>
                        ) : (
                          <>
                            <button onClick={()=>onEditCat(cat)} style={{background:"none",border:"none",color:C.sub,cursor:"pointer",padding:8,display:"flex", borderRadius:10, transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.color=C.primary; e.currentTarget.style.background=C.primaryDim}} onMouseLeave={e=>{e.currentTarget.style.color=C.sub; e.currentTarget.style.background="none"}}><Ico n="pen" sz={14}/></button>
                            <button onClick={()=>setConfirmId(cat.id)} style={{background:"none",border:"none",color:C.sub,cursor:"pointer",padding:8,display:"flex", borderRadius:10, transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.color=C.expense; e.currentTarget.style.background=C.expense+"22"}} onMouseLeave={e=>{e.currentTarget.style.color=C.sub; e.currentTarget.style.background="none"}}><Ico n="trash" sz={14}/></button>
                          </>
                        )}
                      </div>

                    <div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", marginTop:4}}>
                      <div style={{color:C.text,fontSize:15,fontWeight:800, lineHeight:1.2, letterSpacing:"-.01em"}}>{cat.name}</div>
                      <div style={{color:C.sub,fontSize:12,marginTop:4,fontWeight:600}}>{count} entries</div>
                    </div>

                    {count > 0 && (
                      <div style={{color:C.text,fontSize:16,fontWeight:800,marginTop:8, borderTop:`1px solid ${C.borderLight}`, paddingTop:12}}>
                        {fmtAmt(total)}
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
