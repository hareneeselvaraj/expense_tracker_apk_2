import React, { useState, useEffect, useRef } from "react";
import { Ico } from "./Ico.jsx";
import { FLabel } from "./FInput.jsx";

export const PremiumSelect = ({ label, value, options, onChange, placeholder = "Select...", searchable = true, multi = false, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const C = theme;

  useEffect(() => {
    const handleClickOutside = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => 
    (o.name || o.label || "").toLowerCase().includes(search.toLowerCase())
  );

  const isSel = (opt) => multi ? (value || []).includes(opt.id || opt.name) : (opt.id || opt.name) === value;

  const handleSelect = (opt) => {
    const val = opt.id || opt.name;
    if (multi) {
      const next = (value || []).includes(val) ? (value || []).filter(x => x !== val) : [...(value || []), val];
      onChange(next);
    } else {
      onChange(val);
      setIsOpen(false);
      setSearch("");
    }
  };

  const selectedText = () => {
    if (multi) {
      if (!value || value.length === 0) return placeholder;
      if (value.length === 1) return options.find(o => (o.id === value[0] || o.name === value[0]))?.name || value[0];
      return `${value.length} selected`;
    }
    const sel = options.find(o => (o.id === value || o.name === value));
    return sel ? (sel.name || sel.label) : placeholder;
  };

  const selectedColor = () => {
    if (multi) return null;
    return options.find(o => (o.id === value || o.name === value))?.color;
  };

  const selectedEmoji = () => {
    if (multi) return null;
    return options.find(o => (o.id === value || o.name === value))?.emoji;
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {label && <FLabel theme={C}>{label}</FLabel>}
      <div onClick={() => setIsOpen(!isOpen)} style={{
        background: C.input, border: `1px solid ${isOpen ? C.primary : C.border}`, borderRadius: 10, padding: "3px 10px", cursor: "pointer", 
        display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all .3s cubic-bezier(0.4, 0, 0.2, 1)", minHeight: 30,
        boxShadow: isOpen ? `0 0 12px ${C.primaryDim}` : "none"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap:8 }}>
          {selectedColor() ? (
             <div style={{ width: 8, height: 8, borderRadius: "50%", background: selectedColor(), boxShadow: `0 0 6px ${selectedColor()}44` }} />
          ) : selectedEmoji() ? (
             <span style={{ fontSize: 14 }}>{selectedEmoji()}</span>
          ) : multi && value?.length > 0 ? (
             <div style={{width:22, height:22, borderRadius:6, background:C.primary, color:"#000", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900}}>{value.length}</div>
          ) : null}
          <div style={{display:"flex", flexDirection:"column"}}>
            <span style={{ color: (multi ? value?.length > 0 : value) ? C.text : C.sub, fontSize: 12, fontWeight: 700 }}>{selectedText()}</span>
          </div>
        </div>
        <div style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .4s cubic-bezier(0.175, 0.885, 0.32, 1.275)", display: "flex", color: isOpen ? C.primary : C.sub }}>
          <Ico n="chevronDown" sz={14} />
        </div>
      </div>

      {isOpen && (
        <div className="page-enter" style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, 
          boxShadow: "0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)", zIndex: 1000, maxHeight: 260, overflow: "hidden", 
          backdropFilter: "blur(40px) saturate(200%)", animation: "scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          {searchable && options.length > 5 && (
            <div style={{padding:8, borderBottom:`1px solid ${C.border}`, background:C.muted+"30"}}>
               <input 
                 autoFocus
                 placeholder="Search…" 
                 value={search} 
                 onChange={e => setSearch(e.target.value)}
                 style={{width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", color:C.text, fontSize:16, outline:"none", fontFamily:"inherit"}}
               />
            </div>
          )}
          <div style={{maxHeight:searchable && options.length > 5 ? 220 : 280, overflowY:"auto", padding:4}}>
            {filtered.length === 0 ? (
              <div style={{padding:16, textAlign:"center", color:C.sub, fontSize:11}}>No matches found</div>
            ) : filtered.map(opt => {
              const sel = isSel(opt);
              return (
                <div key={opt.id || opt.name} onClick={() => handleSelect(opt)} style={{
                  padding: "8px 10px", borderRadius:12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all .2s",
                  background: sel ? C.primary + "15" : "transparent", marginBottom: 1
                }} onMouseEnter={e => e.currentTarget.style.background = C.muted} onMouseLeave={e => e.currentTarget.style.background = sel ? C.primary + "15" : "transparent"}>
                  {opt.color ? (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color, boxShadow: `0 0 8px ${opt.color}33` }} />
                  ) : opt.emoji ? (
                    <span style={{ fontSize: 14 }}>{opt.emoji}</span>
                  ) : null}
                  <div style={{flex:1}}>
                    <div style={{ color: sel ? C.primary : C.text, fontSize: 12, fontWeight: 700 }}>{opt.name || opt.label}</div>
                    {opt.type && <div style={{fontSize:8, color:C.sub, fontWeight:800, textTransform:"uppercase"}}>{opt.type}</div>}
                  </div>
                  {sel && <Ico n="check" sz={12} c={C.primary}/>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
export const CustomSelect = PremiumSelect;
