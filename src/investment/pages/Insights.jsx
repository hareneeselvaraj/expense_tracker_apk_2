import React, { useState } from "react";
import { PerformanceTab } from "../components/insights/PerformanceTab.jsx";
import { CalendarTab } from "../components/insights/CalendarTab.jsx";
import { TaxTab } from "../components/insights/TaxTab.jsx";
export const InsightsPage = ({ investData, theme }) => {
  const C = theme;
  const [activeTab, setActiveTab] = useState("performance");

  const TABS = [
    { id: "performance", label: "Performance" },
    { id: "calendar", label: "Calendar" },
    { id: "tax", label: "Tax" }
  ];

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px 20px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
         <div>
           <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-.02em" }}>Insights</h1>
           <div style={{ fontSize: 12, color: C.sub, fontWeight: 600, marginTop: 4 }}>Analytics & Forecasting</div>
         </div>
      </div>

      {/* Sticky Tab Bar */}
      <div style={{
        display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4,
        position: "sticky", top: 60, zIndex: 10, background: C.bg, paddingTop: 8
      }} className="premium-scroll">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 20px", borderRadius: 20, whiteSpace: "nowrap",
              background: activeTab === t.id ? C.primary : C.surface,
              color: activeTab === t.id ? "#fff" : C.sub,
              border: `1px solid ${activeTab === t.id ? C.primary : C.borderLight}`,
              fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ marginTop: 8 }}>
        {activeTab === "performance" && <PerformanceTab investData={investData} theme={C} />}
        {activeTab === "calendar" && <CalendarTab investData={investData} theme={C} />}
        {activeTab === "tax" && <TaxTab investData={investData} theme={C} />}
      </div>
    </div>
  );
};
