import React from "react";
import { Ico } from "../components/ui/Ico.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { fmtAmt } from "../utils/format.js";
import { getAccBal, getNetWorth } from "../utils/analytics.js";

export default function VaultPage({ accounts, transactions, onAddAcc, onEditAcc, onDeleteAcc, theme }) {
  const C = theme;
  const netWorth = getNetWorth(accounts, transactions);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);

  return (
    <div className="page-enter" style={{padding:"16px 16px 100px 16px",display:"flex",flexDirection:"column",gap:20}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h2 style={{margin:0,fontSize:24,fontWeight:900,color:C.text,letterSpacing:"-0.02em"}}>Vault</h2>
          <p style={{margin:0,color:C.sub,fontSize:12,marginTop:2}}>{accounts.length} linked accounts</p>
        </div>
        <Btn theme={C} icon="plus" sm onClick={onAddAcc}>Add</Btn>
      </div>

      {/* Total Balance Summary */}
      {accounts.length > 0 && (
        <div style={{
          background: C.surface, 
          border:`1px solid ${C.borderLight}`, borderRadius:32, padding:24,
          boxShadow:C.shadow, position:"relative", overflow:"hidden"
        }}>
          <div style={{color:C.sub,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>Total Net Worth</div>
          <div style={{color:C.text,fontSize:32,fontWeight:800,letterSpacing:"-.02em"}}>
            {fmtAmt(netWorth)}
          </div>
        </div>
      )}

      {accounts.length===0 ? (
        <div style={{
          background:C.surface, border:`1px solid ${C.borderLight}`,
          borderRadius:32,padding:"60px 24px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:20,
          boxShadow:C.shadow, position:"relative", overflow:"hidden"
        }}>
          <div style={{width:80,height:80,borderRadius:24,background:C.input,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40, border:`1px solid ${C.borderLight}`, zIndex:1}}>🏦</div>
          <div style={{zIndex:1}}>
            <div style={{color:C.text,fontSize:20,fontWeight:800,marginBottom:8, letterSpacing:"-0.02em"}}>No Accounts Yet</div>
            <div style={{color:C.sub,fontSize:14,lineHeight:1.6,maxWidth:280, margin:"0 auto"}}>Add your bank accounts, wallets, and cards to track balances.</div>
          </div>
          <div style={{zIndex:1, marginTop:8}}>
             <Btn theme={C} icon="plus" onClick={onAddAcc}>Add First Account</Btn>
          </div>
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          {accounts.map((acc, i) => {
            const bal = getAccBal(accounts, transactions, acc.id);
            const txnsCount = transactions.filter(t => t.accountId === acc.id).length;
            const isConfirming = confirmDeleteId === acc.id;
            return (
              <div key={acc.id} style={{
                background:C.surface, border:`1px solid ${C.borderLight}`, borderRadius:24, padding:20,
                display:"flex", flexDirection:"column", gap:14, transition:"all .2s ease",
                position:"relative", overflow:"hidden", boxShadow: C.shadow,
                animation: `fadeInUp 0.4s ease forwards`, animationDelay: `${i * 0.05}s`, opacity:0, transform:"translateY(10px)"
              }} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderLight;e.currentTarget.style.transform="translateY(0)";}}>
                
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                   <div style={{display:"flex", alignItems:"center", gap:12}}>
                     <div style={{width:44, height:44, borderRadius:14, background:C.input, display:"flex", alignItems:"center", justifyContent:"center"}}>
                       <Ico n={acc.type==="Credit Card"?"list":acc.type==="Wallet"?"archive":"bank"} sz={20} c={C.primary}/>
                     </div>
                     <div>
                       <div style={{color:C.text, fontSize:15, fontWeight:800, letterSpacing:"-0.01em"}}>{acc.name}</div>
                       <div style={{color:C.sub, fontSize:12, fontWeight:600, marginTop:2}}>{acc.type}</div>
                     </div>
                   </div>
                   <div style={{display:"flex", gap:10, position:"relative", zIndex:9999}}>
                     {/* Edit button */}
                     <div onClick={(e)=>{e.stopPropagation(); onEditAcc(acc);}} style={{background:C.input, color:C.sub, cursor:"pointer", width:36, height:36, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", pointerEvents:"auto"}} onMouseEnter={e=>{e.currentTarget.style.background=C.primary; e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.background=C.input; e.currentTarget.style.color=C.sub;}}>
                       <Ico n="edit" sz={16}/>
                     </div>
                     {/* Delete button */}
                     <div 
                       onClick={(e)=>{
                         e.stopPropagation();
                         console.log("Vault: Trash icon explicitly clicked for:", acc.id);
                         setConfirmDeleteId(acc.id);
                       }} 
                       style={{background:C.input, color:C.expense, cursor:"pointer", width:36, height:36, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", pointerEvents:"auto"}} 
                       onMouseEnter={e=>{e.currentTarget.style.background=C.expense; e.currentTarget.style.color="#fff";}} 
                       onMouseLeave={e=>{e.currentTarget.style.background=C.input; e.currentTarget.style.color=C.expense;}}
                     >
                       <Ico n="trash" sz={16}/>
                     </div>
                    </div>
                </div>

                {/* Inline delete confirmation */}
                {isConfirming && (
                  <div style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    background:C.input, borderRadius:14, padding:"12px",
                    animation:"fadeIn 0.2s ease"
                  }}>
                    <span style={{color:C.expense, fontSize:12, fontWeight:700}}>Delete this account?</span>
                    <div style={{display:"flex", gap:8}}>
                      <button 
                        onClick={(e)=>{
                          e.stopPropagation();
                          onDeleteAcc(acc.id); 
                          setConfirmDeleteId(null);
                        }} 
                        style={{background:C.expense, border:"none", borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer"}}
                      >
                        Yes
                      </button>
                      <button 
                        onClick={(e)=>{
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }} 
                        style={{background:"none", border:`1px solid ${C.borderLight}`, borderRadius:10, padding:"6px 14px", color:C.text, fontSize:12, fontWeight:600, cursor:"pointer"}}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginTop:4, borderTop:`1px dashed ${C.borderLight}`, paddingTop:16}}>
                   <div style={{color:C.sub, fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:6}}><Ico n="swap" sz={14}/> {txnsCount} entries</div>
                   <div style={{textAlign:"right"}}>
                     <div style={{color:C.sub, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4}}>Balance</div>
                     <div style={{color:bal>=0?C.text:C.expense, fontSize:22, fontWeight:800, letterSpacing:"-.02em"}}>{fmtAmt(bal)}</div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
