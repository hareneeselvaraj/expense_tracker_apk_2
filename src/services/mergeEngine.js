/**
 * mergeEngine.js — Transaction-level merge with updatedAt timestamps.
 * Prevents data loss during multi-device sync by merging local + remote.
 */

/**
 * Merge two arrays of objects by `id`, keeping whichever has the later `updatedAt`.
 * Items only on one side are included. Soft-deleted items (deleted: true) are kept
 * for merge purposes but can be filtered out in the UI.
 */
export function mergeById(localArr = [], remoteArr = []) {
  const map = new Map();

  // Index local items
  localArr.forEach(item => {
    map.set(item.id, { ...item });
  });

  // Merge remote items
  remoteArr.forEach(item => {
    const existing = map.get(item.id);
    if (!existing) {
      // Remote-only: add it
      map.set(item.id, { ...item });
    } else {
      // Both exist: keep whichever has the later updatedAt
      const localTime = new Date(existing.updatedAt || 0).getTime();
      const remoteTime = new Date(item.updatedAt || 0).getTime();
      if (remoteTime > localTime) {
        map.set(item.id, { ...item });
      }
      // else keep local (already in map)
    }
  });

  return Array.from(map.values());
}

/**
 * Stamp every item in an array with `updatedAt` if it doesn't have one.
 */
export function ensureTimestamps(arr = []) {
  const now = new Date().toISOString();
  return arr.map(item => ({
    ...item,
    updatedAt: item.updatedAt || now
  }));
}

/**
 * Full dataset merge: merges all data collections (transactions, categories, etc.)
 */
export function mergeDatasets(local = {}, remote = {}) {
  return {
    transactions: mergeById(local.transactions, remote.transactions),
    categories: mergeById(local.categories, remote.categories),
    tags: mergeById(local.tags, remote.tags),
    accounts: mergeById(local.accounts, remote.accounts),
    budgets: mergeById(local.budgets, remote.budgets),
    rules: mergeById(local.rules, remote.rules),
    syncVersion: Math.max(local.syncVersion || 0, remote.syncVersion || 0) + 1
  };
}

/**
 * Stamp updatedAt on a single item (for use when saving/editing).
 */
export function stampUpdated(item) {
  return { ...item, updatedAt: new Date().toISOString() };
}

/**
 * Mark an item as soft-deleted (for sync purposes).
 */
export function softDelete(item) {
  return { ...item, deleted: true, updatedAt: new Date().toISOString() };
}

/**
 * Filter out soft-deleted items (for UI display).
 */
export function filterDeleted(arr = []) {
  return arr.filter(item => !item.deleted);
}
