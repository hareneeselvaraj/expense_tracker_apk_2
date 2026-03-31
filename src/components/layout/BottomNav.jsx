import React from "react";
import { Ico } from "../ui/Ico.jsx";

export const BottomNav = ({ page, setPage, onAddTx, theme }) => {
  const C = theme;
  
  const navItems = [
    { id: "dashboard", icon: "home", label: "Home" },
    { id: "transactions", icon: "list", label: "Txns" },
    { id: "organize", icon: "grid", label: "Manage" },
    { id: "vault", icon: "bank", label: "Vault" }
  ];

  return (
    <div style={{
      position: "fixed", 
      bottom: 24, 
      left: "50%", 
      transform: "translateX(-50%)", 
      width: "calc(100% - 32px)", 
      maxWidth: 550,
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 12px",
      background: theme.mode === "dark" ? "rgba(15, 15, 20, 0.85)" : "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      borderRadius: 32,
      border: `1px solid ${C.borderLight}`,
      boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
    }}>
      {/* Left 3 Items */}
      <div style={{ display: "flex", flex: 1, justifyContent: "space-around", gap: 4 }}>
        {navItems.slice(0, 2).map(n => (
          <NavButton key={n.id} item={n} active={page === n.id} onClick={() => setPage(n.id)} theme={C} />
        ))}
      </div>

      {/* Floating Center Action */}
      <button 
        onClick={onAddTx}
        style={{
          width: 58, 
          height: 58, 
          borderRadius: "50%", 
          background: `linear-gradient(135deg, ${C.primary}, ${C.primary}dd)`,
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: -44,
          boxShadow: `0 10px 20px ${C.primary}55`,
          cursor: "pointer",
          transform: "scale(1)",
          transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        }}
        onMouseDown={e => e.currentTarget.style.transform = "scale(0.9)"}
        onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
      >
        <Ico n="plus" sz={28} c="#000" />
      </button>

      {/* Right 3 Items */}
      <div style={{ display: "flex", flex: 1, justifyContent: "space-around", gap: 4 }}>
        {navItems.slice(2).map(n => (
          <NavButton key={n.id} item={n} active={page === n.id} onClick={() => setPage(n.id)} theme={C} />
        ))}
      </div>
    </div>
  );
};

const NavButton = ({ item, active, onClick, theme: C }) => (
  <button 
    onClick={onClick} 
    style={{
      background: "none", 
      border: "none", 
      cursor: "pointer", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      gap: 2, 
      color: active ? C.primary : C.sub,
      transition: "all 0.2s",
      minWidth: 48,
      padding: "4px 0"
    }}
  >
    <Ico n={item.icon} sz={20} c={active ? C.primary : C.sub} />
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "-0.01em" }}>{item.label}</span>
  </button>
);
