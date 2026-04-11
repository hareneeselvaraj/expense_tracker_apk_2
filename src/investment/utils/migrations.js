export function migrateInvestData(data) {
  if (!data) return null;
  const migrated = { ...data };
  
  if (!migrated.meta) migrated.meta = { version: 1 };
  if (!migrated.prefs) migrated.prefs = {};
  
  // Example: Ensure targetAllocation exists
  if (!migrated.prefs.targetAllocation) {
    migrated.prefs.targetAllocation = { equity: 60, debt: 30, gold: 10, cash: 0 };
  }
  
  // Ensure default xirr exists
  if (migrated.prefs.xirrAssumption === undefined) {
    migrated.prefs.xirrAssumption = 12;
  }

  migrated.meta.version = 2; // Incremental update
  return migrated;
}
