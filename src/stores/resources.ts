/**
 * resources.ts：资源 store
 * 5 种资源：energy(能量)、crystal(晶体)、alloy(合金)、data(数据流)、dark(暗物质)
 */
import { t } from '@/i18n'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Decimal, D, add, ser, deser, gte } from '@/lib/decimal'
import type { ResourceType } from '@/data/buildings'
import type { ResourceSaveData } from '@/lib/storage'

/** 五资源零值表（state 初始化与 reset 共用，v1.03 统一） */
function zeroResources(): Record<ResourceType, Decimal> {
  return { energy: D(0), crystal: D(0), alloy: D(0), data: D(0), dark: D(0) }
}

/** 新档初始能量（新档/硬重置/转生统一引用） */
export const START_ENERGY = 50

export interface ResourceMeta {
  id: ResourceType
  name: string
  icon: string
  color: string
}

const RES_META: Record<ResourceType, ResourceMeta> = {
  energy: {
    id: 'energy',
    name: t('resources.energy'),
    icon: 'i-res-energy',
    color: 'var(--color-core)',
  },
  crystal: {
    id: 'crystal',
    name: t('resources.crystal'),
    icon: 'i-res-crystal',
    color: 'var(--color-quantum)',
  },
  alloy: {
    id: 'alloy',
    name: t('resources.alloy'),
    icon: 'i-res-alloy',
    color: 'var(--color-amber)',
  },
  data: { id: 'data', name: t('resources.data'), icon: 'i-res-data', color: 'var(--color-plasma)' },
  dark: {
    id: 'dark',
    name: t('resources.dark'),
    icon: 'i-res-dark',
    color: 'var(--color-silencer)',
  },
}

export const useResourcesStore = defineStore('resources', () => {
  // state
  const amounts = ref<Record<ResourceType, Decimal>>({
    ...zeroResources(),
    energy: D(START_ENERGY),
  })
  const totals = ref<Record<ResourceType, Decimal>>(zeroResources())
  /** 每秒产出（由 game loop 每 tick（1 秒）计算并写入） */
  const production = ref<Record<ResourceType, Decimal>>(zeroResources())

  // getters
  const getAmount = (t: ResourceType) => amounts.value[t]
  const getTotal = (t: ResourceType) => totals.value[t]
  /** tick 累加口径的速率快照（主 tick 每秒写入）；界面显示的实时速率走 game.getDisplayRate */
  const getRate = (t: ResourceType) => production.value[t]
  /** 所有资源的元信息（ widened 为 string 索引，方便消费方用任意 string key 查找） */
  const allMeta: Record<string, ResourceMeta> = RES_META
  const getMeta = (t: ResourceType) => RES_META[t]

  // 开发与测试态的未知资源键防线（v1.61）：写入路径直接抛错，把「数据表键名
  // 手误静默创建幽灵键、下个 tick 崩溃」变成当场失败；成本路径告警维持忽略
  // 语义。生产构建下判型为 false，零开销、行为与旧版完全一致
  function devEnv(): boolean {
    try {
      return !!(import.meta as { env?: { DEV?: boolean } }).env?.DEV
    } catch {
      return false
    }
  }
  function assertKnownKey(t: string, where: string): void {
    if (!devEnv()) return
    if (!(t in amounts.value)) {
      throw new Error(`[resources] ${where} received unknown resource key "${t}"`)
    }
  }
  const warnedKeys = new Set<string>()
  function warnUnknownKey(k: string, where: string): void {
    if (!devEnv()) return
    if (k in amounts.value) return
    const tag = `${where}:${k}`
    if (warnedKeys.has(tag)) return
    warnedKeys.add(tag)
    console.warn(`[resources] ${where} cost contains unknown resource key "${k}", ignored`)
  }

  /** 是否负担得起一组成本 */
  const canAfford = (cost: Partial<Record<string, number>> | Record<string, number>) => {
    for (const [k, v] of Object.entries(cost)) {
      if (!(k in amounts.value)) {
        warnUnknownKey(k, 'canAfford')
        continue
      }
      if (!gte(amounts.value[k as ResourceType], v as number)) return false
    }
    return true
  }

  // actions
  /** 增加 */
  function gain(t: ResourceType, v: Decimal.Value) {
    assertKnownKey(t, 'gain')
    amounts.value[t] = add(amounts.value[t], v)
    totals.value[t] = add(totals.value[t], v)
  }
  /** 消耗（返回是否成功） */
  function spend(t: ResourceType, v: Decimal.Value): boolean {
    if (!gte(amounts.value[t], v)) return false
    amounts.value[t] = amounts.value[t].minus(v)
    return true
  }
  /** 一次性消耗一组成本 */
  function spendCost(cost: Partial<Record<string, number>>): boolean {
    if (!canAfford(cost)) return false
    for (const [k, v] of Object.entries(cost)) {
      if (!(k in amounts.value)) {
        warnUnknownKey(k, 'spendCost')
        continue
      }
      amounts.value[k as ResourceType] = amounts.value[k as ResourceType].minus(v as number)
    }
    return true
  }
  /** 直接设置（调试/导入用） */
  function setAmount(t: ResourceType, v: Decimal.Value) {
    assertKnownKey(t, 'setAmount')
    amounts.value[t] = D(v)
  }
  /** 设置产出速率 */
  function setProduction(t: ResourceType, v: Decimal.Value) {
    assertKnownKey(t, 'setProduction')
    const next = D(v)
    // 等值跳过（v1.61）：主 tick 每秒对全部资源重写速率，未变值不再重复
    // 赋值触发依赖方重算；产速变化时的重写语义不变
    if (production.value[t].eq(next)) return
    production.value[t] = next
  }
  /** tick 推进：amount += production * dt */
  function applyTick(dt: number) {
    for (const t of Object.keys(amounts.value) as ResourceType[]) {
      const inc = production.value[t].times(dt)
      if (!inc.isZero()) {
        amounts.value[t] = add(amounts.value[t], inc)
        totals.value[t] = add(totals.value[t], inc)
      }
    }
  }
  /** 重置（转生用） */
  function reset(keepDark = false) {
    const darkKeep = keepDark ? amounts.value.dark : D(0)
    amounts.value = { ...zeroResources(), energy: D(START_ENERGY), dark: darkKeep }
    totals.value = zeroResources()
    production.value = zeroResources()
  }

  // 序列化
  function serialize() {
    return {
      amounts: Object.fromEntries(
        Object.entries(amounts.value).map(([k, v]) => [k, ser(v)])
      ) as Record<string, string>,
      totals: Object.fromEntries(
        Object.entries(totals.value).map(([k, v]) => [k, ser(v)])
      ) as Record<string, string>,
    }
  }
  function hydrate(data: ResourceSaveData | undefined) {
    if (!data) return
    for (const k of Object.keys(amounts.value)) {
      if (data.amounts?.[k]) amounts.value[k as ResourceType] = deser(data.amounts[k])
      if (data.totals?.[k]) totals.value[k as ResourceType] = deser(data.totals[k])
    }
  }

  return {
    amounts,
    totals,
    production,
    getAmount,
    getTotal,
    getRate,
    allMeta,
    getMeta,
    canAfford,
    gain,
    spend,
    spendCost,
    setAmount,
    setProduction,
    applyTick,
    reset,
    serialize,
    hydrate,
  }
})
