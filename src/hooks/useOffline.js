/**
 * useOffline.js — Detects online/offline state and provides a pending sync queue.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { dbGet, dbSet } from "../services/localDb.js";

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingOps, setPendingOps] = useState([]);
  const loaded = useRef(false);

  // Listen for online/offline events
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // Load pending ops from IndexedDB on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await dbGet("pendingSync");
        if (saved && Array.isArray(saved)) setPendingOps(saved);
      } catch {}
      loaded.current = true;
    })();
  }, []);

  // Persist pending ops whenever they change
  useEffect(() => {
    if (!loaded.current) return;
    dbSet("pendingSync", pendingOps).catch(() => {});
  }, [pendingOps]);

  // Queue an operation for when connectivity returns
  const queueOp = useCallback((op) => {
    setPendingOps(prev => [...prev, { ...op, queuedAt: new Date().toISOString() }]);
  }, []);

  // Clear the queue after successful sync
  const clearQueue = useCallback(() => {
    setPendingOps([]);
  }, []);

  return { isOffline, pendingOps, queueOp, clearQueue };
}
