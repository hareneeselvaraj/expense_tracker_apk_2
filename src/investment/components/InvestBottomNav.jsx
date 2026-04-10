import React from "react";
import { Ico } from "../../components/ui/Ico.jsx";

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

export const InvestBottomNav = ({ page, setPage, theme, onFabClick }) => {
  const C = theme;
  const navItems = [
    { id: "dashboard", icon: "home", label: "Home" },
    { id: "holdings", icon: "archive", label: "Holdings" },
    { id: "goals", icon: "flag", label: "Goals" },
    { id: "insights", icon: "chart", label: "Insights" },
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
      paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      background: C.navBg || C.surface,
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      borderRadius: 32,
      border: `1px solid ${C.borderLight}`,
      boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
    }}>
      {/* Left Items */}
      <div style={{ display: "flex", flex: 1, justifyContent: "space-around", gap: 4 }}>
        {navItems.slice(0, 2).map(n => (
          <NavButton key={n.id} item={n} active={page === n.id} onClick={() => setPage(n.id)} theme={C} />
        ))}
      </div>

      {/* Center FAB */}
      <div style={{ width: 58, height: 58, marginTop: -44 }}>
        <button
          onClick={onFabClick}
          onTouchStart={(e) => {
             e.currentTarget.style.transform = "scale(0.9)";
             if (window.fabLongPressTimer) clearTimeout(window.fabLongPressTimer);
             window.fabLongPressTimer = setTimeout(() => {
                window.fabLongPressTimer = null;
                if (theme.onFabLongPress) theme.onFabLongPress(); // fallback
                else if (typeof page === "string") { /* Need to pass from props */ }
             }, 500);
          }}
          onTouchEnd={(e) => {
             e.currentTarget.style.transform = "scale(1)";
             if (window.fabLongPressTimer) {
                clearTimeout(window.fabLongPressTimer);
                window.fabLongPressTimer = null;
             } else {
                // Prevent click if long press fired
                e.preventDefault(); 
             }
          }}
          onMouseDown={(e) => {
             e.currentTarget.style.transform = "scale(0.9)";
             if (window.fabLongPressTimer) clearTimeout(window.fabLongPressTimer);
             window.fabLongPressTimer = setTimeout(() => {
                window.fabLongPressTimer = null;
             }, 500);
          }}
          onMouseUp={(e) => {
             e.currentTarget.style.transform = "scale(1)";
             if (window.fabLongPressTimer) {
                clearTimeout(window.fabLongPressTimer);
                window.fabLongPressTimer = null;
             }
          }}
          // Passing onFabLongPress properly
          {...(theme.onFabLongPress ? {} : {})}
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.primary}, ${C.primary}dd)`,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 10px 20px ${C.primary}55`,
            cursor: "pointer",
            transition: "transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            touchAction: "manipulation",
            userSelect: "none",
            WebkitUserSelect: "none"
          }}
        >
          <Ico n="plus" sz={28} c="#fff" />
        </button>
      </div>

      {/* Right Items */}
      <div style={{ display: "flex", flex: 1, justifyContent: "space-around", gap: 4 }}>
        {navItems.slice(2).map(n => (
          <NavButton key={n.id} item={n} active={page === n.id} onClick={() => setPage(n.id)} theme={C} />
        ))}
      </div>
    </div>
  );
};
