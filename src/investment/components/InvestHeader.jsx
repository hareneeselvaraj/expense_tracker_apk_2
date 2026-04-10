import React from "react";
import { Ico } from "../../components/ui/Ico.jsx";

export const InvestHeader = ({ theme, onOpenSettings }) => {
  const C = theme;
  return (
    <div style={{
      padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: `1px solid ${C.borderLight}`, background: C.surface,
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>💎</span>
        <span style={{
          fontSize: 18, fontWeight: 800, letterSpacing: "-.02em",
          background: `linear-gradient(135deg, ${C.primary}, ${C.secondary || C.primary})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Investments</span>
      </div>
      {onOpenSettings && (
        <button 
          onClick={onOpenSettings}
          style={{
            background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 2, color: C.sub, padding: "4px 8px"
          }}
        >
          <Ico n="settings" sz={20} c={C.sub} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "-0.01em" }}>Settings</span>
        </button>
      )}
    </div>
  );
};
