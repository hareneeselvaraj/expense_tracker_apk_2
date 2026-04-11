import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { FInput, FLabel } from "../../../components/ui/FInput.jsx";
import { Btn } from "../../../components/ui/Btn.jsx";
import { Ico } from "../../../components/ui/Ico.jsx";
import { uid } from "../../../utils/id.js";
import { todayISO } from "../../../utils/format.js";
import { calcHoldingValue } from "../../utils/valuation.js";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f43f5e", "#f59e0b"];
const ICONS = ["flag", "home", "wallet", "trendUp", "stars"];

export const GoalForm = ({ open, init, onClose, onSave, theme, holdings = [] }) => {
  const C = theme;
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [priority, setPriority] = useState("medium");
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState("flag");
  const [linked, setLinked] = useState([]);

  useEffect(() => {
    if (init && open) {
      setName(init.name || "");
      setTargetAmount(init.targetAmount || "");
      setTargetDate(init.targetDate || "");
      setMonthlyContribution(init.monthlyContribution || "");
      setPriority(init.priority || "medium");
      setColor(init.color || COLORS[0]);
      setIcon(init.icon || "flag");
      setLinked(init.linkedHoldingIds || []);
    } else {
      setName("");
      setTargetAmount("");
      setTargetDate("");
      setMonthlyContribution("");
      setPriority("medium");
      setColor(COLORS[0]);
      setIcon("flag");
      setLinked([]);
    }
  }, [init, open]);

  const handleSave = () => {
    if (!name || !targetAmount || !targetDate) return;
    const g = {
      id: init?.id || "goal_" + uid(),
      name,
      icon,
      color,
      targetAmount: parseFloat(targetAmount),
      targetDate,
      startDate: init?.startDate || todayISO(),
      linkedHoldingIds: linked,
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      priority,
      createdAt: init?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    };
    onSave(g);
  };

  const toggleLink = (hId) => {
    setLinked(prev => prev.includes(hId) ? prev.filter(id => id !== hId) : [...prev, hId]);
  };

  const activeHoldings = holdings.filter(h => !h.deleted);

  return (
    <Modal maxWidth={480} open={open} onClose={onClose} title={init ? "Edit Goal" : "Add Goal"} theme={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <FLabel theme={C}>Goal Name</FLabel>
          <FInput theme={C} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. House Downpayment" />
        </div>
        <div className="form-row">
          <div style={{ flex: 1, minWidth: 130 }}>
            <FLabel theme={C}>Target Amount (₹)</FLabel>
            <FInput theme={C} type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="5000000" />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
             <FLabel theme={C}>Target Date</FLabel>
             <FInput theme={C} type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
        </div>
        <div>
          <FLabel theme={C}>Monthly Contribution (₹)</FLabel>
          <FInput theme={C} type="number" value={monthlyContribution} onChange={e => setMonthlyContribution(e.target.value)} placeholder="SIP amount" />
        </div>

        <div>
           <FLabel theme={C}>Color Accent</FLabel>
           <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
             {COLORS.map(c => (
               <button key={c} onClick={() => setColor(c)} style={{ width: 36, height: 36, borderRadius: "50%", background: c, border: color === c ? `3px solid #fff` : "none", outline: color === c ? `2px solid ${c}` : "none", cursor: "pointer", flexShrink: 0 }} />
             ))}
           </div>
        </div>

        <div>
           <FLabel theme={C}>Icon</FLabel>
           <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
             {ICONS.map(ic => (
               <button key={ic} onClick={() => setIcon(ic)} type="button" style={{ width: 40, height: 40, borderRadius: 12, background: icon === ic ? C.primary + "33" : C.surface, border: `1px solid ${icon === ic ? C.primary : C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: icon === ic ? C.primary : C.sub, padding: 0, flexShrink: 0 }}>
                 <Ico n={ic} sz={18} c={icon === ic ? C.primary : C.sub} />
               </button>
             ))}
           </div>
        </div>

        {activeHoldings.length > 0 && (
          <div>
            <FLabel theme={C}>Link Holdings to this Goal</FLabel>
            <div className="premium-scroll" style={{ background: C.input, borderRadius: 16, border: `1px solid ${C.borderLight}`, padding: 8, maxHeight: 180, overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", gap: 4 }}>
               {activeHoldings.map(h => {
                 const isSel = linked.includes(h.id);
                 const hVal = calcHoldingValue(h);
                 return (
                   <div key={h.id} onClick={() => toggleLink(h.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, background: isSel ? C.primary+"22" : "transparent", cursor: "pointer", transition: "all 0.2s", minHeight: 44 }}>
                     <div style={{ minWidth: 0, flex: 1 }}>
                       <div style={{ fontSize: 13, color: C.text, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</div>
                       <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{h.symbol || h.type.toUpperCase()} | ₹{hVal.toLocaleString()}</div>
                     </div>
                     <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSel ? C.primary : C.sub}`, display: "flex", alignItems: "center", justifyContent: "center", background: isSel ? C.primary : "transparent", flexShrink: 0, marginLeft: 8 }}>
                       {isSel && <div style={{ width: 10, height: 10, background: "#fff", borderRadius: 2 }} />}
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        <Btn theme={C} v="primary" full onClick={handleSave} style={{ marginTop: 4, minHeight: 48 }} disabled={!name || !targetAmount || !targetDate}>
          {init ? "Save Goal" : "Create Goal"}
        </Btn>
      </div>
    </Modal>
  );
};
