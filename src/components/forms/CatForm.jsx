import React, { useState, useEffect } from "react";
import { Ico } from "../ui/Ico.jsx";
import Icon from "../ui/Icon.jsx";
import { Btn } from "../ui/Btn.jsx";
import { uid } from "../../utils/id.js";

export function CatForm({ editCat, onSave, onCancel, theme }) {
  const C = theme;
  const [name, setName] = useState(editCat?.name || "");
  const [type, setType] = useState(editCat?.type || "Expense");
  const [color, setColor] = useState(editCat?.color || "#3b82f6");
  const [icon, setIcon] = useState(editCat?.icon || editCat?.emoji || "Package");

  const colors = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#64748b"];
  
  const iconSets = {
    Expense: [
       "ShoppingCart", "ShoppingBag", "Utensils", "Coffee", "Pizza", "Cake", "Wine",
       "Home", "Hotel", "Zap", "Droplets", "Flame", "Wifi", "Phone",
       "Car", "Fuel", "Bus", "Train", "Plane", "Bike",
       "Stethoscope", "HeartPulse", "Pill", "Dumbbell", "Smile",
       "GraduationCap", "BookOpen", "Library", "PenTool",
       "Film", "MonitorPlay", "Ticket", "Music", "Gamepad2", "Headphones",
       "Shirt", "Scissors", "Watch", "SprayCan",
       "Baby", "Dog", "Cat", "Bone",
       "FileText", "Receipt", "CreditCard", "Wallet",
       "Smartphone", "Laptop", "Tv", "Camera",
       "Wrench", "Hammer", "Paintbrush",
       "TreePine", "Leaf", "Sun", "Gift", "Package",
       "ShieldAlert", "Lock", "Archive", "MoreHorizontal"
    ],
    Income: [
      "Banknote", "Coins", "DollarSign", "PiggyBank", "Wallet",
      "TrendingUp", "ArrowUpRight", "ArrowUpCircle",
      "Briefcase", "Handshake", "Award", "Trophy", "Crown",
      "Gift", "PartyPopper", "Sparkles", "Undo2"
    ],
    Investment: [
      "TrendingUp", "BarChart3", "PieChart", "LineChart", 
      "Gem", "Coins", "Safe", "Building", "Landmark",
      "Rocket", "Briefcase", "Globe", "Key", "ShieldCheck",
      "Target", "Anchor", "Compass", "Map"
    ]
  };
  
  const icons = iconSets[type] || iconSets.Expense;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: editCat?.id || uid(),
      name: name.trim(),
      type,
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
          fontSize:24, boxShadow:`0 6px 12px ${color}22`, backdropFilter:"blur(10px)",
          color
        }}>
          <Icon name={icon} size={24} />
        </div>
        <div style={{flex:1}}>
          <label style={{color:C.sub, fontSize:9, fontWeight:900, textTransform:"uppercase", letterSpacing:".1em"}}>Category Name</label>
          <input 
            autoFocus
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="e.g. Shopping"
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

      <div style={{display:"flex", background:C.input, borderRadius:12, padding:4, border:`1px solid ${C.border}`}}>
        {["Expense", "Income", "Investment"].map(t => (
          <button key={t} type="button" onClick={()=>setType(t)} style={{
            flex:1, padding:"8px 10px", borderRadius:10, border:"none", cursor:"pointer",
            fontSize:11, fontWeight:800, textTransform:"uppercase",
            background:type===t?C.primary:"transparent",
            color:type===t?"#000":C.sub,
            transition:"all .2s"
          }}>{t}</button>
        ))}
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
          {icons.map(e => (
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
        <Btn theme={C} v="primary" full sm type="submit">Save Category</Btn>
      </div>
    </form>
  );
}
