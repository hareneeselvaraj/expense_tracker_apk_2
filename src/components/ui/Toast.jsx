import React, { useEffect, useState } from "react";
import { Ico } from "./Ico.jsx";

export const Toast = ({ toast, theme }) => {
  const [visible, setVisible] = useState(false);
  const C = theme;

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast?.key || toast?.msg]);

  if (!toast) return null;

  const TOAST_CONFIG = {
    success: { accent: C.income,  icon: "check", bg: "rgba(8, 32, 24, 0.92)" },
    error:   { accent: C.expense, icon: "info",  bg: "rgba(42, 10, 16, 0.92)" },
    warning: { accent: "#f59e0b", icon: "alert", bg: "rgba(42, 32, 8, 0.92)" },
    info:    { accent: C.primary, icon: "info",  bg: "rgba(8, 20, 42, 0.92)" },
  };

  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.success;

  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%", transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
      opacity: visible ? 1 : 0, zIndex: 1000, transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      pointerEvents: toast.action ? "auto" : "none", width: "100%", maxWidth: 360, padding: "0 20px"
    }}>
      <div style={{
        background: config.bg, backdropFilter: "blur(20px) saturate(180%)",
        border: `1px solid ${config.accent}`, borderRadius: 16, padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 12, boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 20px ${config.accent}22`,
        position: "relative", overflow: "hidden"
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%", background: config.accent, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 10px ${config.accent}44`
        }}>
          <Ico n={config.icon} sz={14} c="#fff" />
        </div>
        
        <div style={{flex: 1, minWidth: 0}}>
          <span style={{color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em"}}>{toast.msg}</span>
        </div>

        {toast.action && (
          <button
            onClick={(e) => { e.stopPropagation(); toast.action.onClick(); setVisible(false); }}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: `1px solid ${config.accent}60`,
              borderRadius: 8,
              padding: "4px 12px",
              color: config.accent,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
          >
            {toast.action.label}
          </button>
        )}

        {/* Progress timer bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, height: 3, background: config.accent,
          width: visible ? "100%" : "0%", transition: "width 3s linear"
        }} />
      </div>
    </div>
  );
};
