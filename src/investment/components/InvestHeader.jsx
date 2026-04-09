import React from "react";

export const InvestHeader = ({ theme }) => {
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
    </div>
  );
};
