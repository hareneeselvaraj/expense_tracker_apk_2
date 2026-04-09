import React, { useState } from "react";
import { InvestHeader } from "./components/InvestHeader.jsx";
import { InvestBottomNav } from "./components/InvestBottomNav.jsx";

// Pages
import { InvestDashboard } from "./pages/InvestDashboard.jsx";
import { HoldingsPage } from "./pages/Holdings.jsx";
import { InvestReportsPage } from "./pages/InvestReports.jsx";
import { InvestSettingsPage } from "./pages/InvestSettings.jsx";

import { AssetTypePicker } from "./components/AssetTypePicker.jsx";
import { FDForm } from "./components/forms/FDForm.jsx";
import { RDForm } from "./components/forms/RDForm.jsx";
import { GoldForm } from "./components/forms/GoldForm.jsx";
import { GovtSchemeForm } from "./components/forms/GovtSchemeForm.jsx";
import { NPSForm } from "./components/forms/NPSForm.jsx";
import { BondForm } from "./components/forms/BondForm.jsx";

import { LiveAssetForm } from "./components/forms/LiveAssetForm.jsx";

// ── Main InvestApp Shell ─────────────────────────────────────────────────────
export default function InvestApp({ investData, setInvestData, onBackToExpense, theme }) {
  const [page, setPage] = useState("dashboard");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null); // e.g. { type: "fd", init: null }
  const C = theme;

  const handleFabClick = () => setPickerOpen(true);

  const handleSelectAssetType = (type) => {
    setPickerOpen(false);
    setActiveForm({ type, init: null });
  };

  const handleSaveHolding = (holding, initialTx) => {
    const isNew = !investData.holdings.some(h => h.id === holding.id);
    
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
      setInvestData(prev => ({
        ...prev,
        holdings: prev.holdings.map(h => h.id === holdingId ? { ...h, deleted: true, updatedAt: new Date().toISOString() } : h)
      }));
    }
  };

  const activeHoldings = (investData.holdings || []).filter(h => !h.deleted);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, paddingBottom: 100, maxWidth: 600, margin: "0 auto", position: "relative" }}>
      <InvestHeader theme={C} />

      <main>
        {page === "dashboard" && <InvestDashboard investData={investData} theme={C} />}
        {page === "holdings" && (
          <HoldingsPage 
            investData={investData} 
            theme={C} 
            onEditHolding={h => setActiveForm({ type: h.type, init: h })}
            onDeleteHolding={h => handleDeleteHolding(h.id)}
          />
        )}
        {page === "reports" && <InvestReportsPage investData={investData} theme={C} />}
        {page === "settings" && <InvestSettingsPage onBackToExpense={onBackToExpense} theme={C} />}
      </main>

      <InvestBottomNav page={page} setPage={setPage} theme={C} onFabClick={handleFabClick} />

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
    </div>
  );
}
