import React, { useState, useEffect, useRef } from "react";
import { Ico } from "./Ico.jsx";

export const Modal = ({ open, onClose, title, children, theme, maxWidth = 400 }) => {
  const [active, setActive] = useState(false);
  const [vpHeight, setVpHeight] = useState(window.visualViewport?.height || window.innerHeight);
  const C = theme;
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => setActive(true), 10);
    else setActive(false);
  }, [open]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setVpHeight(vv.height);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // Auto-scroll focused input into view when keyboard opens
  useEffect(() => {
    if (!open) return;
    const handleFocus = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        setTimeout(() => {
          if (scrollRef.current && e.target) {
            const scrollContainer = scrollRef.current;
            const rect = e.target.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();
            const offset = rect.top - containerRect.top - 60;
            scrollContainer.scrollBy({ top: offset, behavior: "smooth" });
          }
        }, 300);
      }
    };
    window.addEventListener("focusin", handleFocus);
    return () => window.removeEventListener("focusin", handleFocus);
  }, [open]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed",
      inset: 0,
      background: C.isGlass ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,.5)",
      backdropFilter: C.isGlass ? "blur(6px)" : "blur(8px)",
      WebkitBackdropFilter: C.isGlass ? "blur(6px)" : "blur(8px)",
      zIndex: 5000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      transition: "opacity .2s ease",
      opacity: active ? 1 : 0,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.isGlass ? "rgba(255, 255, 255, 0.08)" : C.surface,
        borderRadius: 20,
        width: "100%",
        maxWidth,
        maxHeight: `${vpHeight - 40}px`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backdropFilter: C.isGlass ? "blur(40px) saturate(180%)" : undefined,
        WebkitBackdropFilter: C.isGlass ? "blur(40px) saturate(180%)" : undefined,
        border: C.isGlass ? "1px solid rgba(255, 255, 255, 0.15)" : undefined,
        boxShadow: C.isGlass 
          ? `0 24px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(140,120,255,0.10), inset 0 1px 0 rgba(160,140,255,0.06)`
          : `0 24px 80px rgba(0,0,0,.5), 0 0 0 1px ${C.border}33`,
        transform: active ? "scale(1)" : "scale(0.92)",
        opacity: active ? 1 : 0,
        transition: "transform .25s cubic-bezier(0.32, 0.72, 0, 1), opacity .2s ease",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: `1px solid ${C.borderLight || C.border}`,
          background: "transparent",
          flexShrink: 0,
        }}>
          <span style={{ color: C.text, fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>{title}</span>
          <button onClick={onClose} style={{
            background: C.input,
            border: "none",
            borderRadius: "50%",
            color: C.text,
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            flexShrink: 0,
          }}>
            <Ico n="close" sz={14}/>
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="premium-scroll" style={{
          padding: "12px 14px 16px",
          overflowY: "auto",
          flex: 1,
          WebkitOverflowScrolling: "touch",
        }}>{children}</div>
      </div>
    </div>
  );
};
