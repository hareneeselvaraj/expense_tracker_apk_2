import React, { useState, useEffect, useRef } from "react";
import { Ico } from "./Ico.jsx";

export const Modal = ({ open, onClose, title, children, theme, maxWidth = 440 }) => {
  const [active, setActive] = useState(false);
  const [vpHeight, setVpHeight] = useState(window.visualViewport?.height || window.innerHeight);
  const C = theme;
  const scrollRef = useRef(null);
  useEffect(() => { if(open) setTimeout(()=>setActive(true), 10); else setActive(false); }, [open]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setVpHeight(vv.height);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleFocus = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        setIsKeyboardOpen(true);
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
    const handleBlur = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        setTimeout(() => setIsKeyboardOpen(false), 100);
      }
    };
    window.addEventListener("focusin", handleFocus);
    window.addEventListener("focusout", handleBlur);
    return () => {
      window.removeEventListener("focusin", handleFocus);
      window.removeEventListener("focusout", handleBlur);
    };
  }, [open]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if(!open) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.55)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      zIndex: 5000,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      padding: 0,
      transition: "opacity .25s ease",
      opacity: active ? 1 : 0
    }}>
      <div className="premium-scroll modal-sheet" onClick={e=>e.stopPropagation()} style={{
        background: C.surface,
        borderRadius: "20px 20px 0 0",
        width: "100%",
        maxWidth,
        maxHeight: isKeyboardOpen ? `${vpHeight - 20}px` : `${Math.min(vpHeight * 0.92, vpHeight - 20)}px`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: `0 -10px 40px rgba(0,0,0,.4), 0 0 0 1px ${C.border}44`,
        transform: active ? "translateY(0)" : "translateY(100%)",
        opacity: active ? 1 : 0,
        transition: "transform .3s cubic-bezier(0.32, 0.72, 0, 1), opacity .2s ease",
      }}>
        {/* Drag handle for mobile */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
        </div>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px 12px",
          borderBottom: `1px solid ${C.borderLight || C.border}`,
          background: C.surface,
          flexShrink: 0,
        }}>
          <span style={{ color: C.text, fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" }}>{title}</span>
          <button onClick={onClose} style={{
            background: C.input,
            border: "none",
            borderRadius: "50%",
            color: C.text,
            cursor: "pointer",
            padding: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background .2s",
            width: 32,
            height: 32,
            flexShrink: 0,
            minWidth: 32,
            minHeight: 32,
          }}>
            <Ico n="close" sz={16}/>
          </button>
        </div>
        {/* Scrollable content area */}
        <div ref={scrollRef} className="premium-scroll" style={{
          padding: "16px 16px 32px",
          overflowY: "auto",
          flex: 1,
          WebkitOverflowScrolling: "touch",
        }}>{children}</div>
      </div>
    </div>
  );
};
