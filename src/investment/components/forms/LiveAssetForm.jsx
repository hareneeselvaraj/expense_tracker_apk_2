import React, { useState, useEffect, useRef } from "react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { FInput, FLabel } from "../../../components/ui/FInput.jsx";
import { Btn } from "../../../components/ui/Btn.jsx";
import { uid } from "../../../utils/id.js";
import { todayISO, fmtAmt } from "../../../utils/format.js";
import { getLivePriceSmart } from "../../services/priceEngine.js";

// Form for Stock and Mutual Fund (Assets requiring live pricing)
export const LiveAssetForm = ({ open, init, type, onClose, onSave, theme }) => {
  const C = theme;
  
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [date, setDate] = useState(todayISO());
  
  // SIP details (MF mostly)
  const [sipAmount, setSipAmount] = useState("");
  const [sipDay, setSipDay] = useState("");
  
  // Live Price State
  const [livePrice, setLivePrice] = useState(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [manualPriceMode, setManualPriceMode] = useState(false);
  const [manualPrice, setManualPrice] = useState("");
  const [fetchError, setFetchError] = useState("");

  const isStock = type === "stock";

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, [open]);

  const userTouchedRef = useRef(false);

  useEffect(() => {
    if (init && open) {
      userTouchedRef.current = false;
      setSymbol(init.symbol || "");
      setName(init.name || "");
      setQty(init.qty || "");
      setPurchasePrice(init.purchasePrice || "");
      setDate(init.startDate || todayISO());
      setSipAmount(init.sipAmount || "");
      setSipDay(init.sipDay || "");
      
      const isManual = init.priceSource === "manual";
      if (init.currentPrice) {
        setManualPriceMode(isManual);
        setManualPrice(init.currentPrice.toString());
      }
      
      // Auto-refresh live price in background if it wasn't a manual override
      if (init.symbol && !isManual) {
        getLivePriceSmart(init.symbol, { force: true }).then(p => {
          if (!mounted.current) return;
          if (p && !userTouchedRef.current) {
            setLivePrice(p);
            setManualPriceMode(false);
            setManualPrice("");
          }
        }).catch(() => {});
      }
    } else {
      setSymbol("");
      setName("");
      setQty("");
      setPurchasePrice("");
      setDate(todayISO());
      setSipAmount("");
      setSipDay("");
      setLivePrice(null);
      setManualPriceMode(false);
      setManualPrice("");
      setFetchError("");
    }
  }, [init, open]);

  const verifyLivePrice = async () => {
    const clean = String(symbol || "").trim().toUpperCase();
    if (!clean) return;
    setSymbol(clean); // sync back normalized
    setFetchError("");
    setIsFetchingPrice(true);
    setLivePrice(null);
    try {
      const price = await getLivePriceSmart(clean, { force: true });
      if (!mounted.current) return;
      if (price) {
        setLivePrice(price);
        setManualPriceMode(false);
        setManualPrice(""); // clear stale manual value
      } else {
        setFetchError(`No price found for "${clean}". Check ticker (add .NS for NSE)`);
        setManualPriceMode(true);
      }
    } catch (e) {
      setFetchError(`Live price unavailable (${e.details?.[0] || e.message}). Enter manually.`);
      setManualPriceMode(true);
    }
    setIsFetchingPrice(false);
  };

  const currentPrice = manualPriceMode ? parseFloat(manualPrice) : livePrice;
  const totalCost = (parseFloat(qty) || 0) * (parseFloat(purchasePrice) || 0);

  const priceNum = Number(currentPrice);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 0;

  const handleSave = () => {
    if (!symbol || !qty || !purchasePrice || !priceValid) return;

    const isNew = !init;
    const hId = init?.id || "hld_" + uid();
    const holding = {
      id: hId,
      type,
      symbol,
      name: name || (isStock ? `${symbol} Stock` : `${symbol} MF`),
      qty: parseFloat(qty),
      purchasePrice: parseFloat(purchasePrice),
      principal: totalCost,
      currentPrice: parseFloat(currentPrice),
      startDate: date,
      priceSource: manualPriceMode ? "manual" : "live",
      sipAmount: parseFloat(sipAmount) || 0,
      sipDay: parseInt(sipDay, 10) || 0,
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
        amount: totalCost,
        qty: parseFloat(qty),
        price: parseFloat(purchasePrice),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };
    }
    
    onSave(holding, initialTx);
  };

  return (
    <Modal maxWidth={400} open={open} onClose={onClose} title={init ? `Edit ${isStock ? "Stock" : "Mutual Fund"}` : `Add ${isStock ? "Stock" : "Mutual Fund"}`} theme={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <FLabel theme={C}>{isStock ? "Stock Ticker (e.g. RELIANCE.NS)" : "MF Name or ISIN (e.g. INF846K01EW2)"}</FLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <FInput theme={C} value={symbol} onChange={e => setSymbol(e.target.value)} placeholder={isStock ? "TCS.NS" : "ISIN code..."} />
            </div>
            <Btn theme={C} v="soft" onClick={verifyLivePrice} disabled={isFetchingPrice || !symbol}>
              {isFetchingPrice ? "⏳ ..." : livePrice && !fetchError ? "✓ Refresh" : (fetchError ? "↻ Retry" : "Verify")}
            </Btn>
          </div>
          {fetchError && <div style={{ color: C.expense, fontSize: 11, marginTop: 4 }}>{fetchError}</div>}
        </div>

        <div>
           <FLabel theme={C}>Custom Name (Optional)</FLabel>
           <FInput theme={C} value={name} onChange={e => setName(e.target.value)} placeholder="Will use symbol if blank" />
        </div>

        {livePrice && !manualPriceMode && (
          <div style={{ background: C.primary + "18", border: `1px solid ${C.primary}33`, borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>VERIFIED LIVE PRICE</div>
              <div style={{ fontSize: 16, color: C.text, fontWeight: 800 }}>{fmtAmt(livePrice)}</div>
            </div>
            <button onClick={() => setManualPriceMode(true)} style={{ background: "transparent", border: "none", color: C.primary, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "6px 0", minHeight: 32 }}>Edit Manually</button>
          </div>
        )}

        {manualPriceMode && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
              <FLabel theme={C}>Current Price (₹)</FLabel>
              {livePrice && <button onClick={() => setManualPriceMode(false)} style={{ background: "none", border: "none", color: C.primary, fontSize: 11, cursor: "pointer", padding: "4px 0", minHeight: 28 }}>Use Live ({fmtAmt(livePrice)})</button>}
            </div>
            <FInput theme={C} type="number" value={manualPrice} onChange={e => { userTouchedRef.current = true; setManualPrice(e.target.value); }} placeholder="Current market price" />
          </div>
        )}

        <div className="form-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <FLabel theme={C}>{isStock ? "Qty" : "Units"}</FLabel>
            <FInput theme={C} type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)} placeholder="10" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
             <FLabel theme={C}>Avg Price (₹)</FLabel>
             <FInput theme={C} type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="Cost" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
             <FLabel theme={C}>Buy Date</FLabel>
             <FInput theme={C} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {!isStock && (
          <div style={{ background: C.input, borderRadius: 14, border: `1px solid ${C.borderLight}`, padding: 12 }}>
             <FLabel theme={C}>SIP Settings (Optional)</FLabel>
             <div className="form-row" style={{ marginTop: 8 }}>
               <div style={{ flex: 1, minWidth: 0 }}>
                 <FInput theme={C} type="number" value={sipAmount} onChange={e => setSipAmount(e.target.value)} placeholder="SIP Amount (₹)" />
               </div>
               <div style={{ flex: 1, minWidth: 80 }}>
                 <FInput theme={C} type="number" value={sipDay} onChange={e => setSipDay(e.target.value)} placeholder="Day (1-31)" />
               </div>
             </div>
          </div>
        )}

        {qty && purchasePrice && (
          <div style={{ fontSize: 13, color: C.sub, textAlign: "right", padding: "4px 0" }}>
            Total Cost: <strong style={{ color: C.text }}>₹{totalCost.toFixed(2)}</strong>
          </div>
        )}

        <Btn theme={C} v="primary" full onClick={handleSave} style={{ marginTop: 4, minHeight: 40 }} disabled={!priceValid || !qty || !purchasePrice}>
          {init ? "Save Details" : `Add ${isStock ? "Stock" : "Fund"}`}
        </Btn>
      </div>
    </Modal>
  );
};
