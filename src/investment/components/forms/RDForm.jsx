import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { FInput, FLabel } from "../../../components/ui/FInput.jsx";
import { Btn } from "../../../components/ui/Btn.jsx";
import { uid } from "../../../utils/id.js";
import { todayISO } from "../../../utils/format.js";

export const RDForm = ({ open, init, onClose, onSave, theme }) => {
  const C = theme;
  
  const [bank, setBank] = useState("");
  const [name, setName] = useState("");
  const [installment, setInstallment] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [tenureMonths, setTenureMonths] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  
  useEffect(() => {
    if (init) {
      setBank(init.bank || "");
      setName(init.name || "");
      setInstallment(init.installment || "");
      setInterestRate(init.interestRate || "");
      setStartDate(init.startDate || todayISO());
      setMaturityDate(init.maturityDate || "");
      setDayOfMonth(init.dayOfMonth || "1");
      setTenureMonths(init.tenureMonths || "");
    } else {
      setBank("");
      setName("");
      setInstallment("");
      setInterestRate("");
      setStartDate(todayISO());
      setTenureMonths("");
      setMaturityDate("");
      setDayOfMonth("1");
    }
  }, [init, open]);

  useEffect(() => {
    if (startDate && tenureMonths) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + parseInt(tenureMonths, 10));
      setMaturityDate(d.toISOString().split("T")[0]);
    }
  }, [startDate, tenureMonths]);

  const handleSave = () => {
    if (!installment || !startDate) return;
    const isNew = !init;
    const hId = init?.id || "hld_" + uid();
    const holding = {
      id: hId,
      type: "rd",
      name: name || `${bank} RD`,
      bank,
      principal: 0, // Gets updated as installments are made
      installment: parseFloat(installment),
      interestRate: parseFloat(interestRate || 0),
      startDate,
      maturityDate,
      dayOfMonth: parseInt(dayOfMonth, 10),
      tenureMonths: parseInt(tenureMonths, 10) || 0,
      createdAt: init?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    };
    
    // Initial deposit for an RD is just the first installment if new
    let initialTx = null;
    if (isNew) {
      initialTx = {
        id: "itx_" + uid(),
        holdingId: hId,
        type: "sip", // Systematic
        date: startDate,
        amount: parseFloat(installment),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };
      
      // Credit first installment to principal immediately
      holding.principal = parseFloat(installment);
    } else {
      holding.principal = init.principal;
    }
    
    onSave(holding, initialTx);
  };

  return (
    <Modal maxWidth={400} open={open} onClose={onClose} title={init ? "Edit Recurring Deposit" : "Add Recurring Deposit"} theme={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <FLabel theme={C}>Bank Name</FLabel>
          <FInput theme={C} value={bank} onChange={e => setBank(e.target.value)} placeholder="e.g. SBI" />
        </div>
        <div>
          <FLabel theme={C}>Custom Name (Optional)</FLabel>
          <FInput theme={C} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 5-Yr RD" />
        </div>

        <div className="form-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <FLabel theme={C}>Monthly Installment (₹)</FLabel>
            <FInput theme={C} type="number" value={installment} onChange={e => setInstallment(e.target.value)} placeholder="5000" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FLabel theme={C}>Interest Rate (%)</FLabel>
            <FInput theme={C} type="number" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="6.5" />
          </div>
        </div>

        <div className="form-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <FLabel theme={C}>Start Date</FLabel>
            <FInput theme={C} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FLabel theme={C}>Debit Day (1-28)</FLabel>
            <FInput theme={C} type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} placeholder="1" />
          </div>
        </div>

        <div className="form-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <FLabel theme={C}>Tenure (Months)</FLabel>
            <FInput theme={C} type="number" value={tenureMonths} onChange={e => setTenureMonths(e.target.value)} placeholder="60" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FLabel theme={C}>Maturity Date</FLabel>
            <FInput theme={C} type="date" value={maturityDate} onChange={e => setMaturityDate(e.target.value)} />
          </div>
        </div>

        <Btn theme={C} v="primary" full onClick={handleSave} style={{ marginTop: 4, minHeight: 40 }}>
          {init ? "Save Changes" : "Create RD"}
        </Btn>
      </div>
    </Modal>
  );
};
