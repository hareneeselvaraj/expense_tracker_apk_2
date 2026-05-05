import React, { useState } from "react";
import { Modal } from "../components/ui/Modal.jsx";
import { Ico } from "../components/ui/Ico.jsx";
import Icon from "../components/ui/Icon.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { TxRow } from "../components/cards/TxRow.jsx";
import { fmtAmt, fmtDate, todayISO } from "../utils/format.js";
import { uid } from "../utils/id.js";
import { getRecentTx } from "../utils/analytics.js";
import { BLANK_TX } from "../constants/defaults.js";

const Sparkline = ({ data, color, height = 30 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map(Math.abs), 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${50 - (v / max) * 40}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height, opacity: 0.6 }}>
      <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
};

const QuickAdd = ({ categories, onSave, theme }) => {
  const [amt, setAmt] = useState("");
  const [cat, setCat] = useState(categories[0]?.id || "");
  const C = theme;

  const submit = () => {
    if (!amt || isNaN(amt)) return;
    const selCat = categories.find(c => c.id === cat);
    const inferredType = selCat?.type || "Expense";
    const inferredCd = inferredType === "Income" ? "Credit" : "Debit";
    onSave({ ...BLANK_TX, id: uid(), amount: parseFloat(amt), category: cat, date: todayISO(), txType: inferredType, creditDebit: inferredCd });
    setAmt("");
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: 8, display: "flex", alignItems: "center", gap: 8, boxShadow: C.shadow }}>
      <div style={{ flex: 1, position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.sub, fontSize: 12, fontWeight: 700 }}>₹</span>
        <input type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder="0.00" style={{ width: "100%", background: C.input, border: "none", borderRadius: 12, padding: "8px 8px 8px 22px", color: C.text, fontSize: 14, fontWeight: 700, fontFamily: "inherit" }} />
      </div>
      <select value={cat} onChange={e => setCat(e.target.value)} style={{ background: C.input, border: "none", borderRadius: 12, padding: "8px 10px", color: C.text, fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}>
        {categories.slice(0, 8).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button onClick={submit} style={{ width: 36, height: 36, borderRadius: 12, background: C.primary, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }} onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}><Ico n="plus" sz={18} /></button>
    </div>
  );
};

