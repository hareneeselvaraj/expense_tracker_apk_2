export function purgeOldDeleted(arr, daysOld = 90) {
  const cutoff = Date.now() - daysOld * 86400_000;
  return arr.filter(item => {
    if (!item.deleted) return true;
    const t = new Date(item.updatedAt || 0).getTime();
    return t > cutoff; // keep if deleted recently
  });
}
