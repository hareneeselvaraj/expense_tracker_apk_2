import React, { useMemo, useState, useEffect } from "react";
import { Btn } from "../../components/ui/Btn.jsx";
import { FLabel } from "../../components/ui/FInput.jsx";

export const InvestSettingsPage = ({ investData, setInvestData, onBackToExpense, theme }) => {
  const C = theme;
  
  const defaultPrefs = useMemo(() => ({
    defaultExchange: "NS",
    displayCurrency: "INR",
    targetAllocation: { equity: 60, debt: 30, gold: 10, cash: 0 },
    xirrAssumption: 12,
    refreshMode: "manual"
  }), []);

  const prefs = useMemo(() => ({
    ...defaultPrefs,
    ...(investData.prefs || {})
  }), [investData.prefs, defaultPrefs]);

  const [localAllocation, setLocalAllocation] = useState(prefs.targetAllocation);
  const [localXirr, setLocalXirr] = useState(prefs.xirrAssumption.toString());

  // Sync local state if global prefs change (unless we are mid-edit)
  useEffect(() => {
    setLocalAllocation(prefs.targetAllocation);
    setLocalXirr(prefs.xirrAssumption.toString());
  }, [prefs]);

  const updatePrefs = (updates) => {
    setInvestData(prev => ({
      ...prev,
      prefs: { ...(prev.prefs || prefs), ...updates }
    }));
  };

  const handleSaveAllocation = () => {
    updatePrefs({ targetAllocation: localAllocation });
  };

  const handleXirrBlur = () => {
    const val = parseFloat(localXirr) || 12;
    updatePrefs({ xirrAssumption: val });
    setLocalXirr(val.toString());
  };

  const totalAllocation = Object.values(localAllocation).reduce((a, b) => a + b, 0);

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
            value={localXirr} 
            onChange={e => setLocalXirr(e.target.value)}
            onBlur={handleXirrBlur}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14 }}
          />
          <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>Used for forecasting goal projections. Commits on blur.</div>
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
              <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{localAllocation[key]}%</div>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={localAllocation[key]} 
              onChange={e => setLocalAllocation(prev => ({ ...prev, [key]: parseInt(e.target.value, 10) || 0 }))}
              style={{ width: "100%", accentColor: C.primary }}
            />
          </div>
        ))}
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <div style={{ fontSize: 12, color: totalAllocation === 100 ? C.income : C.expense, fontWeight: 700 }}>
            Total: {totalAllocation}% {totalAllocation !== 100 && "(Must be 100%)"}
          </div>
          <Btn 
            theme={C} 
            v="primary" 
            disabled={totalAllocation !== 100 || JSON.stringify(localAllocation) === JSON.stringify(prefs.targetAllocation)} 
            onClick={handleSaveAllocation}
            style={{ padding: "8px 16px", fontSize: 12 }}
          >
            Save Allocation
          </Btn>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "20px 0" }}>
         <div style={{ fontSize: 40, marginBottom: 12 }}>💎</div>
         <div style={{ color: C.text, fontSize: 18, fontWeight: 800 }}>Investment Tracker Phase 3</div>
      </div>
    </div>
  );
};
