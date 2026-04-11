import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { FInput, FLabel } from "../../../components/ui/FInput.jsx";
import { Btn } from "../../../components/ui/Btn.jsx";
import { uid } from "../../../utils/id.js";
import { todayISO } from "../../../utils/format.js";

export const BondForm = ({ open, init, onClose, onSave, theme }) => {
  const C = theme;
  
  const [issuer, setIssuer] = useState("");
  const [name, setName] = useState("");
  const [faceValue, setFaceValue] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [couponRate, setCouponRate] = useState("");
  const [date, setDate] = useState(todayISO());
  const [maturityDate, setMaturityDate] = useState("");
  const [couponFrequency, setCouponFrequency] = useState("annual");
  
  useEffect(() => {
    if (init) {
      setIssuer(init.issuer || "");
      setName(init.name || "");
      setFaceValue(init.faceValue || "");
      setPurchasePrice(init.principal || init.purchasePrice || "");
      setCouponRate(init.couponRate || "");
      setDate(init.startDate || todayISO());
      setMaturityDate(init.maturityDate || "");
      setCouponFrequency(init.couponFrequency || "annual");
    } else {
      setIssuer("");
      setName("");
      setFaceValue("");
      setPurchasePrice("");
      setCouponRate("");
      setDate(todayISO());
      setMaturityDate("");
      setCouponFrequency("annual");
    }
  }, [init, open]);

  const handleSave = () => {
    if (!faceValue || !couponRate || !purchasePrice) return;
    const isNew = !init;
    const hId = init?.id || "hld_" + uid();
    const holding = {
      id: hId,
      type: "bond",
      name: name || `${issuer} Bond`,
      issuer,
      faceValue: parseFloat(faceValue),
      principal: parseFloat(purchasePrice),
      purchasePrice: parseFloat(purchasePrice),
      couponRate: parseFloat(couponRate),
      startDate: date,
      maturityDate,
      couponFrequency,
      createdAt: init?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    };
    
    let initialTx = null;
    if (isNew) {
      initialTx = {
        id: "itx_" + uid(),
        holdingId: hId,
        type: "buy",
        date: date,
        amount: parseFloat(purchasePrice),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };
    }
    
    onSave(holding, initialTx);
  };

  return (
    <Modal maxWidth={400} open={open} onClose={onClose} title={init ? "Edit Bond Holding" : "Add Bond"} theme={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <FLabel theme={C}>Issuer Name</FLabel>
          <FInput theme={C} value={issuer} onChange={e => setIssuer(e.target.value)} placeholder="e.g. RBI, NHAI, SGB" />
        </div>
        <div>
          <FLabel theme={C}>Custom Name (Optional)</FLabel>
          <FInput theme={C} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sovereign Gold Bond 2023" />
        </div>

        <div className="form-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <FLabel theme={C}>Face Value (₹)</FLabel>
            <FInput theme={C} type="number" value={faceValue} onChange={e => setFaceValue(e.target.value)} placeholder="10000" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
             <FLabel theme={C}>Coupon Rate (%)</FLabel>
             <FInput theme={C} type="number" step="0.01" value={couponRate} onChange={e => setCouponRate(e.target.value)} placeholder="7.5" />
          </div>
        </div>

        <div>
           <FLabel theme={C}>Purchase Price (₹)</FLabel>
           <FInput theme={C} type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="What you actually paid" />
        </div>

        <div className="form-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <FLabel theme={C}>Purchase Date</FLabel>
            <FInput theme={C} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
             <FLabel theme={C}>Maturity Date</FLabel>
             <FInput theme={C} type="date" value={maturityDate} onChange={e => setMaturityDate(e.target.value)} />
          </div>
        </div>

        <div>
           <FLabel theme={C}>Coupon Payouts</FLabel>
           <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
             {["annual", "semi-annual", "quarterly"].map(fq => (
               <button key={fq} onClick={() => setCouponFrequency(fq)} style={{ flex: 1, padding: "7px 4px", minHeight: 34, background: couponFrequency === fq ? C.primary : "transparent", color: couponFrequency === fq ? "#fff" : C.sub, border: `1px solid ${couponFrequency === fq ? C.primary : C.borderLight}`, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>{fq}</button>
             ))}
           </div>
        </div>

        <Btn theme={C} v="primary" full onClick={handleSave} style={{ marginTop: 4, minHeight: 40 }}>
          {init ? "Save Details" : "Add Bond"}
        </Btn>
      </div>
    </Modal>
  );
};
