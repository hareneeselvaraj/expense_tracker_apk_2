import React, { useState } from "react";
import { Ico } from "../components/ui/Ico.jsx";
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
        {categories.slice(0, 8).map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
      </select>
      <button onClick={submit} style={{ width: 36, height: 36, borderRadius: 12, background: C.primary, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }} onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}><Ico n="plus" sz={18} /></button>
    </div>
  );
};

export default function Dashboard({ user, transactions, categories, tags, accounts, stats, netWorth, getDayFlow, viewDate, setViewDate, onEditTx, onAddTx, onSave, onSmartSync, isSyncing, theme }) {
  const C = theme;
  const dateRef = React.useRef(null);

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
            disabled={isSyncing}
            style={{
              background: isSyncing ? C.muted : C.primaryDim,
              border: `1px solid ${isSyncing ? C.border : C.primary + "33"}`,
              borderRadius: 14, padding: "8px 12px",
              color: isSyncing ? C.sub : C.primary,
              display: "flex", alignItems: "center", gap: 6,
              cursor: isSyncing ? "wait" : "pointer",
              fontWeight: 800, fontSize: 13, transition: "all .2s"
            }}
          >
            <Ico n="sync" sz={16} />
            {isSyncing ? "Syncing..." : "Sync"}
          </button>
          {user?.picture && <img src={user.picture} style={{ width: 44, height: 44, borderRadius: 14, border: `2px solid ${C.borderLight}`, boxShadow: C.shadow }} alt="Profile" />}
        </div>
      </div>

      {/* Net Worth Hero Card */}
      <div className="net-hero" style={{
        background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 18, padding: 12,
        position: "relative", overflow: "hidden", boxShadow: C.shadow
      }}>
        <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Current Net Worth</div>
        <div className="net-amount" style={{ color: C.text, fontSize: 26, fontWeight: 800, margin: "2px 0", letterSpacing: "-0.03em" }}>{fmtAmt(netWorth)}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, borderTop: `1px dashed ${C.border}`, paddingTop: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>30D FLOW</div>
            <Sparkline data={getDayFlow(30)} color={C.primary} height={36} />
          </div>
          <div style={{ width: 1, height: 40, background: C.borderLight }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.income, fontSize: 16, fontWeight: 800 }}>+{fmtAmt(transactions.filter(t => t.creditDebit === "Credit" && t.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, t) => s + t.amount, 0))}</div>
            <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, marginTop: 4 }}>THIS MONTH</div>
          </div>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="vitals-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { l: "Inflow", a: stats.income, co: C.income, ic: "trendUp" },
          { l: "Outflow", a: stats.expense, co: C.expense, ic: "trendDown" },
          { l: "Growth", a: stats.invest, co: C.invest, ic: "stars" }
        ].map((s, i) => (
          <div key={i} className="vital-card" style={{
            background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 14, padding: 10,
            display: "flex", flexDirection: "column", gap: 6, transition: "transform .2s", boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
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

      {/* Top Expenses (Pastel Grid) */}
      {Object.keys(stats.catMap).length > 0 && (
        <div className="section-card" style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 18, padding: 12, boxShadow: C.shadow }}>

          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <h2 style={{ color: C.text, fontSize: 14, fontWeight: 800, margin: 0, letterSpacing: "-.02em" }}>Top Expenses</h2>
            <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginTop: 2 }}>{viewDate.toLocaleString("en", { month: "long", year: "numeric" })}</div>
          </div>

          <div className="cat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {Object.entries(stats.catMap).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, amt], idx) => {
              const cat = categories.find(c => c.name === name);
              const max = Math.max(...Object.values(stats.catMap));
              const pct = Math.round((amt / max) * 100);
              const bgStr = C.pastel?.[idx % C.pastel.length] || C.muted;

              return (
                <div key={name} className="cat-tile" style={{
                  background: bgStr, borderRadius: 16, padding: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                    {cat?.emoji || "📦"}
                  </div>
                  <div style={{ color: C.text, fontSize: 11, fontWeight: 700 }}>{name}</div>
                  <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "4px 8px", fontSize: 10, fontWeight: 800, color: C.text, display: "inline-flex", alignItems: "center", gap: 4, width: "100%", justifyContent: "center" }}>
                    {fmtAmt(amt)}
                    <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.6 }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="budget-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.input, borderRadius: 16, padding: "10px 12px", marginBottom: 16 }}>
            <div>
              <div style={{ color: C.sub, fontSize: 9, fontWeight: 600 }}>Total Expense</div>
              <div className="budget-amount" style={{ color: C.text, fontSize: 15, fontWeight: 800 }}>{fmtAmt(stats.expense)}</div>
            </div>
            <div style={{ width: 1, height: 24, background: C.borderLight }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ color: C.sub, fontSize: 9, fontWeight: 600 }}>Remaining Budget</div>
              <div style={{ color: C.income, fontSize: 15, fontWeight: 800 }}>{stats.expense < 50000 ? fmtAmt(50000 - stats.expense) : "Overridden"}</div>
            </div>
          </div>

          <button style={{ width: "100%", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: "#fff", border: "none", borderRadius: 16, padding: 12, fontSize: 13, fontWeight: 800, letterSpacing: ".05em", cursor: "pointer", transition: "transform .2s" }} onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>
            VIEW ALL
          </button>
        </div>
      )}

      {/* Recent Activity */}
      <div className="section-card" style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 18, padding: 12, boxShadow: C.shadow }}>
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
    </div>
  );
}
