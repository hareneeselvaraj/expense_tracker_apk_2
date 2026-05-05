import React, { useState } from "react";
import { Ico } from "../ui/Ico.jsx";
import Icon from "../ui/Icon.jsx";

export const BottomNav = ({ page, setPage, onAddTx, onAddAcc, onAddCat, onAddTag, theme, hideFab }) => {
  const C = theme;
  const [fabOpen, setFabOpen] = useState(false);

  // Auto close FAB menu if modal opens
  React.useEffect(() => {
    if (hideFab) setFabOpen(false);
  }, [hideFab]);

  const navItems = [
    { id: "dashboard", icon: "home", label: "Home" },
    { id: "transactions", icon: "list", label: "Txns" },
    { id: "organize", icon: "grid", label: "Manage" },
    { id: "vault", icon: "bank", label: "Vault" }
  ];

  const fabActions = [
    { label: "Transaction", icon: "Banknote", action: onAddTx },
    { label: "Category", icon: "FolderOpen", action: onAddCat },
    { label: "Tag", icon: "Tag", action: onAddTag },
    { label: "Account", icon: "Landmark", action: onAddAcc }
  ];

  const handleFabAction = (action) => {
    setFabOpen(false);
    setTimeout(() => action?.(), 150);
  };

  return (
    <>
      {/* Backdrop Overlay */}
      {fabOpen && (
        <div
          onClick={() => setFabOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            animation: "fabFadeIn 0.3s cubic-bezier(0.2, 0, 0, 1)"
          }}
        />
      )}

      {/* FAB Action Bubbles */}
      {fabOpen && (
        <div style={{
          position: "fixed",
          bottom: 90,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          pointerEvents: "none"
        }}>
          {fabActions.map((item, i) => {
            // Fan out in an arc: positions from left to right
            const totalItems = fabActions.length;
            const spreadAngle = 140; // degrees of arc
            const startAngle = (180 + (180 - spreadAngle) / 2); // start from left side
            const angleStep = spreadAngle / (totalItems - 1);
            const angleDeg = startAngle + (i * angleStep);
            const angleRad = (angleDeg * Math.PI) / 180;
            const radius = 95; // increased radius slightly for cinematic feel
            const x = Math.cos(angleRad) * radius;
            const y = Math.sin(angleRad) * radius;

            return (
              <div
                key={item.label}
                onClick={() => handleFabAction(item.action)}
                style={{
                  position: "absolute",
                  bottom: -y,
                  left: `calc(50% + ${x}px)`,
                  transform: "translate(-50%, 0)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  pointerEvents: "auto",
                  cursor: "pointer",
                  animation: `fabBubbleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                  animationDelay: `${i * 0.06}s`,
                  opacity: 0,
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.primary}, ${C.primary}dd)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                  boxShadow: `0 8px 24px ${C.primary}77`,
                  transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  onMouseDown={e => e.currentTarget.style.transform = "scale(0.9)"}
                  onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  {item.icon ? <Icon name={item.icon} size={22} color="#fff" /> : item.emoji}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: "#fff",
                  textShadow: "0 2px 6px rgba(0,0,0,0.8)",
                  letterSpacing: ".02em", whiteSpace: "nowrap"
                }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Nav Bar */}
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
        background: C.isGlass ? "rgba(10, 10, 30, 0.65)" : C.navBg,
        backdropFilter: C.isGlass ? "blur(30px) saturate(180%)" : "blur(24px) saturate(180%)",
        WebkitBackdropFilter: C.isGlass ? "blur(30px) saturate(180%)" : "blur(24px) saturate(180%)",
        borderRadius: 32,
        border: `1px solid ${C.isGlass ? "rgba(140,120,255,0.14)" : C.borderLight}`,
        boxShadow: C.isGlass 
          ? "0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(160,140,255,0.08)" 
          : "0 20px 40px rgba(0,0,0,0.25)",
      }}>
        {/* Left Items */}
        <div style={{ display: "flex", flex: 1, justifyContent: "space-around", gap: 4 }}>
          {navItems.slice(0, 2).map(n => (
            <NavButton key={n.id} item={n} active={page === n.id} onClick={() => setPage(n.id)} theme={C} />
          ))}
        </div>

        {/* Center FAB */}
        <div style={{ width: 58, height: 58, marginTop: -44, pointerEvents: hideFab ? "none" : "auto", opacity: hideFab ? 0 : 1, transition: "opacity 0.2s" }}>
          <button
            onClick={() => setFabOpen(prev => !prev)}
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: fabOpen
              ? C.expense
              : `linear-gradient(135deg, ${C.primary}, ${C.primary}dd)`,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: fabOpen
              ? `0 10px 24px ${C.expense}66`
              : `0 10px 24px ${C.primary}66`,
            cursor: "pointer",
            transform: fabOpen ? "rotate(135deg) scale(0.95)" : "rotate(0deg) scale(1)",
            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, box-shadow 0.3s ease"
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

      {/* Animations */}
      <style>{`
        @keyframes fabFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fabBubbleIn {
          0% { opacity: 0; transform: translate(-50%, 30px) scale(0); }
          50% { opacity: 1; transform: translate(-50%, -15px) scale(1.15); }
          75% { transform: translate(-50%, 5px) scale(0.95); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>
    </>
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
