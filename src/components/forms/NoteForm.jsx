import React, { useState } from "react";
import { FInput, FLabel } from "../ui/FInput.jsx";
import { Btn } from "../ui/Btn.jsx";
import { uid } from "../../utils/id.js";

const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#ec4899","#06b6d4","#8b5cf6","#f97316"];

export const NoteForm = ({ init, onSave, onDelete, onClose, theme }) => {
  const C = theme;
  const [note, setNote] = useState({
    id: init?.id || uid(),
    title: init?.title || "",
    body: init?.body || "",
    color: init?.color || COLORS[0],
    pinned: init?.pinned || false,
    createdAt: init?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const valid = note.title.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <FLabel theme={C}>Title</FLabel>
        <FInput theme={C} value={note.title} onChange={e => setNote(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Lended to Yaswanth" />
      </div>

      <div>
        <FLabel theme={C}>Details</FLabel>
        <textarea
          value={note.body}
          onChange={e => setNote(p => ({ ...p, body: e.target.value }))}
          placeholder="Write your note here…"
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box", background: C.input, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "10px 14px", color: C.text, fontSize: 14,
            fontFamily: "inherit", resize: "vertical", outline: "none",
            transition: "border-color .2s",
          }}
          onFocus={e => e.target.style.borderColor = C.primary}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      </div>

      {/* Color picker */}
      <div>
        <FLabel theme={C}>Color</FLabel>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COLORS.map(c => (
            <div
              key={c}
              onClick={() => setNote(p => ({ ...p, color: c }))}
              style={{
                width: 28, height: 28, borderRadius: 10, background: c, cursor: "pointer",
                border: note.color === c ? `3px solid ${C.text}` : `3px solid transparent`,
                transition: "all .2s", transform: note.color === c ? "scale(1.15)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
        {onDelete && (
          confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.expense + "11", padding: "3px 10px", borderRadius: 10, border: `1px solid ${C.expense}40` }}>
              <span style={{ color: C.expense, fontSize: 9, fontWeight: 900, textTransform: "uppercase" }}>Confirm?</span>
              <button type="button" onClick={() => onDelete(note.id)} style={{ background: C.expense, border: "none", color: "#fff", cursor: "pointer", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 800 }}>YES</button>
              <button type="button" onClick={() => setConfirmDelete(false)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.sub, cursor: "pointer", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 800 }}>NO</button>
            </div>
          ) : (
            <Btn theme={C} v="ghost" sm icon="trash" onClick={() => setConfirmDelete(true)} style={{ color: C.expense }}>Delete</Btn>
          )
        )}
        <div style={{ flex: 1 }} />
        <Btn theme={C} v="ghost" sm onClick={onClose}>Cancel</Btn>
        <Btn theme={C} v="primary" sm disabled={!valid} onClick={() => onSave(note)}>
          {init?.id ? "Save" : "Add"}
        </Btn>
      </div>
    </div>
  );
};
