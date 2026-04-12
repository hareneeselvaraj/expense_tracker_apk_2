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
      "Utensils", "Coffee", "Pizza", "Cake", "Beer", "Wine", "Martini",
      "ShoppingCart", "ShoppingBag", "Store", "Gift", "Smartphone", "Laptop", "Tv",
      "Car", "Bus", "Train", "Plane", "Bike", "Fuel",
      "Home", "Droplets", "Zap", "Wifi", "Sofa",
      "Film", "Ticket", "Music", "Gamepad2", "Headphones",
      "Stethoscope", "HeartPulse", "Pill", "Dumbbell", "Activity",
      "GraduationCap", "BookOpen", "PenTool",
      "Baby", "Cat", "Dog",
      "Shirt", "Scissors", "Brush", "Briefcase",
      "Wrench", "Hammer", "ShieldAlert", "Package", "Archive"
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
    <form onSubmit={handleSubmit} style={{padding:20, display:"flex", flexDirection:"column", gap:18}}>
      <div style={{display:"flex", gap:20, alignItems:"center"}}>
        <div style={{
          width:56, height:56, borderRadius:18, background:`linear-gradient(135deg, ${color}33, ${color}11)`,
          display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${color}66`,
          fontSize:28, boxShadow:`0 10px 20px ${color}22`, backdropFilter:"blur(10px)",
          color
        }}>
          <Icon name={icon} size={28} />
        </div>
        <div style={{flex:1}}>
          <label style={{color:C.sub, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".1em"}}>Category Name</label>
          <input 
            autoFocus
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="e.g. Shopping"
            style={{
              width:"100%", background:"none", border:"none", borderBottom:`2px solid ${C.border}`,
              color:C.text, fontSize:22, fontWeight:800, padding:"8px 0", outline:"none",
              transition:"border-color .3s"
            }}
            onFocus={e=>e.target.style.borderColor=C.primary}
            onBlur={e=>e.target.style.borderColor=C.border}
          />
        </div>
      </div>

      <div style={{display:"flex", background:C.input, borderRadius:16, padding:4, border:`1px solid ${C.border}`}}>
        {["Expense", "Income", "Investment"].map(t => (
          <button key={t} type="button" onClick={()=>setType(t)} style={{
            flex:1, padding:"10px 12px", borderRadius:12, border:"none", cursor:"pointer",
            fontSize:12, fontWeight:800, textTransform:"uppercase",
            background:type===t?C.primary:"transparent",
            color:type===t?"#000":C.sub,
            transition:"all .3s"
          }}>{t}</button>
        ))}
      </div>

      <div>
        <label style={{color:C.sub, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".1em", display:"block", marginBottom:12}}>Identity Color</label>
        <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
          {colors.map(c => (
            <button key={c} type="button" onClick={()=>setColor(c)} style={{
              width:28, height:28, borderRadius:"50%", background:c, border:color===c?`3px solid #fff`:`2px solid transparent`,
              cursor:"pointer", transition:"transform .2s", boxShadow:color===c?`0 0 15px ${c}`:"none"
            }} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
          ))}
        </div>
      </div>

      <div>
        <label style={{color:C.sub, fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:".1em", display:"block", marginBottom:12}}>Visual Icon</label>
        <div style={{display:"flex", flexWrap:"wrap", gap:6, maxHeight:120, overflowY:"auto", paddingRight:4}} className="premium-scroll">
          {icons.map(e => (
            <button key={e} type="button" onClick={()=>setIcon(e)} style={{
              width:36, height:36, borderRadius:10, background:icon===e?C.primaryDim:"transparent",
              border:icon===e?`1px solid ${C.primary}`:`1px solid ${C.border}`,
              display:"flex", alignItems:"center", justifyContent:"center", color:C.text,
              fontSize:18, cursor:"pointer", transition:"all .2s"
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
