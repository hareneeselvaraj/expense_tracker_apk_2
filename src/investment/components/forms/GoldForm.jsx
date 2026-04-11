import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal.jsx";
import { FInput, FLabel } from "../../../components/ui/FInput.jsx";
import { Btn } from "../../../components/ui/Btn.jsx";
import { uid } from "../../../utils/id.js";
import { todayISO, fmtAmt } from "../../../utils/format.js";
import { fetchGoldPricePerGram } from "../../services/priceEngine.js";

export const GoldForm = ({ open, init, onClose, onSave, theme }) => {
  const C = theme;
  
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [date, setDate] = useState(todayISO());
  const [purity, setPurity] = useState("24k");

  // Live gold price state
  const [liveGold, setLiveGold] = useState(null); // { pricePerGram, pricePerGram24k, usdInr }
  const [isFetchingGold, setIsFetchingGold] = useState(false);
  const [goldError, setGoldError] = useState("");
  const [manualCurrentPrice, setManualCurrentPrice] = useState("");
  const [manualMode, setManualMode] = useState(false);
  
  useEffect(() => {
    if (init) {
      setName(init.name || "");
      setGrams(init.grams || "");
      setPurchasePrice(init.principal || init.purchasePrice || "");
      setDate(init.startDate || todayISO());
      setPurity(init.purity || "24k");
      if (init.currentPricePerGram) {
        setManualCurrentPrice(init.currentPricePerGram.toString());
        setManualMode(true);
      }
    } else {
      setName("");
      setGrams("");
      setPurchasePrice("");
      setDate(todayISO());
      setPurity("24k");
      setLiveGold(null);
      setGoldError("");
      setManualCurrentPrice("");
      setManualMode(false);
    }
  }, [init, open]);

  // (Removed problematic useEffect for purity recalculation)

  const fetchPrice = async () => {
    setIsFetchingGold(true);
    setGoldError("");
    try {
      const result = await fetchGoldPricePerGram(purity);
      if (result) {
        setLiveGold(result);
        setManualMode(false);
      } else {
        setGoldError("Could not fetch gold price. Enter manually.");
        setManualMode(true);
      }
    } catch (e) {
      setGoldError("Gold price fetch failed.");
      setManualMode(true);
    }
    setIsFetchingGold(false);
  };

  // Use dynamically calculated price based on purity
  const displayLiveGold = React.useMemo(() => {
    if (!liveGold) return null;
    const PURITY_MAP = { "24k": 0.999, "22k": 0.916, "18k": 0.750 };
    const mult = PURITY_MAP[purity] || 1;
    return {
      ...liveGold,
      pricePerGram: Math.round(liveGold.pricePerGram24k * mult)
    };
  }, [liveGold, purity]);

  const currentPricePerGram = manualMode ? parseFloat(manualCurrentPrice) || 0 : (displayLiveGold?.pricePerGram || 0);
  const gramsNum = parseFloat(grams) || 0;
  const currentValue = gramsNum * currentPricePerGram;
  const totalCost = parseFloat(purchasePrice) || 0;
  const gainLoss = currentPricePerGram > 0 ? currentValue - totalCost : 0;

  const handleSave = () => {
    if (!grams || !purchasePrice) return;
    const isNew = !init;
    const hId = init?.id || "hld_" + uid();
    const holding = {
      id: hId,
      type: "gold",
      name: name || `Physical Gold (${purity})`,
      grams: gramsNum,
      qty: gramsNum, // for dashboard bucket calculation
      purity,
      principal: totalCost, 
      purchasePrice: totalCost,
      currentPrice: currentPricePerGram || 0, // per-gram price — dashboard uses qty * currentPrice
      currentPricePerGram: currentPricePerGram || 0,
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
        qty: gramsNum,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      };
    }
    
    onSave(holding, initialTx);
  };

  return (
    <Modal maxWidth={480} open={open} onClose={onClose} title={init ? "Edit Gold Holding" : "Add Physical Gold"} theme={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <FLabel theme={C}>Item Name / Jeweller</FLabel>
          <FInput theme={C} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gold Coins, Malabar..." />
        </div>

        <div className="form-row">
          <div style={{ flex: 1, minWidth: 130 }}>
            <FLabel theme={C}>Weight (Grams)</FLabel>
            <FInput theme={C} type="number" step="0.01" value={grams} onChange={e => setGrams(e.target.value)} placeholder="10.5" />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <FLabel theme={C}>Purity</FLabel>
            <select value={purity} onChange={e => setPurity(e.target.value)} className="form-select" style={{ width: "100%", padding: "10px 12px", fontSize: 16, borderRadius: 12, background: C.input, color: C.text, border: `1px solid ${C.border}`, outline: "none", minHeight: 44, boxSizing: "border-box" }}>
              <option value="24k">24K (99.9%)</option>
              <option value="22k">22K (91.6%)</option>
              <option value="18k">18K (75.0%)</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div style={{ flex: 1, minWidth: 130 }}>
            <FLabel theme={C}>Purchase Price (₹)</FLabel>
            <FInput theme={C} type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="Total cost paid" />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <FLabel theme={C}>Purchase Date</FLabel>
            <FInput theme={C} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {/* Live Gold Price Section */}
        <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <FLabel theme={C} style={{ margin: 0 }}>Today's Gold Rate</FLabel>
            <Btn theme={C} v="soft" onClick={fetchPrice} disabled={isFetchingGold} style={{ padding: "6px 12px", fontSize: 12, minHeight: 36 }}>
              {isFetchingGold ? "Fetching..." : liveGold ? "Refresh" : "Get Live Price"}
            </Btn>
          </div>

          {goldError && <div style={{ color: C.expense, fontSize: 12, marginBottom: 8 }}>{goldError}</div>}

          {displayLiveGold && !manualMode && (
            <div style={{ background: "#fbbf2415", border: "1px solid #fbbf2433", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>LIVE {purity.toUpperCase()} GOLD</div>
                  <div style={{ fontSize: 18, color: C.text, fontWeight: 800 }}>₹{displayLiveGold.pricePerGram.toLocaleString()}<span style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>/gram</span></div>
                </div>
                <button onClick={() => setManualMode(true)} style={{ background: "transparent", border: "none", color: C.primary, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "6px 0", minHeight: 32 }}>Edit</button>
              </div>
              {displayLiveGold.usdInr && (
                <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>
                  24K base: ₹{displayLiveGold.pricePerGram24k}/g | USD/INR: {displayLiveGold.usdInr}
                </div>
              )}
            </div>
          )}

          {manualMode && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                <FLabel theme={C}>Current Price/Gram (₹)</FLabel>
                {displayLiveGold && <button onClick={() => setManualMode(false)} style={{ background: "none", border: "none", color: C.primary, fontSize: 11, cursor: "pointer", fontWeight: 700, padding: "4px 0", minHeight: 28 }}>Use Live (₹{displayLiveGold.pricePerGram})</button>}
              </div>
              <FInput theme={C} type="number" value={manualCurrentPrice} onChange={e => setManualCurrentPrice(e.target.value)} placeholder="₹/gram today" />
            </div>
          )}
        </div>

        {/* Valuation Summary */}
        {gramsNum > 0 && currentPricePerGram > 0 && (
          <div style={{ background: C.input, borderRadius: 14, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ color: C.sub, fontSize: 11, fontWeight: 600 }}>Current Value</div>
              <div style={{ color: C.text, fontSize: 16, fontWeight: 800 }}>{fmtAmt(currentValue)}</div>
            </div>
            {totalCost > 0 && (
              <div style={{ textAlign: "right" }}>
                <div style={{ color: C.sub, fontSize: 11, fontWeight: 600 }}>Gain/Loss</div>
                <div style={{ color: gainLoss >= 0 ? C.income : C.expense, fontSize: 14, fontWeight: 800 }}>
                  {gainLoss > 0 ? "+" : ""}{fmtAmt(gainLoss)}
                </div>
              </div>
            )}
          </div>
        )}

        <Btn theme={C} v="primary" full onClick={handleSave} style={{ marginTop: 4, minHeight: 48 }}>
          {init ? "Save Details" : "Add Gold"}
        </Btn>
      </div>
    </Modal>
  );
};
