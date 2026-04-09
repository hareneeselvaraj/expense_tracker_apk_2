import { todayISO } from "../utils/format.js";
import { mergeDatasets, ensureTimestamps } from "./mergeEngine.js";
import { GOOGLE_SCOPES } from "../constants/config.js";

/**
 * Validate token by calling Google's tokeninfo endpoint.
 * Returns true if token is still valid.
 */
async function isTokenValid(token) {
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
    return res.ok;
  } catch {
    return false;
  }
}

export const googleService = {
  getToken: async (clientId, tokenRef) => {
    // Check if existing token is still valid
    if (tokenRef.current) {
      const valid = await isTokenValid(tokenRef.current);
      if (valid) return tokenRef.current;
      // Token expired — clear it so we re-auth
      tokenRef.current = null;
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error("Google API not loaded");
    }

    return new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES,
        callback: (resp) => {
          if (resp.error) { reject(new Error(resp.error)); return; }
          tokenRef.current = resp.access_token;
          // Safety clear after 55 minutes (tokens last ~60 min)
          setTimeout(() => { tokenRef.current = null; }, 55 * 60 * 1000);
          resolve(resp.access_token);
        },
      });

      // Try silent re-auth first (no popup if user already consented)
      try {
        tokenClient.requestAccessToken({ prompt: "" });
      } catch {
        // Fall back to interactive prompt
        tokenClient.requestAccessToken();
      }
    });
  },

  saveToDrive: async (clientId, tokenRef, data) => {
    const token = await googleService.getToken(clientId, tokenRef);

    // Ensure all items have updatedAt timestamps + add syncVersion
    const stamped = {
      transactions: ensureTimestamps(data.transactions),
      categories: ensureTimestamps(data.categories),
      tags: ensureTimestamps(data.tags),
      accounts: ensureTimestamps(data.accounts),
      budgets: ensureTimestamps(data.budgets),
      rules: ensureTimestamps(data.rules),
      recurring: ensureTimestamps(data.recurring || []),
      investData: data.investData ? {
        holdings: ensureTimestamps(data.investData.holdings || []),
        transactions: ensureTimestamps(data.investData.transactions || []),
        prefs: data.investData.prefs || {},
        meta: data.investData.meta || { version: 1 },
      } : undefined,
      syncVersion: (data.syncVersion || 0) + 1,
      savedAt: new Date().toISOString()
    };

    const backupData = JSON.stringify(stamped, null, 2);
    const fileName = `ExpenseTracker_Backup_${todayISO()}.json`;

    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name contains 'ExpenseTracker_Backup' and trashed=false&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    const existingFile = listData.files?.[0];

    const metadata = { name: fileName, mimeType: "application/json" };
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", new Blob([backupData], { type: "application/json" }));

    let url, method;
    if (existingFile) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart&fields=id,name,modifiedTime`;
      method = "PATCH";
    } else {
      url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime";
      method = "POST";
    }

    const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: form });
    if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
    return await res.json();
  },

  listBackups: async (clientId, tokenRef) => {
    const token = await googleService.getToken(clientId, tokenRef);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=name contains 'ExpenseTracker_Backup' and trashed=false&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data.files || [];
  },

  restoreFromDrive: async (clientId, tokenRef, fileId) => {
    const token = await googleService.getToken(clientId, tokenRef);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    // v2 → v3 migration: if no investData key, initialize empty
    if (!data.investData) {
      data.investData = {
        holdings: [],
        transactions: [],
        prefs: {},
        meta: { version: 1, lastPriceRefresh: null },
      };
    }

    return data;
  },

  /**
   * Smart sync with merge: pulls remote, merges with local, pushes merged result.
   * Returns the merged dataset.
   */
  smartSync: async (clientId, tokenRef, localData) => {
    const token = await googleService.getToken(clientId, tokenRef);

    // 1. List backups to find the latest remote
    const files = await googleService.listBackups(clientId, tokenRef);
    const remoteFile = files[0];

    if (!remoteFile) {
      // No remote data — just push local
      const file = await googleService.saveToDrive(clientId, tokenRef, localData);
      return { merged: localData, action: "pushed", file };
    }

    // 2. Fetch remote data
    const remoteData = await googleService.restoreFromDrive(clientId, tokenRef, remoteFile.id);

    // 3. Check if merge is needed
    const localVersion = localData.syncVersion || 0;
    const remoteVersion = remoteData.syncVersion || 0;
    const lastSyncedTime = parseInt(localStorage.getItem("expense_last_sync") || "0");
    const remoteTime = new Date(remoteFile.modifiedTime).getTime();

    if (remoteTime <= lastSyncedTime && remoteVersion <= localVersion) {
      // Local is up-to-date — just push
      const file = await googleService.saveToDrive(clientId, tokenRef, localData);
      return { merged: localData, action: "pushed", file };
    }

    // 4. Merge local + remote
    const merged = mergeDatasets(localData, remoteData);

    // 5. Push the merged result
    const file = await googleService.saveToDrive(clientId, tokenRef, merged);

    // 6. Update sync timestamp
    if (file?.modifiedTime) {
      localStorage.setItem("expense_last_sync", new Date(file.modifiedTime).getTime().toString());
    }

    return { merged, action: "merged", file };
  }
};
