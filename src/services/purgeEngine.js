/**
 * purgeOldDeleted — permanently remove soft-deleted items older than N days.
 * Safety: only purge if the delete is also older than last sync timestamp,
 * ensuring the delete has propagated to all devices before we drop it.
 */
export function purgeOldDeleted(arr, daysOld = 90, lastSyncTs = 0) {
  const ageCutoff = Date.now() - daysOld * 86400_000;
  return arr.filter(item => {
    if (!item.deleted) return true;
    const t = new Date(item.updatedAt || 0).getTime();
    // Keep if deleted recently OR if delete hasn't been synced yet
    return t > ageCutoff || t > lastSyncTs;
  });
}
