import React, { useState } from "react";
import { Ico } from "../ui/Ico.jsx";

export const Header = ({ title, theme, themeMode, toggleTheme, onOpenSettings, syncStatus, onOpenSync, isOffline, budgetAlerts = [] }) => {

  const C = theme;
  const [showNotifs, setShowNotifs] = useState(false);
  const alertCount = budgetAlerts.length;

  const requestNotifPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return (
    <div style={{position:"sticky",top:0,zIndex:300,background:C.headerBg,borderBottom:`1px solid ${C.borderLight}`,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex", alignItems:"center", gap:10}}>
        <div style={{width: 8, height: 8, borderRadius: "50%", background: C.primary}} />
        <span style={{fontSize:20,fontWeight:800,letterSpacing:"-.02em", color:C.text}}>{title}</span>
      </div>

      <div style={{display:"flex",gap:8}}>
        {/* Bell / Notification Icon */}
        <div style={{ position: "relative" }}>
          <button onClick={() => { setShowNotifs(!showNotifs); requestNotifPermission(); }} style={{background:C.input,border:"none",borderRadius:12,padding:"8px",color:C.text,cursor:"pointer",display:"flex",transition:"transform .2s", position: "relative"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}>
            <Ico n="bell" sz={18}/>
            {alertCount > 0 && (
              <div style={{
                position: "absolute", top: -2, right: -2,
                width: 16, height: 16, borderRadius: "50%",
                background: C.expense, color: "#fff",
                fontSize: 9, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${C.headerBg}`
              }}>{alertCount}</div>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifs && (
            <div style={{
              position: "absolute", right: 0, top: "100%", marginTop: 8,
              width: 280, maxHeight: 320, overflowY: "auto",
              background: C.surface, border: `1px solid ${C.borderLight}`,
              borderRadius: 16, boxShadow: C.shadow, zIndex: 999,
              padding: 12, display: "flex", flexDirection: "column", gap: 8
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Notifications</span>
                <button onClick={() => setShowNotifs(false)} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", padding: 4 }}>
                  <Ico n="close" sz={16} />
                </button>
              </div>

              {alertCount === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 12px" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                  <div style={{ color: C.sub, fontSize: 13, fontWeight: 600 }}>No alerts right now</div>
                  <div style={{ color: C.sub, fontSize: 11, marginTop: 4 }}>Budget alerts will appear here</div>
                </div>
              ) : (
                budgetAlerts.map((a, idx) => {
                  const isCritical = a.type === 'critical' || a.type === 'exceeded';
                  const bgColor = isCritical ? `${C.expense}15` : `${C.warning}15`;
                  const borderColor = isCritical ? `${C.expense}40` : `${C.warning}40`;
                  const iconColor = isCritical ? C.expense : C.warning;
                  return (
                    <div key={idx} style={{
                      background: bgColor, border: `1px solid ${borderColor}`,
                      borderRadius: 12, padding: 12, display: "flex", alignItems: "flex-start", gap: 10
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: isCritical ? `${C.expense}22` : `${C.warning}22`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16
                      }}>
                        {isCritical ? '🚨' : '⚠️'}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{a.budgetName}</div>
                        <div style={{ fontSize: 11, color: iconColor, fontWeight: 700, marginTop: 2 }}>
                          {isCritical
                            ? `Over budget by ₹${Math.round(a.overshoot).toLocaleString()}`
                            : `${a.percentage}% used — ₹${Math.round(a.remaining).toLocaleString()} left`
                          }
                        </div>
                        <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>
                          ₹{Math.round(a.spent).toLocaleString()} / ₹{Math.round(a.limit).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Permission hint */}
              {'Notification' in window && Notification.permission !== 'granted' && (
                <button onClick={() => {
                  Notification.requestPermission().then(p => {
                    if (p === 'granted') {
                      new Notification('Expense Tracker', { body: 'Push notifications enabled!' });
                    }
                  });
                }} style={{
                  background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
                  border: "none", borderRadius: 10, padding: "10px 12px",
                  color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  marginTop: 4, textAlign: "center"
                }}>
                  🔔 Enable Push Notifications
                </button>
              )}
            </div>
          )}
        </div>

        <button onClick={toggleTheme} style={{background:C.input,border:"none",borderRadius:12,padding:"8px",color:C.text,cursor:"pointer",display:"flex",transition:"transform .2s"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}>
          <Ico n={themeMode==="dark"?"sun":"moon"} sz={18}/>
        </button>
         <button onClick={onOpenSettings} style={{background:C.input,border:"none",borderRadius:12,padding:"8px",color:C.text,cursor:"pointer",display:"flex",transition:"transform .2s"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}>
          <Ico n="settings" sz={18}/>
        </button>
      </div>
    </div>
  );
};
