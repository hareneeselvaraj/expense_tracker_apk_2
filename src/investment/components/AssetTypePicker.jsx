import React, { useEffect, useState } from "react";
import { ASSET_TYPES } from "../constants/assetTypes.js";

// Material-style SVG paths (24x24 viewBox) — one per asset type id
const ASSET_ICONS = {
  stock:  "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z",
  mf:     "M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z",
  gold:   "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
  fd:     "M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm15-12v7h3v-7h-3zm-5.5-9L2 6v2h19V6l-9.5-5z",
  rd:     "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  ppf:    "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z",
  epf:    "M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z",
  nps:    "M12 3L2 9v2h20V9L12 3zm-8 18h16v-2H4v2zm1-3h14v-6H5v6zm2-4h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z",
  bond:   "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
};

const CloseIcon = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

export const AssetTypePicker = ({ open, onClose, onSelect, theme }) => {
  const C = theme;
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setActive(true), 10);
      return () => clearTimeout(t);
    }
    setActive(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 5000,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        opacity: active ? 1 : 0,
        transition: "opacity .2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surface,
          width: "100%",
          maxWidth: 320,
          borderRadius: 20,
          border: `1px solid ${C.borderLight}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
          padding: 16,
          transform: active ? "scale(1) translateY(0)" : "scale(0.92) translateY(8px)",
          transition: "transform .22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          padding: "0 2px",
        }}>
          <div style={{
            color: C.text,
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "-.01em",
          }}>
            Add Investment
          </div>
          <button
            onClick={onClose}
            style={{
              background: C.input,
              border: "none",
              borderRadius: "50%",
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: C.sub,
            }}
            aria-label="Close"
          >
            <CloseIcon color={C.sub} />
          </button>
        </div>

        {/* 3x3 compact grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}>
          {ASSET_TYPES.map((at) => {
            const path = ASSET_ICONS[at.id];
            return (
              <button
                key={at.id}
                onClick={() => onSelect(at.id)}
                style={{
                  background: at.color + "14",
                  border: `1px solid ${at.color}33`,
                  borderRadius: 12,
                  padding: "12px 4px",
                  cursor: "pointer",
                  outline: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  minHeight: 68,
                  transition: "transform .12s ease, background .15s ease",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseEnter={(e) => (e.currentTarget.style.background = at.color + "22")}
                onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
                onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={at.color}
                  style={{ flexShrink: 0 }}
                >
                  <path d={path} />
                </svg>
                <div style={{
                  color: C.text,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "-.01em",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}>
                  {at.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
