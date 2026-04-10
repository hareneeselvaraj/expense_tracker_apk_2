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

// ── Main InvestApp Shell ─────────────────────────────────────────────────────
export default function InvestApp({ investData, setInvestData, onBackToExpense, theme }) {
  const [page, setPage] = useState("dashboard");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null); // e.g. { type: "fd", init: null }
  const [activeGoalForm, setActiveGoalForm] = useState(false);
  const [duplicateLotPrompt, setDuplicateLotPrompt] = useState(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const C = theme;

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
      window.location.reload();
    } else if (act === "sell") {
      alert("Please go to the Holdings tab and select a holding to record a sell transaction.");
    }
  };

  const handleSelectAssetType = (type) => {
    setPickerOpen(false);
    setActiveForm({ type, init: null });
  };

  const handleSaveGoal = (goal) => {
    const isNew = !investData.goals?.some(g => g.id === goal.id);
    setInvestData(prev => {
      const goals = prev.goals || [];
      return {
        ...prev,
        goals: isNew ? [goal, ...goals] : goals.map(g => g.id === goal.id ? goal : g)
      };
    });
    setActiveGoalForm(false);
  };

  const handleSaveHolding = (holding, initialTx, forceDuplicate = false) => {
    const isNew = !investData.holdings.some(h => h.id === holding.id);
    
    // Check for duplicate lot
    if (!forceDuplicate && isNew && holding.symbol) {
       const existingMatch = investData.holdings.find(h => !h.deleted && h.symbol === holding.symbol && h.type === holding.type);
       if (existingMatch) {
         setDuplicateLotPrompt({ pendingHolding: holding, pendingTx: initialTx, existingHolding: existingMatch });
         return;
       }
    }
    
    setInvestData(prev => {
      const newData = { ...prev };
      
      if (isNew) {
        newData.holdings = [holding, ...prev.holdings];
        if (initialTx) {
          newData.transactions = [initialTx, ...prev.transactions];
        }
      } else {
        newData.holdings = prev.holdings.map(h => h.id === holding.id ? holding : h);
      }
      return newData;
    });
    
    setActiveForm(null);
  };

  const handleDeleteHolding = (holdingId) => {
    if (window.confirm("Are you sure you want to delete this holding?")) {
      const now = new Date().toISOString();
      setInvestData(prev => ({
        ...prev,
        holdings: prev.holdings.map(h => h.id === holdingId ? { ...h, deleted: true, updatedAt: now } : h),
        transactions: prev.transactions.map(t => t.holdingId === holdingId ? { ...t, deleted: true, updatedAt: now } : t)
      }));
    }
  };

  const activeHoldings = (investData.holdings || []).filter(h => !h.deleted);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, paddingBottom: 100, maxWidth: 600, margin: "0 auto", position: "relative" }}>
      <InvestHeader theme={C} onOpenSettings={() => setPage("settings")} />

      <main>
        {page === "dashboard" && <InvestDashboard investData={investData} theme={C} onAddAsset={() => setPickerOpen(true)} onAddGoal={() => setActiveGoalForm({})} />}
        {page === "holdings" && (
          <HoldingsPage 
            investData={investData} 
            setInvestData={setInvestData}
            theme={C} 
            onEditHolding={h => setActiveForm({ type: h.type, init: h })}
            onDeleteHolding={h => handleDeleteHolding(h.id)}
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
      {activeForm?.type === "fd" && <FDForm open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHolding} theme={C} />}
      {activeForm?.type === "rd" && <RDForm open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHolding} theme={C} />}
      {activeForm?.type === "gold" && <GoldForm open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHolding} theme={C} />}
      {["ppf", "epf"].includes(activeForm?.type) && <GovtSchemeForm type={activeForm.type} open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHolding} theme={C} />}
      {activeForm?.type === "nps" && <NPSForm open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHolding} theme={C} />}
      {activeForm?.type === "bond" && <BondForm open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHolding} theme={C} />}
      
      {/* Live Asset Forms */}
      {["stock", "mf"].includes(activeForm?.type) && <LiveAssetForm type={activeForm.type} open={!!activeForm} init={activeForm.init} onClose={() => setActiveForm(null)} onSave={handleSaveHolding} theme={C} />}

      {/* Goal Form */}
      {activeGoalForm && <GoalForm open={true} init={Object.keys(activeGoalForm).length ? activeGoalForm : null} onClose={() => setActiveGoalForm(false)} onSave={handleSaveGoal} theme={C} holdings={investData.holdings} />}

      <Modal open={!!duplicateLotPrompt} onClose={() => setDuplicateLotPrompt(null)} title="Existing Holding Found" theme={C}>
        {duplicateLotPrompt && (
           <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
             <p style={{ color: C.text, fontSize: 13, lineHeight: "1.5" }}>
               You already have an active holding for <strong>{duplicateLotPrompt.pendingHolding.symbol}</strong>.
             </p>
             <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
               <Btn theme={C} v="primary" onClick={() => {
                 handleSaveHolding(duplicateLotPrompt.pendingHolding, duplicateLotPrompt.pendingTx, true);
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
    </div>
  );
}
