import React, { useState } from "react";
import { Ico } from "../components/ui/Ico.jsx";
import Icon from "../components/ui/Icon.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { fmtAmt } from "../utils/format.js";

const FREQ_LABELS = { daily: "Daily", weekly: "Weekly", biweekly: "Biweekly", monthly: "Monthly", yearly: "Yearly" };

const STATUS_BADGE = (C, status) => {
  const m = {
    active: { bg: C.income + "22", color: C.income, text: "Active" },
    paused: { bg: C.sub + "22", color: C.sub, text: "Paused" },
    ended: { bg: C.expense + "22", color: C.expense, text: "Ended" },
  };
  const s = m[status] || m.active;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 9, fontWeight: 900, padding: "3px 8px", borderRadius: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
      {s.text}
    </span>
  );
};

function getStatus(tmpl) {
  if (tmpl.paused) return "paused";
  if (tmpl.endDate && tmpl.nextDue > tmpl.endDate) return "ended";
  return "active";
}

export default function RecurringPanel({ recurring, categories, accounts, onAdd, onEdit, onTogglePause, onDelete, theme }) {
  const C = theme;
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  if (!recurring || recurring.length === 0) {
    return (
      <div style={{
        background: C.surface, border: `1px solid ${C.borderLight}`,
        borderRadius: 12, padding: "32px 16px", textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        boxShadow: C.shadow, position: "relative", overflow: "hidden"
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: C.input, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: `1px solid ${C.borderLight}`, zIndex: 1 }}>🔄</div>
        <div style={{ zIndex: 1 }}>
          <div style={{ color: C.text, fontSize: 16, fontWeight: 800, marginBottom: 4, letterSpacing: "-0.02em" }}>No Recurring Payments</div>
          <div style={{ color: C.sub, fontSize: 12, lineHeight: 1.5, maxWidth: 240, margin: "0 auto" }}>
            Set up auto-recurring payments like subscriptions, rent, or SIPs that are posted automatically.
          </div>
        </div>
        <div style={{ zIndex: 1 }}>
          <Btn theme={C} icon="plus" sm onClick={onAdd}>Add First Recurring</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <p style={{ margin: 0, color: C.sub, fontSize: 13, fontWeight: 600 }}>
          {recurring.length} recurring payment{recurring.length !== 1 ? "s" : ""}
        </p>
        <Btn theme={C} icon="plus" sm onClick={onAdd}>Add</Btn>
      </div>

      {/* Summary Card */}
      <div className="hero-card" style={{
        background: C.surface,
        border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 16,
        boxShadow: C.shadow, position: "relative", overflow: "hidden"
      }}>
        <div className="hero-label" style={{ color: C.sub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>
          Monthly Auto-Debits
        </div>
        <div className="hero-amount" style={{ color: C.text, fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" }}>
          {fmtAmt(
            recurring
              .filter(r => !r.paused && getStatus(r) === "active")
              .reduce((sum, r) => {
                const amt = r.templateTx?.amount || 0;
                if (r.frequency === "daily") return sum + amt * 30;
                if (r.frequency === "weekly") return sum + amt * 4;
                if (r.frequency === "biweekly") return sum + amt * 2;
                if (r.frequency === "monthly") return sum + amt;
                if (r.frequency === "yearly") return sum + amt / 12;
                return sum + amt;
              }, 0)
          )}
        </div>
        <div style={{ color: C.sub, fontSize: 11, marginTop: 4 }}>
          Estimated monthly total from active recurring payments
        </div>
      </div>

      {/* Recurring Cards */}
      {recurring.map((tmpl, i) => {
        const status = getStatus(tmpl);
        const cat = categories.find(c => c.id === tmpl.templateTx?.category);
        const acc = accounts.find(a => a.id === tmpl.templateTx?.accountId);
        const isConfirming = confirmDeleteId === tmpl.id;

        return (
          <div key={tmpl.id} style={{
            background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 12,
            display: "flex", flexDirection: "column", gap: 12, transition: "all .2s ease",
            position: "relative", overflow: "hidden", boxShadow: C.shadow,
            opacity: status === "paused" ? 0.65 : 1,
            animation: `fadeInUp 0.4s ease forwards`, animationDelay: `${i * 0.05}s`,
          }}>
            {/* Top row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: C.input,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${C.borderLight}`,
                }}>
                   {cat?.icon ? <Icon name={cat.icon} size={16} color={C.text} /> : <Ico n="repeat" sz={16} c={C.primary} />}
                </div>
                <div>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>{tmpl.templateTx?.description || "Untitled"}</div>
                  <div style={{ color: C.sub, fontSize: 10, fontWeight: 600, marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
                    {FREQ_LABELS[tmpl.frequency] || tmpl.frequency}
                    <span style={{ color: C.border }}>·</span>
                    {STATUS_BADGE(C, status)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {/* Pause/Resume */}
                {status !== "ended" && (
                  <div
                    onClick={() => onTogglePause(tmpl.id)}
                    style={{
                      background: C.input, cursor: "pointer", width: 28, height: 28, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s"
                    }}
                  >
                    <Ico n={tmpl.paused ? "play" : "pause"} sz={14} c={tmpl.paused ? C.income : C.sub} />
                  </div>
                )}
                {/* Edit */}
                <div
                  onClick={() => onEdit(tmpl)}
                  style={{
                    background: C.input, cursor: "pointer", width: 28, height: 28, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s"
                  }}
                >
                  <Ico n="edit" sz={14} c={C.sub} />
                </div>
                {/* Delete */}
                <div
                  onClick={() => setConfirmDeleteId(tmpl.id)}
                  style={{
                    background: C.input, color: C.expense, cursor: "pointer", width: 28, height: 28, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s"
                  }}
                >
                  <Ico n="trash" sz={14} c={C.expense} />
                </div>
              </div>
            </div>

            {/* Confirm delete */}
            {isConfirming && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: C.input, borderRadius: 14, padding: "12px",
                animation: "fadeIn 0.2s ease"
              }}>
                <span style={{ color: C.expense, fontSize: 12, fontWeight: 700 }}>Delete this recurring payment?</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { onDelete(tmpl.id); setConfirmDeleteId(null); }}
                    style={{ background: C.expense, border: "none", borderRadius: 10, padding: "6px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >Yes</button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    style={{ background: "none", border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: "6px 14px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >Cancel</button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-end",
              marginTop: 2, borderTop: `1px dashed ${C.borderLight}`, paddingTop: 14
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                  <Ico n="bank" sz={12} c={C.sub} />
                  {acc?.name || "Default"}
                </div>
                {tmpl.nextDue && status === "active" && (
                  <div style={{ color: C.sub, fontSize: 10, fontWeight: 600 }}>
                    Next: <span style={{ color: C.text, fontWeight: 700 }}>{tmpl.nextDue}</span>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: C.sub, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>Amount</div>
                <div style={{
                  color: tmpl.templateTx?.creditDebit === "Credit" ? C.income : C.expense,
                  fontSize: 18, fontWeight: 800, letterSpacing: "-.02em"
                }}>
                  {tmpl.templateTx?.creditDebit === "Credit" ? "+" : "-"}{fmtAmt(tmpl.templateTx?.amount || 0)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