export default function Dashboard({ user, transactions, categories, tags, accounts, budgets, stats, netWorth, getDayFlow, viewDate, setViewDate, onEditTx, onAddTx, onSave, onSmartSync, isSyncing, isOffline, theme, goToTransactions, onSetBudget }) {
  const C = theme;
  const dateRef = React.useRef(null);
  const s = stats || { income: 0, expense: 0, invest: 0, expCatMap: {}, incCatMap: {}, invCatMap: {} };
  const totalBudget = (budgets || []).filter(b => b.categoryId).reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0);
  const remainingBudget = totalBudget - s.expense;
  const [topTab, setTopTab] = useState("expense");
  const [expandedCat, setExpandedCat] = useState(null);

  const [flipped, setFlipped] = React.useState(false);

  // Total value of assets still "parked" in investments
  // = all investment debits − all investment credits (redemptions)
  const investedValue = React.useMemo(() => {
    return (transactions || [])
      .filter(t => !t.deleted && t.txType === "Investment")
      .reduce((sum, t) => sum + (t.creditDebit === "Debit" ? t.amount : -t.amount), 0);
  }, [transactions]);

  const overallNetWorth = netWorth + investedValue;

  const tabConfig = [
    { key: "expense", label: "Expense", map: s.expCatMap, total: s.expense, color: C.expense, icon: "ArrowDownCircle" },
    { key: "income", label: "Income", map: s.incCatMap, total: s.income, color: C.income, icon: "ArrowUpCircle" },
    { key: "invest", label: "Investment", map: s.invCatMap, total: s.invest, color: C.invest || C.primary, icon: "TrendingUp" },
  ];
  const activeTab = tabConfig.find(t => t.key === topTab) || tabConfig[0];
  const hasAnyData = tabConfig.some(t => Object.keys(t.map).length > 0);

  // Get the month's transactions for the expanded category
  const getMonthTxForCat = (catName) => {
    const month = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;
    const cat = categories.find(c => c.name === catName);
    if (!cat) return [];
    return (transactions || [])
      .filter(t => !t.deleted && t.category === cat.id && t.date?.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date));
  };
  
  const expandedTxs = expandedCat ? getMonthTxForCat(expandedCat) : [];

  return (
    <div className="page-enter" style={{ padding: "12px 12px 100px 12px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Greeting + Month Picker */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-.03em" }}>Hello, {user?.name?.split(" ")[0] || "User"}!</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={{ background: C.input, borderWidth: 1, borderStyle: "solid", borderColor: C.border, borderRadius: "50%", padding: 4, color: C.sub, cursor: "pointer" }}><Ico n="chevronLeft" sz={14} /></button>
            <span
              onClick={() => {
                try { dateRef.current?.showPicker(); } catch (e) { }
              }}
              style={{ fontSize: 13, color: C.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", position: "relative", cursor: "pointer" }}
            >
              {viewDate.toLocaleString("en", { month: "long", year: "numeric" })}
              <input
                ref={dateRef}
                type="date"
                value={viewDate.toISOString().split("T")[0]}
                onChange={(e) => {
                  if (e.target.value) setViewDate(new Date(e.target.value));
                }}
                style={{
                  position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                  opacity: 0, cursor: "pointer"
                }}
              />
            </span>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={{ background: C.input, borderWidth: 1, borderStyle: "solid", borderColor: C.border, borderRadius: "50%", padding: 4, color: C.sub, cursor: "pointer" }}><Ico n="chevronRight" sz={14} /></button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onSmartSync}
            disabled={isSyncing || isOffline}
            style={{
              background: (isSyncing || isOffline) ? C.muted : C.primaryDim,
              border: `1px solid ${(isSyncing || isOffline) ? C.border : C.primary + "33"}`,
              borderRadius: 14, padding: "8px 12px",
              color: (isSyncing || isOffline) ? C.sub : C.primary,
              display: "flex", alignItems: "center", gap: 6,
              cursor: isSyncing ? "wait" : isOffline ? "not-allowed" : "pointer",
              fontWeight: 800, fontSize: 13, transition: "all .2s"
            }}
          >
            <Ico n={isOffline ? "cloudOff" : "sync"} sz={16} />
            {isSyncing ? "Syncing..." : isOffline ? "Offline" : "Sync"}
          </button>
          {user?.picture && <img src={user.picture} style={{ width: 44, height: 44, borderRadius: 14, border: `2px solid ${C.borderLight}`, boxShadow: C.shadow }} alt="Profile" />}
        </div>
      </div>

      {/* Net Worth Hero Card — flippable */}
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
            className="net-hero"
            style={{
              position: "absolute", inset: 0,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              background: C.isGlass ? "rgba(255,255,255,0.08)" : C.surface,
              border: `1px solid ${C.isGlass ? "rgba(255,255,255,0.15)" : C.borderLight}`,
              borderRadius: 18, padding: 12,
              boxShadow: C.isGlass ? "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)" : C.shadow,
              overflow: "hidden",
              backdropFilter: C.isGlass ? "blur(24px) saturate(160%)" : undefined,
              WebkitBackdropFilter: C.isGlass ? "blur(24px) saturate(160%)" : undefined,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>
                Current Net Worth
              </div>
              <div style={{ color: C.sub, fontSize: 9, fontWeight: 700, opacity: 0.6 }}>TAP TO FLIP ↻</div>
            </div>
            <div className="net-amount" style={{ color: netWorth < 0 ? C.expense : (netWorth > 0 ? C.income : C.text), fontSize: 26, fontWeight: 800, margin: "2px 0", letterSpacing: "-0.03em" }}>
              {fmtAmt(netWorth)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, borderTop: `1px dashed ${C.border}`, paddingTop: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>30D FLOW</div>
                <Sparkline data={getDayFlow(30)} color={C.primary} height={36} />
              </div>
              <div style={{ width: 1, height: 40, background: C.borderLight }} />
              <div style={{ textAlign: "right" }}>
                <div style={{ color: C.income, fontSize: 16, fontWeight: 800 }}>
                  +{fmtAmt(s.income)}
                </div>
                <div style={{ color: C.sub, fontSize: 10, fontWeight: 700 }}>THIS MONTH</div>
              </div>
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
              borderRadius: 18, padding: 12, boxShadow: C.shadow, overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: C.primary, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>
                Total Wealth
              </div>
              <div style={{ color: C.sub, fontSize: 9, fontWeight: 700, opacity: 0.6 }}>TAP TO FLIP ↻</div>
            </div>
            <div style={{ color: overallNetWorth < 0 ? C.expense : (overallNetWorth > 0 ? C.income : C.text), fontSize: 26, fontWeight: 800, margin: "2px 0", letterSpacing: "-0.03em" }}>
              {fmtAmt(overallNetWorth)}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, borderTop: `1px dashed ${C.border}`, paddingTop: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.sub, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Liquid</div>
                <div style={{ color: netWorth < 0 ? C.expense : (netWorth > 0 ? C.income : C.text), fontSize: 15, fontWeight: 800, marginTop: 2 }}>{fmtAmt(netWorth)}</div>
              </div>
              <div style={{ width: 1, background: C.borderLight }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: C.sub, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Invested</div>
                <div style={{ color: C.invest || C.primary, fontSize: 15, fontWeight: 800, marginTop: 2 }}>{fmtAmt(investedValue)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="vitals-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { l: "Inflow", a: s.income, co: C.income, ic: "trendUp" },
          { l: "Outflow", a: s.expense, co: C.expense, ic: "trendDown" },
          { l: "Growth", a: s.invest, co: C.invest, ic: "stars" }
        ].map((s, i) => (
          <div key={i} className="vital-card" style={{
            background: C.isGlass ? "rgba(255,255,255,0.08)" : C.surface,
            border: `1px solid ${C.isGlass ? "rgba(255,255,255,0.14)" : C.borderLight}`,
            borderRadius: 14, padding: 10,
            display: "flex", flexDirection: "column", gap: 6, transition: "all .3s",
            boxShadow: C.isGlass ? `0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.10)` : "0 4px 12px rgba(0,0,0,0.02)",
            backdropFilter: C.isGlass ? "blur(20px) saturate(160%)" : undefined,
            WebkitBackdropFilter: C.isGlass ? "blur(20px) saturate(160%)" : undefined,
          }}>
            <div className="vital-icon" style={{ width: 26, height: 26, borderRadius: 8, background: s.co + "15", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${s.co}10` }}>
              <Ico n={s.ic} sz={14} c={s.co} />
            </div>
            <div>
              <div style={{ color: C.sub, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{s.l}</div>
              <div className="vital-amount" style={{ color: C.text, fontSize: 11, fontWeight: 800, marginTop: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmtAmt(s.a)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Categories Breakdown — Dynamic & Clickable */}
      {hasAnyData && (
        <div className="section-card" style={{ background: C.isGlass ? "rgba(255,255,255,0.06)" : C.surface, border: `1px solid ${C.isGlass ? "rgba(255,255,255,0.14)" : C.borderLight}`, borderRadius: 18, padding: 12, boxShadow: C.isGlass ? "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.10)" : C.shadow, backdropFilter: C.isGlass ? "blur(24px) saturate(160%)" : undefined, WebkitBackdropFilter: C.isGlass ? "blur(24px) saturate(160%)" : undefined }}>
          
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <h2 style={{ color: C.text, fontSize: 14, fontWeight: 800, margin: 0, letterSpacing: "-.02em" }}>Categories</h2>
            <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginTop: 2 }}>{viewDate.toLocaleString("en", { month: "long", year: "numeric" })}</div>
          </div>

          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: 2, 
            marginBottom: 14, 
            background: C.input, 
            borderRadius: 30, 
            padding: 4 
          }}>
            {tabConfig.map(t => {
              if (Object.keys(t.map).length === 0) return null;
              const active = topTab === t.key;
              const count = Object.keys(t.map).length;
              return (
                <button
                  key={t.key}
                  onClick={() => { setTopTab(t.key); setExpandedCat(null); }}
                  style={{
                    flex: 1,
                    background: active ? t.color : "transparent",
                    color: active ? "#fff" : C.sub,
                    border: "none",
                    borderRadius: 25, padding: "8px 0", fontSize: 10, fontWeight: 800,
                    cursor: "pointer", transition: "all .2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    fontFamily: "inherit"
                  }}
                >
                  <Icon name={t.icon} size={11} color={active ? "#fff" : C.sub} />
                  {t.label}
                  <span style={{ fontSize: 9, opacity: 0.8 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {Object.keys(activeTab.map).length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {Object.entries(activeTab.map).sort((a, b) => b[1] - a[1]).map(([name, amt]) => {
                const cat = categories.find(c => c.name === name);
                const pct = activeTab.total > 0 ? Math.round((amt / activeTab.total) * 100) : 0;

                return (
                  <div key={name} style={{
                    borderRadius: 20, overflow: "hidden",
                    border: C.isGlass ? `1px solid rgba(255,255,255,0.14)` : `2px solid ${cat?.color || C.primary}00`,
                    background: C.isGlass ? `rgba(255,255,255,0.06)` : `${cat?.color || C.primary}24`,
                    transition: "all .3s",
                    backdropFilter: C.isGlass ? "blur(20px) saturate(160%)" : undefined,
                    WebkitBackdropFilter: C.isGlass ? "blur(20px) saturate(160%)" : undefined,
                    boxShadow: C.isGlass ? `0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.10)` : undefined,
                  }}>
                    <button
                      onClick={() => setExpandedCat(name)}
                      style={{
                        width: "100%", background: "transparent",
                        border: "none", padding: "16px 12px 14px", cursor: "pointer",
                        display: "flex", flexDirection: "column", gap: 10, fontFamily: "inherit", alignItems: "center"
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: C.isGlass ? `rgba(255,255,255,0.08)` : C.surface,
                        border: C.isGlass ? `1px solid rgba(255,255,255,0.12)` : undefined,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: C.isGlass ? `inset 0 1px 0 rgba(255,255,255,0.08)` : `0 4px 12px ${cat?.color || C.primary}22`
                      }}>
                        <Icon name={cat?.icon || "Package"} size={20} color={cat?.color || C.primary} />
                      </div>

                      <div style={{ color: C.text, fontSize: 13, fontWeight: 800, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", padding: "0 4px" }}>
                        {name}
                      </div>

                      <div style={{
                        display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6,
                        background: C.isGlass ? "rgba(255,255,255,0.06)" : C.surface,
                        padding: "5px 12px", borderRadius: 20, marginTop: 2, width: "100%",
                        border: C.isGlass ? "1px solid rgba(255,255,255,0.08)" : undefined,
                        boxShadow: C.isGlass ? "inset 0 1px 0 rgba(255,255,255,0.06)" : `0 2px 8px ${cat?.color || C.primary}11`
                      }}>
                        <span style={{ color: C.text, fontSize: 13, fontWeight: 900 }}>{fmtAmt(amt)}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.sub, opacity: 0.8 }}>{pct}%</span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
             <div style={{ textAlign: "center", padding: "20px 0", color: C.sub, fontSize: 12, fontWeight: 600 }}>No {activeTab.label.toLowerCase()} entries this month.</div>
          )}

          {activeTab.key === "expense" && (
            <div className="budget-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.input, borderRadius: 16, padding: "10px 12px", marginBottom: 12 }}>
              <div>
                <div style={{ color: C.sub, fontSize: 9, fontWeight: 600 }}>Total Expense</div>
                <div className="budget-amount" style={{ color: C.text, fontSize: 15, fontWeight: 800 }}>{fmtAmt(s.expense)}</div>
              </div>
              <div style={{ width: 1, height: 24, background: C.borderLight }} />
              <div style={{ textAlign: "right" }}>
                <div style={{ color: C.sub, fontSize: 9, fontWeight: 600 }}>Remaining Budget</div>
                {totalBudget === 0 
                  ? <span onClick={onSetBudget} style={{ color: C.primary, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Set Budget →</span>
                  : <span style={{ color: remainingBudget >= 0 ? C.income : C.expense, fontSize: 15, fontWeight: 800 }}>
                      {remainingBudget >= 0 ? fmtAmt(remainingBudget) : "Over Budget"}
                    </span>
                }
              </div>
            </div>
          )}


        </div>
      )}

      {/* Recent Activity */}
      <div className="section-card" style={{ background: C.isGlass ? "rgba(255,255,255,0.06)" : C.surface, border: `1px solid ${C.isGlass ? "rgba(255,255,255,0.14)" : C.borderLight}`, borderRadius: 18, padding: 12, boxShadow: C.isGlass ? "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.10)" : C.shadow, backdropFilter: C.isGlass ? "blur(24px) saturate(160%)" : undefined, WebkitBackdropFilter: C.isGlass ? "blur(24px) saturate(160%)" : undefined }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ color: C.text, fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>Recent Activity</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {getRecentTx(transactions, 5).map((t, idx, arr) => (
            <React.Fragment key={t.id}>
              <div style={{ padding: "8px 0" }}>
                <TxRow t={t} categories={categories} tags={tags} accounts={accounts} onClick={() => onEditTx(t)} theme={C} />
              </div>
              {idx < arr.length - 1 && <div style={{ height: 1, background: C.borderLight, margin: "4px 0" }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <Modal open={!!expandedCat} onClose={() => setExpandedCat(null)} title={expandedCat || ""} theme={C}>
        {expandedTxs.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {expandedTxs.map((t) => (
              <div
                key={t.id}
                onClick={() => { setExpandedCat(null); onEditTx(t); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px", cursor: "pointer", borderRadius: 12,
                  background: C.surface, border: `1px solid ${C.borderLight}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.description || "—"}
                  </div>
                  <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginTop: 4 }}>
                    {fmtDate(t.date)}
                    {t.accountId && accounts.find(a => a.id === t.accountId) && ` · ${accounts.find(a => a.id === t.accountId)?.name}`}
                  </div>
                </div>
                <div style={{
                  color: t.creditDebit === "Credit" ? C.income : C.expense,
                  fontSize: 14, fontWeight: 800, flexShrink: 0, marginLeft: 10
                }}>
                  {t.creditDebit === "Credit" ? "+" : "−"}{fmtAmt(t.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "24px", textAlign: "center", color: C.sub, fontSize: 13 }}>
            No transactions found.
          </div>
        )}
      </Modal>
    </div>
  );
}
