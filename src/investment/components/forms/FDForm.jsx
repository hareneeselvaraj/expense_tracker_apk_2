import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { FInput, FLabel } from "../../../components/ui/FInput.jsx";
import { Btn } from "../../../components/ui/Btn.jsx";
import { uid } from "../../../utils/id.js";
import { todayISO } from "../../../utils/format.js";

export const FDForm = ({ open, init, onClose, onSave, theme }) => {
  const C = theme;
  
  const [bank, setBank] = useState("");
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [tenureMonths, setTenureMonths] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [compoundingFreq, setCompoundingFreq] = useState("quarterly");
  const [interestPayout, setInterestPayout] = useState("cumulative");
  
  useEffect(() => {
    if (init) {
      setBank(init.bank || "");
      setName(init.name || "");
      setPrincipal(init.principal || "");
      setInterestRate(init.interestRate || "");
      setStartDate(init.startDate || todayISO());
      setMaturityDate(init.maturityDate || "");
      setTenureMonths(init.tenureMonths || "");
      setCompoundingFreq(init.compoundingFreq || "quarterly");
      setInterestPayout(init.interestPayout || "cumulative");
    } else {
      setBank("");
      setName("");
      setPrincipal("");
      setInterestRate("");
      setStartDate(todayISO());
      setTenureMonths("");
      setMaturityDate("");
      setCompoundingFreq("quarterly");
      setInterestPayout("cumulative");
    }
  }, [init, open]);

  // Auto-calc maturityDate if tenure is entered
  useEffect(() => {
    if (startDate && tenureMonths) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + parseInt(tenureMonths, 10));
      setMaturityDate(d.toISOString().split("T")[0]);
    }
  }, [startDate, tenureMonths]);

  const handleSave = () => {
    if (!principal || !interestRate || !startDate || !maturityDate) return;
    const isNew = !init;
    const hId = init?.id || "hld_" + uid();
    const holding = {
      id: hId,
      type: "fd",
      name: name || `${bank} FD`,
      bank,
      principal: parseFloat(principal),
      interestRate: parseFloat(interestRate),
      startDate,
      maturityDate,
      tenureMonths: parseInt(tenureMonths, 10) || 0,
      compoundingFreq,
      interestPayout,
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
        amount: parseFloat(principal),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };
    }
    
    onSave(holding, initialTx);
  };

  return (
    <Modal maxWidth={420} open={open} onClose={onClose} title={init ? "Edit Fixed Deposit" : "Add Fixed Deposit"} theme={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <FLabel theme={C}>Bank Name</FLabel>
          <FInput theme={C} value={bank} onChange={e => setBank(e.target.value)} placeholder="e.g. HDFC Bank" />
        </div>
        <div>
          <FLabel theme={C}>Custom Name (Optional)</FLabel>
          <FInput theme={C} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Emergency Fund FD" />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>Principal (₹)</FLabel>
            <FInput theme={C} type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="100000" />
          </div>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>Interest Rate (%)</FLabel>
            <FInput theme={C} type="number" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="7.1" />
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>Start Date</FLabel>
            <FInput theme={C} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>Tenure (Months)</FLabel>
            <FInput theme={C} type="number" value={tenureMonths} onChange={e => setTenureMonths(e.target.value)} placeholder="12" />
          </div>
        </div>

        <div>
          <FLabel theme={C}>Maturity Date</FLabel>
          <FInput theme={C} type="date" value={maturityDate} onChange={e => setMaturityDate(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>Compounding</FLabel>
            <select value={compoundingFreq} onChange={e => setCompoundingFreq(e.target.value)} style={{ width: "100%", padding: "8px 12px", fontSize: "16px", borderRadius: 10, background: C.input, color: C.text, border: `1px solid ${C.border}`, outline: "none" }}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="halfyearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>Payout</FLabel>
            <select value={interestPayout} onChange={e => setInterestPayout(e.target.value)} style={{ width: "100%", padding: "8px 12px", fontSize: "16px", borderRadius: 10, background: C.input, color: C.text, border: `1px solid ${C.border}`, outline: "none" }}>
              <option value="cumulative">Cumulative</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>

        <Btn theme={C} v="primary" full onClick={handleSave} style={{ marginTop: 8 }}>
          {init ? "Save Changes" : "Create FD"}
        </Btn>
      </div>
    </Modal>
  );
};
