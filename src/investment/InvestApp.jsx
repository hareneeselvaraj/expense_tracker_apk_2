import React, { useState } from "react";
import { InvestHeader } from "./components/InvestHeader.jsx";
import { InvestBottomNav } from "./components/InvestBottomNav.jsx";

// Pages
import { InvestDashboard } from "./pages/InvestDashboard.jsx";
import { HoldingsPage } from "./pages/Holdings.jsx";
import { InsightsPage } from "./pages/Insights.jsx";
import { InvestSettingsPage } from "./pages/InvestSettings.jsx";
import { GoalsPage } from "./pages/Goals.jsx";

import { AssetTypePicker } from "./components/AssetTypePicker.jsx";
import { FDForm } from "./components/forms/FDForm.jsx";
import { RDForm } from "./components/forms/RDForm.jsx";
import { GoldForm } from "./components/forms/GoldForm.jsx";
import { GovtSchemeForm } from "./components/forms/GovtSchemeForm.jsx";
import { NPSForm } from "./components/forms/NPSForm.jsx";
import { BondForm } from "./components/forms/BondForm.jsx";

import { LiveAssetForm } from "./components/forms/LiveAssetForm.jsx";
import { GoalForm } from "./components/forms/GoalForm.jsx";
import { QuickActionsMenu } from "./components/QuickActionsMenu.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Btn } from "../components/ui/Btn.jsx";

// Hooks
import { useInvestData } from "./hooks/useInvestData.js";
import { useConfirm } from "./hooks/useConfirm.js";
import { selectActiveHoldings } from "./utils/selectors.js";

