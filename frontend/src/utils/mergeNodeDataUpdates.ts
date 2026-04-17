/**
 * Merge panel/store updates into node.data. Shallow-merge top-level fields but
 * deep-merge `config` so a stale `{}` from the UI does not wipe an existing filter/select/etc.
 */
export function mergeNodeDataUpdates(
  baseData: Record<string, unknown>,
  updates: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...baseData, ...updates };

  if (!Object.prototype.hasOwnProperty.call(updates, 'config')) {
    return out;
  }

  const rawInc = updates.config;
  const prevC =
    baseData.config &&
    typeof baseData.config === 'object' &&
    !Array.isArray(baseData.config)
      ? { ...(baseData.config as Record<string, unknown>) }
      : {};

  if (
    rawInc &&
    typeof rawInc === 'object' &&
    !Array.isArray(rawInc)
  ) {
    out.config = { ...prevC, ...(rawInc as Record<string, unknown>) };
  } else {
    out.config = { ...prevC };
  }

  return out;
}
