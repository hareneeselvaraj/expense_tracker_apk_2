import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { FInput, FLabel } from "../../../components/ui/FInput.jsx";
import { Btn } from "../../../components/ui/Btn.jsx";
import { uid } from "../../../utils/id.js";
import { todayISO } from "../../../utils/format.js";

export const GovtSchemeForm = ({ open, init, type, onClose, onSave, theme }) => {
  const C = theme;
  
  const [name, setName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  
  const title = type === "ppf" ? "Public Provident Fund (PPF)" : "Employee Provident Fund (EPF)";
  const shortName = type === "ppf" ? "PPF" : "EPF";
  
  useEffect(() => {
    if (init) {
      setName(init.name || "");
      setAccountNo(init.accountNo || "");
      setCurrentBalance(init.principal || "");
      setStartDate(init.startDate || todayISO());
    } else {
      setName("");
      setAccountNo("");
      setCurrentBalance("");
      setStartDate(todayISO());
    }
  }, [init, open]);

  const handleSave = () => {
    if (!currentBalance) return;
    const isNew = !init;
    const hId = init?.id || "hld_" + uid();
    const holding = {
      id: hId,
      type, // 'ppf' or 'epf'
      name: name || `${shortName} Account`,
      accountNo,
      principal: parseFloat(currentBalance), // for these, principal tracking acts as the base corpus
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
        amount: parseFloat(currentBalance),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };
    }
    
    onSave(holding, initialTx);
  };

  return (
    <Modal maxWidth={420} open={open} onClose={onClose} title={init ? `Edit ${shortName}` : `Add ${title}`} theme={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <FLabel theme={C}>Custom Name (Optional)</FLabel>
          <FInput theme={C} value={name} onChange={e => setName(e.target.value)} placeholder={`e.g. My ${shortName}`} />
        </div>
        
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>{shortName} Account Number</FLabel>
            <FInput theme={C} value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder={type === 'ppf' ? "Account number" : "UAN number"} />
          </div>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>Current Balance (₹)</FLabel>
            <FInput theme={C} type="number" value={currentBalance} onChange={e => setCurrentBalance(e.target.value)} placeholder="Total accumulated" />
          </div>
        </div>

        <div>
           <FLabel theme={C}>Account Start Date</FLabel>
           <FInput theme={C} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>

        <Btn theme={C} v="primary" full onClick={handleSave} style={{ marginTop: 8 }}>
          {init ? "Save Details" : `Add ${shortName}`}
        </Btn>
      </div>
    </Modal>
  );
};
