import React, { useState } from "react";
import { Btn } from "../ui/Btn.jsx";
import { Ico } from "../ui/Ico.jsx";
import { uid } from "../../utils/id.js";

export function AccForm({ editAcc, onSave, onCancel, theme }) {
  const C = theme;
  const [name, setName] = useState(editAcc?.name || "");
  const [type, setType] = useState(editAcc?.type || "Bank");
  const [balance, setBalance] = useState(editAcc?.initialBalance?.toString() || "");

  const types = [
    { id: "Bank", icon: "bank" },
    { id: "Credit Card", icon: "list" },
    { id: "Wallet", icon: "archive" },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: editAcc?.id || uid(),
      name: name.trim(),
      type,
      initialBalance: parseFloat(balance) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={{ color: C.sub, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em" }}>Account Name</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. HDFC Bank, Amazon Pay..."
          style={{
            width: "100%", background: "none", border: "none", borderBottom: `2px solid ${C.border}`,
            color: C.text, fontSize: 16, fontWeight: 800, padding: "6px 0", outline: "none",
            transition: "border-color .3s"
          }}
          onFocus={e => e.target.style.borderColor = C.primary}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      </div>

      <div>
        <label style={{ color: C.sub, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10, display: "block" }}>Account Type</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {types.map(t => (
            <button key={t.id} type="button" onClick={() => setType(t.id)} style={{
              background: type === t.id ? C.primaryDim : C.input,
              border: `1px solid ${type === t.id ? C.primary : C.border}`,
              borderRadius: 12, padding: "10px 4px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              transition: "all .2s ease", transform: type === t.id ? "translateY(-2px)" : "none",
              boxShadow: type === t.id ? `0 6px 12px ${C.primaryDim}` : "none"
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: type === t.id ? C.primary : C.surface, color: type === t.id ? "#000" : C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico n={t.icon} sz={16} />
              </div>
              <span style={{ color: type === t.id ? C.primary : C.sub, fontSize: 10, fontWeight: 800 }}>{t.id}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: C.sub, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em" }}>Initial Balance (₹)</label>
        <input
          type="number"
          value={balance}
          onChange={e => setBalance(e.target.value)}
          placeholder="0.00"
          style={{
            width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 10,
            color: C.text, fontSize: 14, fontWeight: 700, padding: "10px 12px", outline: "none",
            fontFamily: "'JetBrains Mono',monospace", transition: "border-color .3s"
          }}
          onFocus={e => e.target.style.borderColor = C.primary}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
        <Btn theme={C} v="ghost" full sm onClick={onCancel}>Cancel</Btn>
        <Btn theme={C} v="primary" full sm type="submit">{editAcc ? "Save Changes" : "Create Account"}</Btn>
      </div>
    </form>
  );
}
