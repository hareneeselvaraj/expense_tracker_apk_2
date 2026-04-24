import React, { useState } from "react";
import { Ico } from "../ui/Ico.jsx";
import Icon from "../ui/Icon.jsx";
import { timeAgo } from "../../services/notificationService.js";

const SEVERITY_CONFIG = (C) => ({
  critical: { accent: C.expense, icon: "AlertTriangle" },
  warning:  { accent: "#f59e0b", icon: "AlertCircle" },
  info:     { accent: C.primary, icon: "Lightbulb" },
  success:  { accent: C.income,  icon: "CheckCircle" },
});

const TYPE_ICON = { budget: "BarChart3", recurring: "RefreshCw", insight: "Lightbulb", sync: "Cloud", import: "Download", anomaly: "Search", reminder: "Clock" };
const TAB_MAP = { All: null, Budget: "budget", Recurring: "recurring", Sync: "sync", Insights: "insight" };

const NotificationCard = ({ notification: n, theme: C, onRead, onAction, onDismiss }) => {
  const config = SEVERITY_CONFIG(C)[n.severity] || SEVERITY_CONFIG(C).info;
  return (
    <div onClick={onRead} style={{
      background: n.read ? "transparent" : `${config.accent}08`,
      border: `1px solid ${n.read ? C.borderLight : config.accent + "30"}`,
      borderRadius: 14, padding: 12,
      display: "flex", gap: 10, cursor: "pointer",
      opacity: n.read ? 0.7 : 1, transition: "all .2s"
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: `${config.accent}15`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15
      }}>
        {TYPE_ICON[n.type] ? <Icon name={TYPE_ICON[n.type]} size={16} color={config.accent} /> : <Icon name={config.icon} size={16} color={config.accent} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{n.title}</div>
          <button onClick={(e) => { e.stopPropagation(); onDismiss(); }} style={{
            background: "none", border: "none", color: C.sub, cursor: "pointer", padding: 2,
            opacity: 0.4, flexShrink: 0, display: "flex"
          }}><Ico n="close" sz={12} /></button>
        </div>
        <div style={{ fontSize: 11, color: C.sub, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 9, color: C.sub, fontWeight: 600 }}>{timeAgo(n.timestamp)}</span>
          {n.actionLabel && (
            <button onClick={(e) => { e.stopPropagation(); onAction(); }} style={{
              background: `${config.accent}15`, border: `1px solid ${config.accent}30`,
              borderRadius: 8, padding: "3px 10px",
              color: config.accent, fontSize: 10, fontWeight: 700, cursor: "pointer"
            }}>
              {n.actionLabel}
            </button>
          )}
        </div>
      </div>
      {!n.read && (
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: config.accent, flexShrink: 0, marginTop: 4
        }} />
      )}
    </div>
  );
};

export const Header = ({
  title, theme, themeMode, toggleTheme, onOpenSettings,
  syncStatus, onOpenSync, isOffline, budgetAlerts = [],
  notifications = [], unreadCount = 0,
  onMarkRead, onMarkAllRead, onClearNotification, onNavigate
}) => {
  const C = theme;
  const [showNotifs, setShowNotifs] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const requestNotifPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const filteredNotifs = activeTab === "All"
    ? notifications
    : notifications.filter(n => n.type === TAB_MAP[activeTab]);

  const close = () => setShowNotifs(false);

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
            {unreadCount > 0 && (
              <div style={{
                position: "absolute", top: -2, right: -2,
                minWidth: 16, height: 16, borderRadius: 99, padding: "0 4px",
                background: C.expense, color: "#fff",
                fontSize: 9, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${C.headerBg}`,
                animation: "fadeIn 0.3s ease"
              }}>{unreadCount > 9 ? "9+" : unreadCount}</div>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifs && (
            <div style={{
              position: isMobile ? "fixed" : "absolute", 
              right: isMobile ? 12 : 0, 
              left: isMobile ? 12 : "auto",
              top: isMobile ? 70 : "100%", 
              marginTop: isMobile ? 0 : 8,
              width: isMobile ? "auto" : 320, 
              maxHeight: isMobile ? "calc(100vh - 140px)" : 440, 
              overflowY: "auto",
              background: C.surface, border: `1px solid ${C.borderLight}`,
              borderRadius: 20, boxShadow: `0 20px 60px rgba(0,0,0,0.3)`, zIndex: 999,
              padding: 16, display: "flex", flexDirection: "column", gap: 10
            }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Notifications</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {unreadCount > 0 && (
                    <button onClick={onMarkAllRead} style={{
                      background: "none", border: "none", color: C.primary, fontSize: 11,
                      fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                    }}>Mark all read</button>
                  )}
                  <button onClick={close} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", padding: 4, display: "flex" }}>
                    <Ico n="close" sz={16} />
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                {Object.keys(TAB_MAP).map(tab => {
                  const count = tab === "All" ? notifications.length : notifications.filter(n => n.type === TAB_MAP[tab]).length;
                  if (tab !== "All" && count === 0) return null;
                  const active = activeTab === tab;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      background: active ? C.primaryDim : "transparent",
                      border: `1px solid ${active ? C.primary + "40" : C.borderLight}`,
                      borderRadius: 99, padding: "4px 12px",
                      color: active ? C.primary : C.sub,
                      fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      whiteSpace: "nowrap", transition: "all .2s", flexShrink: 0
                    }}>
                      {tab}{count > 0 ? ` (${count})` : ""}
                    </button>
                  );
                })}
              </div>

              {/* Notification list */}
              {filteredNotifs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 12px" }}>
                  <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><Icon name="Bell" size={28} color={C.sub} /></div>
                  <div style={{ color: C.sub, fontSize: 13, fontWeight: 600 }}>No notifications yet</div>
                  <div style={{ color: C.sub, fontSize: 11, marginTop: 4 }}>Budget alerts, sync updates, and insights will appear here</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredNotifs.map(n => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      theme={C}
                      onRead={() => onMarkRead?.(n.id)}
                      onAction={() => {
                        if (n.actionRoute) onNavigate?.(n.actionRoute);
                        onMarkRead?.(n.id);
                        close();
                      }}
                      onDismiss={() => onClearNotification?.(n.id)}
                    />
                  ))}
                </div>
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
                  border: "none", borderRadius: 12, padding: "10px 12px",
                  color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  marginTop: 4, textAlign: "center"
                }}>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap: 6}}>
                    <Icon name="BellRing" size={14} /> Enable Push Notifications
                  </div>
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

      {isOffline && (
        <div style={{
          position: "absolute", bottom: -28, left: "50%", transform: "translateX(-50%)",
          background: C.expense, color: "#fff", fontSize: 11, fontWeight: 800,
          padding: "4px 12px", borderRadius: "0 0 12px 12px", zIndex: 290,
          display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}>
          ⚠️ You are offline. Changes saved locally.
        </div>
      )}
    </div>
  );
};
