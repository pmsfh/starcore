/**
 * cost.ts：成本曲线工具（v1.08）
 *
 * 「升档取整」单一数学口径：遗物强化成本与转生树无限节点成本两处共用。
 */

/** ceil(base × growth^exponent)：指数成本升档取整，防小数成本。
 * 边界（v1.61）：极端指数下 Math.pow 收敛到 Infinity，Math.ceil 原样
 * 返回该值（无静默错误值）；当前调用面的指数上界（遗物强化等级与转生
 * 无限节点等级）距该点余量充足 */
export function ceilPow(base: number, growth: number, exponent: number): number {
  return Math.ceil(base * Math.pow(growth, exponent))
}
