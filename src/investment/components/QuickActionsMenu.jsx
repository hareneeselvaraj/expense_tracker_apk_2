import React, { useEffect } from "react";
import { Ico } from "./ui/Ico.jsx";

export const QuickActionsMenu = ({ open, onClose, onAction, theme: C }) => {
  useEffect(() => {
    if (!open) return;
    const handleTouch = (e) => {
      // close on tap outside
      if (!e.target.closest('.quick-action-btn')) {
        setTimeout(onClose, 10);
      }
    };
    document.addEventListener("touchstart", handleTouch);
    document.addEventListener("mousedown", handleTouch);
    return () => {
      document.removeEventListener("touchstart", handleTouch);
      document.removeEventListener("mousedown", handleTouch);
    };
  }, [open, onClose]);

  if (!open) return null;

  const actions = [
    { id: "add", icon: "plus", label: "Add Holding", delay: 0 },
    { id: "sell", icon: "minus", label: "Record Sell", delay: 0.05 },
    { id: "goal", icon: "flag", label: "New Goal", delay: 0.1 },
    { id: "refresh", icon: "refresh", label: "Refresh Prices", delay: 0.15 }
  ];

  return (
    <>
      <div 
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 10000,
          backdropFilter: "blur(4px)", animation: "fadeIn 0.2s"
        }}
      />
      
      <div style={{
        position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
        zIndex: 10001, display: "flex", flexDirection: "column", gap: 16, alignItems: "center"
      }}>
        {actions.map((act) => (
          <button
            key={act.id}
            className="quick-action-btn"
            onClick={(e) => { e.stopPropagation(); onAction(act.id); }}
            style={{
              background: C.surface, border: `1px solid ${C.borderLight}`,
              padding: "12px 24px", borderRadius: 24, boxShadow: C.shadow,
              display: "flex", alignItems: "center", gap: 12,
              color: C.text, fontSize: 16, fontWeight: 700,
              cursor: "pointer",
              animation: `slideUpFade 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${act.delay}s both`
            }}
          >
             <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.primary + "1A", display: "flex", alignItems:"center", justifyContent: "center" }}>
               <Ico n={act.icon} sz={18} c={C.primary} />
             </div>
             {act.label}
          </button>
        ))}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
};
