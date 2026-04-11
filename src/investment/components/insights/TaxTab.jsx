import React, { useMemo } from "react";
import { calculateTaxes, getCurrentFY } from "../../utils/taxCalc.js";
import { fmtAmt } from "../../../utils/format.js";

export const TaxTab = ({ investData, theme }) => {
  const C = theme;
  
  const currentFY = getCurrentFY();
  const taxSummary = useMemo(() => calculateTaxes(investData.holdings || [], investData.transactions || [], currentFY), [investData]);

  const ltcgExempt = 100000;
  const taxableLTCG = Math.max(0, taxSummary.ltcgEquity - ltcgExempt);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      
      <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: "20px 16px", boxShadow: C.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ color: C.text, fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>FY {currentFY}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
           <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: `1px dashed ${C.borderLight}` }}>
              <div style={{ color: C.sub, fontSize: 13, fontWeight: 600 }}>STCG (Equity)</div>
              <div style={{ color: taxSummary.stcgEquity >= 0 ? C.income : C.expense, fontSize: 14, fontWeight: 800 }}>
                 {taxSummary.stcgEquity >= 0 ? "+" : "−"}{fmtAmt(taxSummary.stcgEquity)}
              </div>
           </div>
           
           <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: `1px dashed ${C.borderLight}` }}>
              <div style={{ color: C.sub, fontSize: 13, fontWeight: 600 }}>LTCG (Equity)</div>
              <div style={{ color: taxSummary.ltcgEquity >= 0 ? C.income : C.expense, fontSize: 14, fontWeight: 800 }}>
                 {taxSummary.ltcgEquity >= 0 ? "+" : "−"}{fmtAmt(taxSummary.ltcgEquity)}
              </div>
           </div>
           
           <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: `1px dashed ${C.borderLight}` }}>
              <div style={{ color: C.sub, fontSize: 13, fontWeight: 600 }}>Debt Gains</div>
              <div style={{ color: taxSummary.debtGains >= 0 ? C.income : C.expense, fontSize: 14, fontWeight: 800 }}>
                 {taxSummary.debtGains >= 0 ? "+" : "−"}{fmtAmt(taxSummary.debtGains)}
              </div>
           </div>

           <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ color: C.sub, fontSize: 13, fontWeight: 600 }}>Tax Exempt LTCG</div>
              <div style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>{fmtAmt(ltcgExempt)}</div>
           </div>

           <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
              <div style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>Taxable LTCG</div>
              <div style={{ color: taxableLTCG > 0 ? C.expense : C.sub, fontSize: 15, fontWeight: 800 }}>
                 {taxableLTCG === 0 ? "NIL ✓" : fmtAmt(taxableLTCG)}
              </div>
           </div>
        </div>
      </div>

      <div style={{ color: C.text, fontSize: 16, fontWeight: 800, marginTop: 8, paddingLeft: 4 }}>Loss Harvesting</div>
      
      {taxSummary.harvestingOpportunities.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {taxSummary.harvestingOpportunities.map(opp => (
            <div key={opp.id} style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: C.shadow }}>
               <div>
                 <div style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>{opp.symbol || opp.name}</div>
                 <div style={{ color: C.sub, fontSize: 12, marginTop: 4 }}>Unrealized loss: <span style={{ color: C.expense, fontWeight: 700 }}>-{fmtAmt(Math.abs(opp.unrealizedLoss))}</span></div>
               </div>
               <div style={{ color: C.primary, fontSize: 11, fontWeight: 700, padding: "6px 12px", background: C.primary + "1A", borderRadius: 12 }}>
                 Sell & Rebuy
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: C.sub, fontSize: 13, textAlign: "center", padding: "24px 0" }}>No significant harvesting opportunities found.</div>
      )}

    </div>
  );
};
