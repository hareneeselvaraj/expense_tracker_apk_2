/**
 * Notification Service
 * Central notification store with dedup, cooldown, and pruning.
 */

export function createNotification({ type, severity, title, body, actionLabel, actionRoute, meta }) {
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    severity: severity || "info",
    title,
    body,
    timestamp: new Date().toISOString(),
    read: false,
    actionLabel: actionLabel || null,
    actionRoute: actionRoute || null,
    meta: meta || {}
  };
}

/** Deduplicate: don't re-add if same type+title exists within cooldown */
export function shouldAdd(existing, newNotif, cooldownMs = 60000) {
  return !existing.some(n =>
    n.type === newNotif.type &&
    n.title === newNotif.title &&
    Date.now() - new Date(n.timestamp).getTime() < cooldownMs
  );
}

/** Keep only last N notifications */
export function pruneNotifications(list, max = 50) {
  return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, max);
}

/** Relative time display */
export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
