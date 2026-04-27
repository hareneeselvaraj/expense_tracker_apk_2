import React, { useState } from "react";
import { Ico } from "../components/ui/Ico.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { fmtAmt } from "../utils/format.js";
import { getAccBal, getNetWorth } from "../utils/analytics.js";
import ReportsPage from "./Reports.jsx";
import RecurringPanel from "./RecurringPanel.jsx";

export default function VaultPage({ 
  accounts, transactions, onAddAcc, onEditAcc, onDeleteAcc, theme,
  vaultTab, setVaultTab,
  // Recurring Props
  recurring, onAddRecurring, onEditRecurring, onDeleteRecurring, onTogglePauseRecurring,
  // Notes Props
  vaultNotes, onAddNote, onEditNote, onDeleteNote,
  // Reports Props
  reportTab, setReportTab,
  reportsMode, setReportsMode,
  reportsSubTab, setReportsSubTab,
  reportDate, setReportDate,
  filtered, categories, tags
}) {
  const C = theme;
  const netWorth = getNetWorth(accounts, transactions);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);

  const [flipped, setFlipped] = React.useState(false);

  const investedValue = React.useMemo(() => {
    return (transactions || [])
      .filter(t => !t.deleted && t.txType === "Investment")
      .reduce((sum, t) => sum + (t.creditDebit === "Debit" ? t.amount : -t.amount), 0);
  }, [transactions]);

  const overallNetWorth = netWorth + investedValue;

  return (
    <div className="page-enter" style={{padding:"16px 10px 100px",display:"flex",flexDirection:"column",gap:20}}>
      
      {/* Sub-tab switcher */}
      <div style={{display:"flex", background:C.input, borderRadius:24, padding:4, marginBottom: 8}}>
        {[
          { id: "accounts", label: "Accounts", icon: "bank" },
          { id: "notes", label: "Notes", icon: "edit" },
          { id: "recurring", label: "Recurring", icon: "repeat" },
          { id: "reports", label: "Analytics", icon: "chart" }
        ].map(t => (
          <button key={t.id} onClick={() => setVaultTab(t.id)} style={{
            flex:1, padding:"10px", borderRadius:20, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: vaultTab === t.id ? C.primary : "transparent",
            color: vaultTab === t.id ? "#fff" : C.sub,
            boxShadow: vaultTab === t.id ? `0 4px 12px ${C.primary}40` : "none",
            transition: "all .2s ease"
          }}>
            <Ico n={t.icon} sz={16} c={vaultTab === t.id ? "#fff" : C.sub} />
            {t.label}
          </button>
        ))}
      </div>

      {vaultTab === "reports" ? (
        <div style={{marginTop: 8}}>
          <ReportsPage {...{
            reportTab, setReportTab, reportsMode, setReportsMode, reportsSubTab, setReportsSubTab, reportDate, setReportDate,
            filtered, categories, tags, theme
          }} />
        </div>
      ) : vaultTab === "recurring" ? (
        <RecurringPanel
          recurring={recurring}
          categories={categories}
          accounts={accounts}
          onAdd={onAddRecurring}
          onEdit={onEditRecurring}
          onTogglePause={onTogglePauseRecurring}
          onDelete={onDeleteRecurring}
          theme={theme}
        />
      ) : vaultTab === "notes" ? (
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center", marginBottom: 4}}>
            <p style={{margin:0,color:C.sub,fontSize:13,fontWeight:600}}>{(vaultNotes||[]).length} notes</p>
            <Btn theme={C} icon="plus" sm onClick={onAddNote}>Add Note</Btn>
          </div>

          {(!vaultNotes || vaultNotes.length === 0) ? (
            <div style={{
              background:C.surface, border:`1px solid ${C.borderLight}`,
              borderRadius:24,padding:"50px 24px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:16,
              boxShadow:C.shadow
            }}>
              <div style={{width:64,height:64,borderRadius:20,background:C.input,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32, border:`1px solid ${C.borderLight}`}}>📝</div>
              <div>
                <div style={{color:C.text,fontSize:18,fontWeight:800,marginBottom:6, letterSpacing:"-0.02em"}}>No Notes Yet</div>
                <div style={{color:C.sub,fontSize:13,lineHeight:1.5,maxWidth:260, margin:"0 auto"}}>Keep track of lended amounts, sweep-in FDs, and other financial notes.</div>
              </div>
              <Btn theme={C} icon="plus" onClick={onAddNote}>Add First Note</Btn>
            </div>
          ) : (
            vaultNotes.map((n, i) => (
              <div key={n.id} onClick={() => onEditNote(n)} style={{
                background:C.surface, border:`1px solid ${C.borderLight}`, borderRadius:20, padding:16,
                cursor:"pointer", transition:"all .2s ease", position:"relative", overflow:"hidden",
                boxShadow: C.shadow, borderLeft: `4px solid ${n.color || C.primary}`,
                animation: `fadeInUp 0.4s ease forwards`, animationDelay: `${i * 0.05}s`, opacity:0, transform:"translateY(10px)"
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderLight;e.currentTarget.style.transform="translateY(0)";}}
              >
                <div style={{fontSize:15, fontWeight:800, color:C.text, marginBottom:6, letterSpacing:"-0.01em"}}>{n.title}</div>
                {n.body && <div style={{fontSize:13, color:C.sub, lineHeight:1.5, whiteSpace:"pre-wrap", maxHeight:80, overflow:"hidden"}}>{n.body}</div>}
                <div style={{fontSize:10, color:C.sub, marginTop:8, fontWeight:600, opacity:0.7}}>
                  {new Date(n.updatedAt || n.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center", marginBottom: 8}}>
            <p style={{margin:0,color:C.sub,fontSize:13,fontWeight:600}}>{accounts.length} linked accounts</p>
            <Btn theme={C} icon="plus" sm onClick={onAddAcc}>Add</Btn>
          </div>

          {/* Total Balance Summary */}
          {accounts.length > 0 && (
            <div
              onClick={() => setFlipped(f => !f)}
              style={{
                perspective: 1200,
                cursor: "pointer",
                minHeight: 148,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  minHeight: 148,
                  transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
                  transformStyle: "preserve-3d",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* ── FRONT ── */}
                <div
                  className="hero-card"
                  style={{
                    position: "absolute", inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    background: C.surface, border: `1px solid ${C.borderLight}`,
                    borderRadius: 32, padding: 24, boxShadow: C.shadow, overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ color: C.sub, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>
                      Total Net Worth
                    </div>
                    <div style={{ color: C.sub, fontSize: 9, fontWeight: 700, opacity: 0.6 }}>TAP TO FLIP ↻</div>
                  </div>
                  <div className="hero-amount" style={{ color: C.text, fontSize: 32, fontWeight: 800, letterSpacing: "-.02em" }}>
                    {fmtAmt(netWorth)}
                  </div>
                </div>

                {/* ── BACK ── */}
                <div
                  style={{
                    position: "absolute", inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: `linear-gradient(135deg, ${C.surface}, ${C.primaryDim || C.surface})`,
                    border: `1px solid ${C.primary}33`,
                    borderRadius: 32, padding: 24, boxShadow: C.shadow, overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ color: C.primary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>
                      Total Wealth
                    </div>
                    <div style={{ color: C.sub, fontSize: 9, fontWeight: 700, opacity: 0.6 }}>TAP TO FLIP ↻</div>
                  </div>
                  <div style={{ color: C.text, fontSize: 32, fontWeight: 800, letterSpacing: "-.02em" }}>
                    {fmtAmt(overallNetWorth)}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 12, borderTop: `1px dashed ${C.border}`, paddingTop: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Liquid</div>
                      <div style={{ color: C.text, fontSize: 18, fontWeight: 800, marginTop: 2 }}>{fmtAmt(netWorth)}</div>
                    </div>
                    <div style={{ width: 1, background: C.borderLight }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Invested</div>
                      <div style={{ color: C.invest || C.primary, fontSize: 18, fontWeight: 800, marginTop: 2 }}>{fmtAmt(investedValue)}</div>
                    </div>
                  </div>
                </div>
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
            <div className="acc-list" style={{display:"flex", flexDirection:"column", gap:14}}>
              {accounts.map((acc, i) => {
                const bal = getAccBal(accounts, transactions, acc.id);
                const txnsCount = transactions.filter(t => t.accountId === acc.id).length;
                const isConfirming = confirmDeleteId === acc.id;
                return (
                  <div key={acc.id} className="acc-card" style={{
                    background:C.surface, border:`1px solid ${C.borderLight}`, borderRadius:24, padding:20,
                    display:"flex", flexDirection:"column", gap:14, transition:"all .2s ease",
                    position:"relative", overflow:"hidden", boxShadow: C.shadow,
                    animation: `fadeInUp 0.4s ease forwards`, animationDelay: `${i * 0.05}s`, opacity:0, transform:"translateY(10px)"
                  }} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderLight;e.currentTarget.style.transform="translateY(0)";}}>
                    
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                       <div style={{display:"flex", alignItems:"center", gap:12}}>
                         <div className="acc-icon" style={{width:44, height:44, borderRadius:14, background:C.input, display:"flex", alignItems:"center", justifyContent:"center"}}>
                           <Ico n={acc.type==="Credit Card"?"list":acc.type==="Wallet"?"archive":"bank"} sz={20} c={C.primary}/>
                         </div>
                         <div>
                           <div className="acc-name" style={{color:C.text, fontSize:15, fontWeight:800, letterSpacing:"-0.01em"}}>{acc.name}</div>
                           <div className="acc-type" style={{color:C.sub, fontSize:12, fontWeight:600, marginTop:2}}>{acc.type}</div>
                         </div>
                       </div>
                       <div className="acc-actions" style={{display:"flex", gap:10, position:"relative", zIndex:9999}}>
                         {/* Edit button */}
                         <div onClick={(e)=>{e.stopPropagation(); onEditAcc(acc);}} style={{background:C.input, color:C.sub, cursor:"pointer", width:36, height:36, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", pointerEvents:"auto"}} onMouseEnter={e=>{e.currentTarget.style.background=C.primary; e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.background=C.input; e.currentTarget.style.color=C.sub;}}>
                           <Ico n="edit" sz={16}/>
                         </div>
                         {/* Delete button */}
                         <div 
                           onClick={(e)=>{
                             e.stopPropagation();
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

                    <div className="acc-footer" style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginTop:4, borderTop:`1px dashed ${C.borderLight}`, paddingTop:16}}>
                       <div className="acc-entries" style={{color:C.sub, fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:6}}><Ico n="swap" sz={14}/> {txnsCount} entries</div>
                       <div style={{textAlign:"right"}}>
                         <div className="acc-bal-label" style={{color:C.sub, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4}}>Balance</div>
                         <div className="acc-bal" style={{color:bal>=0?C.text:C.expense, fontSize:22, fontWeight:800, letterSpacing:"-.02em"}}>{fmtAmt(bal)}</div>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
