import React from "react";
import { Btn } from "../../components/ui/Btn.jsx";

export const InvestSettingsPage = ({ onBackToExpense, theme }) => {
  const C = theme;
  return (
    <div className="page-enter" style={{ padding: "20px 20px 100px", display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-.02em" }}>Investment Settings</h1>

      {/* Back to Expense Tracker — top prominent button */}
      <Btn theme={C} v="soft" full icon="arrowLeft" onClick={onBackToExpense}>
        ← Back to Expense Tracker
      </Btn>

      {/* Market Data */}
      <div style={{ background: C.surface, borderRadius: 24, padding: 20, border: `1px solid ${C.borderLight}`, boxShadow: C.shadow, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ color: C.sub, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Market Data</div>
        <div style={{ color: C.sub, fontSize: 12, lineHeight: 1.5 }}>
          Gold rate, live price refresh, and stock exchange settings will be available here.
        </div>
      </div>

      {/* About */}
      <div style={{ background: C.surface, borderRadius: 24, padding: 24, textAlign: "center", border: `1px solid ${C.borderLight}`, boxShadow: C.shadow }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💎</div>
        <div style={{ color: C.text, fontSize: 18, fontWeight: 800 }}>Investment Tracker</div>
        <div style={{ color: C.sub, fontSize: 12, fontWeight: 600, marginTop: 6 }}>
          Cloud Sync & Backups shared with Expense Tracker.
        </div>
      </div>
    </div>
  );
};
