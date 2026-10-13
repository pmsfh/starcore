/**
 * saved-int.ts：存档整数钳制（hydrate 面共用）
 *
 * 各 store hydrate 读档数值的同一口径：非有限数回退 0、负数钳 0、
 * 小数向下取整，可选上限。此前同一写法在 achievements/daily/military/
 * combat/transcend 六处逐字重复，规则演进需多点同步。
 */

/** 存档整数钳制：非有限数回退 0、钳非负整数，可选上限 */
export function clampSavedInt(v: number, max?: number): number {
  const n = Number.isFinite(v) ? Math.floor(v) : 0
  const clamped = Math.max(0, n)
  return max === undefined ? clamped : Math.min(clamped, max)
}
