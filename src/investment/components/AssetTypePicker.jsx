import React from "react";
import { ASSET_TYPES } from "../constants/assetTypes.js";
import { Modal } from "../../components/ui/Modal.jsx";

export const AssetTypePicker = ({ open, onClose, onSelect, theme }) => {
  const C = theme;
  return (
    <Modal theme={C} open={open} onClose={onClose} title="Add Investment">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: "10px 0" }}>
        {ASSET_TYPES.map(at => (
          <button key={at.id} onClick={() => onSelect(at.id)} style={{
            background: at.color + "12", border: `1px solid ${at.color}33`,
            borderRadius: 16, padding: "16px 8px", textAlign: "center",
            cursor: "pointer", transition: "transform .1s", outline: "none"
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{at.icon}</div>
            <div style={{ color: C.text, fontSize: 11, fontWeight: 700 }}>{at.label}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
};
