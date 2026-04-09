import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { FInput, FLabel } from "../../../components/ui/FInput.jsx";
import { Btn } from "../../../components/ui/Btn.jsx";
import { uid } from "../../../utils/id.js";
import { todayISO } from "../../../utils/format.js";
import { getLivePriceSmart } from "../../services/priceEngine.js";

// Form for Stock and Mutual Fund (Assets requiring live pricing)
export const LiveAssetForm = ({ open, init, type, onClose, onSave, theme }) => {
  const C = theme;
  
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [date, setDate] = useState(todayISO());
  
  // Live Price State
  const [livePrice, setLivePrice] = useState(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [manualPriceMode, setManualPriceMode] = useState(false);
  const [manualPrice, setManualPrice] = useState("");
  const [fetchError, setFetchError] = useState("");

  const isStock = type === "stock";

  useEffect(() => {
    if (init) {
      setSymbol(init.symbol || "");
      setName(init.name || "");
      setQty(init.qty || "");
      setPurchasePrice(init.purchasePrice || "");
      setDate(init.startDate || todayISO());
      
      if (init.currentPrice) {
        setManualPriceMode(true);
        setManualPrice(init.currentPrice.toString());
      }
    } else {
      setSymbol("");
      setName("");
      setQty("");
      setPurchasePrice("");
      setDate(todayISO());
      setLivePrice(null);
      setManualPriceMode(false);
      setManualPrice("");
      setFetchError("");
    }
  }, [init, open]);

  const verifyLivePrice = async () => {
    if (!symbol) return;
    setFetchError("");
    setIsFetchingPrice(true);
    try {
      const price = await getLivePriceSmart(symbol);
      if (price) {
        setLivePrice(price);
        setManualPriceMode(false);
      } else {
        setFetchError("Could not fetch live price. Please enter manually.");
        setManualPriceMode(true);
      }
    } catch (e) {
      setFetchError("Live price fetch failed.");
      setManualPriceMode(true);
    }
    setIsFetchingPrice(false);
  };

  const currentPrice = manualPriceMode ? parseFloat(manualPrice) : livePrice;
  const totalCost = (parseFloat(qty) || 0) * (parseFloat(purchasePrice) || 0);

  const handleSave = () => {
    if (!symbol || !qty || !purchasePrice) return;
    if (!currentPrice && currentPrice !== 0) return;

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
    <Modal open={open} onClose={onClose} title={init ? `Edit ${isStock ? "Stock" : "Mutual Fund"}` : `Add ${isStock ? "Stock" : "Mutual Fund"}`} theme={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <FLabel theme={C}>{isStock ? "Stock Ticker (e.g. RELIANCE.NS)" : "MF Name or ISIN (e.g. INF846K01EW2)"}</FLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <FInput theme={C} value={symbol} onChange={e => setSymbol(e.target.value)} placeholder={isStock ? "TCS.NS" : "ISIN code..."} />
            <Btn theme={C} v="soft" onClick={verifyLivePrice} disabled={isFetchingPrice || !symbol}>
              {isFetchingPrice ? "Wait..." : "Verify"}
            </Btn>
          </div>
          {fetchError && <div style={{ color: C.expense, fontSize: 11, marginTop: 4 }}>{fetchError}</div>}
        </div>

        <div>
           <FLabel theme={C}>Custom Name (Optional)</FLabel>
           <FInput theme={C} value={name} onChange={e => setName(e.target.value)} placeholder="Will use symbol if blank" />
        </div>

        {livePrice && !manualPriceMode && (
          <div style={{ background: C.primary + "18", border: `1px solid ${C.primary}33`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>VERIFIED LIVE PRICE</div>
              <div style={{ fontSize: 16, color: C.text, fontWeight: 800 }}>₹{livePrice}</div>
            </div>
            <button onClick={() => setManualPriceMode(true)} style={{ background: "transparent", border: "none", color: C.primary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Edit Manually</button>
          </div>
        )}

        {manualPriceMode && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <FLabel theme={C}>Current Price (₹)</FLabel>
              {livePrice && <button onClick={() => setManualPriceMode(false)} style={{ background: "none", border: "none", color: C.primary, fontSize: 10, cursor: "pointer" }}>Use Live Price ({livePrice})</button>}
            </div>
            <FInput theme={C} type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="Current market price" />
          </div>
        )}
        
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FLabel theme={C}>{isStock ? "Quantity" : "Units"}</FLabel>
            <FInput theme={C} type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)} placeholder="10" />
          </div>
          <div style={{ flex: 1 }}>
             <FLabel theme={C}>Avg Purchase Price (₹)</FLabel>
             <FInput theme={C} type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="Per unit cost" />
          </div>
        </div>

        <div>
           <FLabel theme={C}>Purchase Date</FLabel>
           <FInput theme={C} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {qty && purchasePrice && (
          <div style={{ fontSize: 12, color: C.sub, textAlign: "right" }}>
            Total Cost: <strong style={{ color: C.text }}>₹{totalCost.toFixed(2)}</strong>
          </div>
        )}

        <Btn theme={C} v="primary" full onClick={handleSave} style={{ marginTop: 8 }} disabled={!currentPrice && currentPrice !== 0}>
          {init ? "Save Details" : `Add ${isStock ? "Stock" : "Fund"}`}
        </Btn>
      </div>
    </Modal>
  );
};
