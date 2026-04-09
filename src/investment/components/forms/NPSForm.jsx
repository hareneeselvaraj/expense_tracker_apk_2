import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { FInput, FLabel } from "../../../components/ui/FInput.jsx";
import { Btn } from "../../../components/ui/Btn.jsx";
import { uid } from "../../../utils/id.js";
import { todayISO } from "../../../utils/format.js";

export const NPSForm = ({ open, init, onClose, onSave, theme }) => {
  const C = theme;
  
  const [name, setName] = useState("");
  const [pran, setPran] = useState("");
  const [tierType, setTierType] = useState("tier1"); // tier1 or tier2
  const [currentCorpus, setCurrentCorpus] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  
  useEffect(() => {
    if (init) {
      setName(init.name || "");
      setPran(init.pran || "");
      setTierType(init.tierType || "tier1");
      setCurrentCorpus(init.principal || "");
      setStartDate(init.startDate || todayISO());
    } else {
      setName("");
      setPran("");
      setTierType("tier1");
      setCurrentCorpus("");
      setStartDate(todayISO());
    }
  }, [init, open]);

  const handleSave = () => {
    if (!currentCorpus) return;
    const isNew = !init;
    const hId = init?.id || "hld_" + uid();
    const holding = {
      id: hId,
      type: "nps",
      name: name || `NPS ${tierType === 'tier1' ? 'Tier I' : 'Tier II'}`,
      pran,
      tierType,
      principal: parseFloat(currentCorpus),
      startDate,
      createdAt: init?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    };
    
    let initialTx = null;
    if (isNew) {
      initialTx = {
        id: "itx_" + uid(),
        holdingId: hId,
        type: "deposit",
        date: startDate,
        amount: parseFloat(currentCorpus),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };
    }
    
    onSave(holding, initialTx);
  };

  return (
    <Modal open={open} onClose={onClose} title={init ? "Edit NPS Holding" : "Add National Pension System"} theme={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <FLabel theme={C}>Custom Name (Optional)</FLabel>
          <FInput theme={C} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My NPS" />
        </div>
        
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>PRAN</FLabel>
            <FInput theme={C} value={pran} onChange={e => setPran(e.target.value)} placeholder="12 digit PRAN" />
          </div>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>Tier Type</FLabel>
            <select value={tierType} onChange={e => setTierType(e.target.value)} style={{ width: "100%", padding: "8px 12px", fontSize: "16px", borderRadius: 10, background: C.input, color: C.text, border: `1px solid ${C.border}`, outline: "none" }}>
              <option value="tier1">Tier I (Retirement)</option>
              <option value="tier2">Tier II (Voluntary)</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>Current Value (₹)</FLabel>
            <FInput theme={C} type="number" value={currentCorpus} onChange={e => setCurrentCorpus(e.target.value)} placeholder="Total Corpus" />
          </div>
          <div style={{ flex: 1 }}>
             <FLabel theme={C}>Start Date</FLabel>
             <FInput theme={C} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
        </div>

        <Btn theme={C} v="primary" full onClick={handleSave} style={{ marginTop: 8 }}>
          {init ? "Save Details" : "Add NPS"}
        </Btn>
      </div>
    </Modal>
  );
};
