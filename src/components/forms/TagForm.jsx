import React, { useState } from "react";
import { Ico } from "../ui/Ico.jsx";
import Icon from "../ui/Icon.jsx";
import { Btn } from "../ui/Btn.jsx";
import { uid } from "../../utils/id.js";

export function TagForm({ editTag, onSave, onCancel, theme }) {
  const C = theme;
  const [name, setName] = useState(editTag?.name || "");
  const [color, setColor] = useState(editTag?.color || "#3b82f6");
  const [icon, setIcon] = useState(editTag?.icon || "Tag");

  const colors = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#64748b"];
  
  const tagIcons = [
    "Tag", "Star", "Heart", "Flag", "Bookmark", "Hash", "CheckCircle", "AlertCircle", 
    "MapPin", "Calendar", "Clock", "Users", "Briefcase", "ShoppingCart", "Plane", 
    "Zap", "Flame", "Activity", "Music", "Coffee", "Gift",
    "Camera", "BookOpen", "Monitor", "Smartphone", "TrendingUp", "Award"
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: editTag?.id || uid(),
      name: name.trim().replace(/^#/, ""), // Remove leading # if user typed it
      color,
      icon
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{padding: "16px 14px", display:"flex", flexDirection:"column", gap:14}}>
      <div style={{display:"flex", gap:16, alignItems:"center"}}>
        <div style={{
          width:48, height:48, borderRadius:14, background:`linear-gradient(135deg, ${color}33, ${color}11)`,
          display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${color}66`,
          fontSize:24, boxShadow:`0 6px 12px ${color}22`, backdropFilter:"blur(10px)", color:color
        }}>
          <Icon name={icon} size={24} />
        </div>
        <div style={{flex:1}}>
          <label style={{color:C.sub, fontSize:9, fontWeight:900, textTransform:"uppercase", letterSpacing:".1em"}}>Tag Name</label>
          <input 
            autoFocus
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="e.g. Vacation"
            style={{
              width:"100%", background:"none", border:"none", borderBottom:`2px solid ${C.border}`,
              color:C.text, fontSize:18, fontWeight:800, padding:"4px 0", outline:"none",
              transition:"border-color .3s"
            }}
            onFocus={e=>e.target.style.borderColor=C.primary}
            onBlur={e=>e.target.style.borderColor=C.border}
          />
        </div>
      </div>

      <div>
        <label style={{color:C.sub, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".1em", display:"block", marginBottom:10}}>Identity Color</label>
        <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
          {colors.map(c => (
            <button key={c} type="button" onClick={()=>setColor(c)} style={{
              width:26, height:26, borderRadius:"50%", background:c, border:color===c?`3px solid #fff`:`2px solid transparent`,
              cursor:"pointer", transition:"transform .2s", boxShadow:color===c?`0 0 12px ${c}`:"none"
            }} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
          ))}
        </div>
      </div>

      <div>
        <label style={{color:C.sub, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".1em", display:"block", marginBottom:10}}>Visual Icon</label>
        <div style={{display:"flex", flexWrap:"wrap", gap:6, maxHeight:150, overflowY:"auto", paddingRight:4}} className="premium-scroll">
          {tagIcons.map(e => (
            <button key={e} type="button" onClick={()=>setIcon(e)} style={{
              width:34, height:34, borderRadius:8, background:icon===e?C.primaryDim:"transparent",
              border:icon===e?`1px solid ${C.primary}`:`1px solid transparent`,
              display:"flex", alignItems:"center", justifyContent:"center", color:C.text,
              cursor:"pointer", transition:"all .2s"
            }}>
              <Icon name={e} size={18} />
            </button>
          ))}
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
        <Btn theme={C} v="ghost" full sm onClick={onCancel}>Cancel</Btn>
        <Btn theme={C} v="primary" full sm type="submit">Save Tag</Btn>
      </div>
    </form>
  );
}