// ── Main InvestApp Shell ─────────────────────────────────────────────────────
export default function InvestApp({ investData, setInvestData, onBackToExpense, theme }) {
  const [page, setPage] = useState("dashboard");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const [activeGoalForm, setActiveGoalForm] = useState(null);
  const [duplicateLotPrompt, setDuplicateLotPrompt] = useState(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const C = theme;

  const { saveHolding, deleteHolding, saveGoal, deleteGoal } = useInvestData(investData, setInvestData);
  const delConfirm = useConfirm();

  const handleFabClick = () => setPickerOpen(true);
  const handleFabLongPress = () => setQuickActionsOpen(true);
  
  const handleQuickAction = (act) => {
    setQuickActionsOpen(false);
    if (act === "add") setPickerOpen(true);
    else if (act === "goal") setActiveGoalForm({});
    else if (act === "refresh") {
      const symbols = (investData?.holdings || []).map(h => h.symbol).filter(Boolean);
      symbols.forEach(s => localStorage.removeItem(`price_cache_${s}`));
      localStorage.removeItem(`gold_price_cache`);
      setInvestData(prev => ({ ...prev }));
      setRefreshKey(k => k + 1);
    } else if (act === "sell") {
      setPage("holdings");
    }
  };

  const handleSelectAssetType = (type) => {
    setPickerOpen(false);
    setActiveForm({ type, init: null });
  };

  const handleSaveGoalWithClose = (goal) => {
    saveGoal(goal);
    setActiveGoalForm(null);
  };

  const handleSaveHoldingEx = (holding, initialTx, forceDuplicate = false) => {
    const isNewCheck = !(investData.holdings || []).some(h => h.id === holding.id);
    
    if (!forceDuplicate && isNewCheck && holding.symbol) {
       const existingMatch = (investData.holdings || []).find(h => !h.deleted && h.symbol === holding.symbol && h.type === holding.type);
       if (existingMatch) {
         setDuplicateLotPrompt({ pendingHolding: holding, pendingTx: initialTx, existingHolding: existingMatch });
         return;
       }
    }
    
    saveHolding(holding, initialTx);
    setActiveForm(null);
  };

  const handleDeleteRequest = (holdingId) => {
    delConfirm.confirm("Delete Holding", "Are you sure you want to delete this holding?", () => deleteHolding(holdingId));
  };


  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, paddingBottom: 100, maxWidth: 600, margin: "0 auto", position: "relative" }}>
      <InvestHeader theme={C} onOpenSettings={() => setPage("settings")} />

      <main key={refreshKey}>
        {page === "dashboard" && <InvestDashboard investData={investData} theme={C} onAddAsset={() => setPickerOpen(true)} onAddGoal={() => setActiveGoalForm({})} />}
        {page === "holdings" && (
          <HoldingsPage 
            investData={investData} 
            setInvestData={setInvestData}
            theme={C} 
            onEditHolding={h => setActiveForm({ type: h.type, init: h })}
            onDeleteHolding={h => handleDeleteRequest(h.id)}
          />
        )}
        {page === "insights" && <InsightsPage investData={investData} theme={C} />}
        {page === "goals" && <GoalsPage investData={investData} theme={C} onAddGoal={() => setActiveGoalForm({})} onEditGoal={(g) => setActiveGoalForm(g)} />}
        {page === "settings" && <InvestSettingsPage investData={investData} setInvestData={setInvestData} onBackToExpense={onBackToExpense} theme={C} />}
      </main>

      <InvestBottomNav 
        page={page} 
        setPage={setPage} 
        theme={C} 
        onFabClick={handleFabClick} 
        onFabLongPress={handleFabLongPress} 
      />

      <QuickActionsMenu 
        open={quickActionsOpen} 
        onClose={() => setQuickActionsOpen(false)} 
        onAction={handleQuickAction} 
        theme={C} 
      />

      <AssetTypePicker 
        open={pickerOpen} 
        onClose={() => setPickerOpen(false)} 
        onSelect={handleSelectAssetType} 
        theme={C} 
      />

      {/* Manual Forms Routing */}
      {activeForm?.type === "fd" && <FDForm open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHoldingEx} theme={C} />}
      {activeForm?.type === "rd" && <RDForm open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHoldingEx} theme={C} />}
      {activeForm?.type === "gold" && <GoldForm open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHoldingEx} theme={C} />}
      {["ppf", "epf"].includes(activeForm?.type) && <GovtSchemeForm type={activeForm.type} open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHoldingEx} theme={C} />}
      {activeForm?.type === "nps" && <NPSForm open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHoldingEx} theme={C} />}
      {activeForm?.type === "bond" && <BondForm open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHoldingEx} theme={C} />}
      
      {/* Live Asset Forms */}
      {["stock", "mf"].includes(activeForm?.type) && <LiveAssetForm type={activeForm.type} open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHoldingEx} theme={C} />}

      {/* Goal Form */}
      {activeGoalForm && <GoalForm open={true} init={Object.keys(activeGoalForm).length ? activeGoalForm : null} onClose={() => setActiveGoalForm(false)} onSave={handleSaveGoalWithClose} theme={C} holdings={investData.holdings || []} />}

      <Modal open={!!duplicateLotPrompt} onClose={() => setDuplicateLotPrompt(null)} title="Existing Holding Found" theme={C}>
        {duplicateLotPrompt && (
           <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
             <p style={{ color: C.text, fontSize: 13, lineHeight: "1.5" }}>
               You already have an active holding for <strong>{duplicateLotPrompt.pendingHolding.symbol}</strong>.
             </p>
             <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
               <Btn theme={C} v="primary" onClick={() => {
                 handleSaveHoldingEx(duplicateLotPrompt.pendingHolding, duplicateLotPrompt.pendingTx, true);
                 setDuplicateLotPrompt(null);
               }}>
                 Add as New Lot
               </Btn>
               <Btn theme={C} v="soft" onClick={() => {
                 setDuplicateLotPrompt(null);
                 setActiveForm({ type: duplicateLotPrompt.existingHolding.type, init: duplicateLotPrompt.existingHolding });
               }}>
                 Update Existing
               </Btn>
               <Btn theme={C} v="soft" onClick={() => setDuplicateLotPrompt(null)} style={{ background: "transparent", border: "none" }}>
                 Cancel
               </Btn>
             </div>
           </div>
        )}
      </Modal>

      <Modal open={!!delConfirm.state} onClose={delConfirm.close} title={delConfirm.state?.title} theme={C}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ color: C.text, fontSize: 13, lineHeight: "1.5" }}>{delConfirm.state?.message}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Btn theme={C} v="primary" onClick={delConfirm.handleConfirm}>Confirm</Btn>
            <Btn theme={C} v="soft" onClick={delConfirm.close} style={{ background: "transparent" }}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
