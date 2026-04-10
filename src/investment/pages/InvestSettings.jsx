import React from "react";
import { Btn } from "../../components/ui/Btn.jsx";
import { FLabel } from "../../components/ui/FInput.jsx";

export const InvestSettingsPage = ({ investData, setInvestData, onBackToExpense, theme }) => {
  const C = theme;
  const prefs = investData.prefs || {
    defaultExchange: "NS",
    displayCurrency: "INR",
    targetAllocation: { equity: 60, debt: 30, gold: 10, cash: 0 },
    xirrAssumption: 12,
    refreshMode: "manual"
  };

  const updatePrefs = (updates) => {
    setInvestData(prev => ({
      ...prev,
      prefs: { ...(prev.prefs || prefs), ...updates }
    }));
  };

  const updateAllocation = (key, val) => {
    const actVal = parseInt(val, 10) || 0;
    updatePrefs({
      targetAllocation: { ...prefs.targetAllocation, [key]: actVal }
    });
  };

  return (
    <div className="page-enter" style={{ padding: "20px 20px 100px", display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-.02em" }}>Investment Settings</h1>

      {/* Back to Expense Tracker */}
      <Btn theme={C} v="soft" full icon="arrowLeft" onClick={onBackToExpense}>
        ← Back to Expense Tracker
      </Btn>

      {/* Preferences Section */}
      <div style={{ background: C.surface, borderRadius: 24, padding: 20, border: `1px solid ${C.borderLight}`, boxShadow: C.shadow, display: "flex", flexDirection: "column", gap: 20 }}>
        
        <div>
          <FLabel theme={C}>Default Stock Exchange</FLabel>
          <select 
            value={prefs.defaultExchange} 
            onChange={e => updatePrefs({ defaultExchange: e.target.value })}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14 }}
          >
            <option value="NS">NSE (.NS)</option>
            <option value="BO">BSE (.BO)</option>
          </select>
        </div>

        <div>
          <FLabel theme={C}>Assumed XIRR / Portfolio Return (%)</FLabel>
          <input 
            type="number"
            value={prefs.xirrAssumption} 
            onChange={e => updatePrefs({ xirrAssumption: parseFloat(e.target.value) || 12 })}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14 }}
          />
          <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>Used for forecasting goal projections.</div>
        </div>

        <div>
          <FLabel theme={C}>Refresh Frequency</FLabel>
          <select 
            value={prefs.refreshMode} 
            onChange={e => updatePrefs({ refreshMode: e.target.value })}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14 }}
          >
            <option value="manual">Manual (Tap Refresh)</option>
            <option value="open">On Every App Open</option>
            <option value="daily">Daily</option>
          </select>
        </div>
      </div>

      {/* Target Allocation */}
      <div style={{ background: C.surface, borderRadius: 24, padding: 20, border: `1px solid ${C.borderLight}`, boxShadow: C.shadow, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ color: C.text, fontSize: 16, fontWeight: 800 }}>Target Allocation (%)</div>
        <div style={{ color: C.sub, fontSize: 12, marginTop: -12, marginBottom: 8 }}>
          Set your ideal portfolio mix. Your Insights tab will alert you if you drift &gt;10% from this.
        </div>
        
        {['equity', 'debt', 'gold', 'cash'].map(key => (
          <div key={key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <FLabel theme={C} style={{ textTransform: 'capitalize' }}>{key}</FLabel>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{prefs.targetAllocation[key]}%</div>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={prefs.targetAllocation[key]} 
              onChange={e => updateAllocation(key, e.target.value)}
              style={{ width: "100%", accentColor: C.primary }}
            />
          </div>
        ))}
        {(()=>{
            const total = Object.values(prefs.targetAllocation).reduce((a,b)=>a+b,0);
            return (
              <div style={{ textAlign: "right", fontSize: 12, color: total === 100 ? C.income : C.expense, fontWeight: 700, marginTop: 8 }}>
                Total: {total}% {total !== 100 && "(Should be 100%)"}
              </div>
            );
        })()}
      </div>

      <div style={{ textAlign: "center", padding: "20px 0" }}>
         <div style={{ fontSize: 40, marginBottom: 12 }}>💎</div>
         <div style={{ color: C.text, fontSize: 18, fontWeight: 800 }}>Investment Tracker Phase 3</div>
      </div>
    </div>
  );
};
