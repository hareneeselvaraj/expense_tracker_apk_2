import React, { useMemo } from "react";
import { generateCalendarEvents } from "../../utils/calendarEvents.js";
import { fmtAmt, fmtDate } from "../../../utils/format.js";

export const CalendarTab = ({ investData, theme }) => {
  const C = theme;
  const activeHoldings = (investData?.holdings || []).filter(h => !h.deleted);
  
  const events = useMemo(() => generateCalendarEvents(activeHoldings), [activeHoldings]);

  if (events.length === 0) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: 40, textAlign: "center", boxShadow: C.shadow }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
        <div style={{ color: C.text, fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No Upcoming Events</div>
        <div style={{ color: C.sub, fontSize: 13, lineHeight: 1.5 }}>Your 90-day calendar is clear. Add FDs, Bonds, or SIPs to track maturities and debits here.</div>
      </div>
    );
  }

  // Group by month
  const grouped = events.reduce((acc, ev) => {
    const month = ev.date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(ev);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {Object.keys(grouped).map(month => (
        <div key={month} style={{ background: C.surface, borderRadius: 24, padding: "20px 16px", border: `1px solid ${C.borderLight}`, boxShadow: C.shadow }}>
          <div style={{ color: C.primary, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 16 }}>{month}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, borderLeft: `2px solid ${C.borderLight}`, paddingLeft: 16, marginLeft: 8 }}>
            {grouped[month].map((ev, i) => {
              const ICONS = { maturity: "🏁", sip: "💧", coupon: "💸" };
              return (
                <div key={i} style={{ position: "relative", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ position: "absolute", left: -25, top: 0, background: C.surface, padding: "2px 0" }}>
                     <div style={{ width: 14, height: 14, borderRadius: 7, border: `3px solid ${C.border}`, background: C.primary }} />
                  </div>
                  <div style={{ fontSize: 18, marginTop: -2 }}>{ICONS[ev.type] || "📅"}</div>
                  <div style={{ flex: 1 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ color: C.text, fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>{ev.title}</div>
                        <div style={{ color: ev.type === "sip" ? C.expense : C.income, fontSize: 14, fontWeight: 800 }}>
                           {ev.type === "sip" ? "−" : "+"}{fmtAmt(ev.amount || 0)}
                        </div>
                     </div>
                     <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginTop: 4 }}>
                       {fmtDate(ev.date.toISOString().split("T")[0])}
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
