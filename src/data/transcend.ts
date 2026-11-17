/**
 * transcend.ts：转生树数据表
 * 节点分买断与无限两类（v0.56 转生树无限化）；效果、成本与换算函数与数据同源，
 * store 只保留状态、购买流程与存档读写。
 */
import { t } from '@/i18n'
import { ceilPow } from '@/lib/cost'
import type { EffectTypeBase } from '@/lib/effect-types'

export interface TranscendEffect {
  type:
    | EffectTypeBase
    | 'relic_slot'
    | 'starting_energy'
    | 'auto_build'
    | 'auto_research'
    | 'auto_explore'
  target?: string
  value: number
  label: string
}

export interface TranscendNode {
  id: string
  name: string
  desc: string
  cost: number // 负熵基础成本（无限节点为 Lv1 成本）
  effects: TranscendEffect[]
  /** 当前等级：0 = 未购；买断节点购后 = 1 */
  level: number
  /** 等级上限，缺省 1 = 买断节点；无限节点设 Infinity */
  maxLevel?: number
  /** 无限节点成本增长率：nextCost = ceil(cost × costGrowth^level) */
  costGrowth?: number
}

/** 无限节点判定：maxLevel 显式大于 1（含 Infinity） */
export function isInfiniteNode(node: TranscendNode): boolean {
  return (node.maxLevel ?? 1) > 1
}

/** 节点在给定等级处的下一级购买成本（缺省当前等级；买断节点 = 基础成本；无限节点 = 指数递增取整） */
export function nextCost(node: TranscendNode, level = node.level): number {
  if (!isInfiniteNode(node)) return node.cost
  return ceilPow(node.cost, node.costGrowth ?? 1.5, level)
}

// 导出供守恒脚本取真值（转生树节点清单），运行期消费方为本文件内部
export const DEFAULT_NODES: TranscendNode[] = [
  // 买断节点（引导期目标，原 11 节点口径不变），
  {
    id: 't_energy_1',
    name: t('content.transcend.t_energy_1.name'),
    desc: t('content.transcend.t_energy_1.desc'),
    cost: 1,
    effects: [
      {
        type: 'production_mult',
        target: 'energy',
        value: 1.5,
        label: t('content.transcend.t_energy_1.effect.0.label'),
      },
    ],
    level: 0,
  },
  {
    id: 't_alloy_1',
    name: t('content.transcend.t_alloy_1.name'),
    desc: t('content.transcend.t_alloy_1.desc'),
    cost: 1,
    effects: [
      {
        type: 'production_mult',
        target: 'alloy',
        value: 1.5,
        label: t('content.transcend.t_alloy_1.effect.0.label'),
      },
    ],
    level: 0,
  },
  {
    id: 't_data_1',
    name: t('content.transcend.t_data_1.name'),
    desc: t('content.transcend.t_data_1.desc'),
    cost: 2,
    effects: [
      {
        type: 'production_mult',
        target: 'data',
        value: 1.5,
        label: t('content.transcend.t_data_1.effect.0.label'),
      },
    ],
    level: 0,
  },
  {
    id: 't_crystal_1',
    name: t('content.transcend.t_crystal_1.name'),
    desc: t('content.transcend.t_crystal_1.desc'),
    cost: 2,
    effects: [
      {
        type: 'production_mult',
        target: 'crystal',
        value: 1.5,
        label: t('content.transcend.t_crystal_1.effect.0.label'),
      },
    ],
    level: 0,
  },
  {
    id: 't_starting',
    name: t('content.transcend.t_starting.name'),
    desc: t('content.transcend.t_starting.desc'),
    cost: 2,
    effects: [
      {
        type: 'starting_energy',
        value: 10,
        label: t('content.transcend.t_starting.effect.0.label'),
      },
    ],
    level: 0,
  },
  {
    id: 't_slot',
    name: t('content.transcend.t_slot.name'),
    desc: t('content.transcend.t_slot.desc'),
    cost: 3,
    effects: [
      { type: 'relic_slot', value: 1, label: t('content.transcend.t_slot.effect.0.label') },
    ],
    level: 0,
  },
  {
    id: 't_dark_1',
    name: t('content.transcend.t_dark_1.name'),
    desc: t('content.transcend.t_dark_1.desc'),
    cost: 5,
    effects: [
      {
        type: 'production_mult',
        target: 'dark',
        value: 1.5,
        label: t('content.transcend.t_dark_1.effect.0.label'),
      },
    ],
    level: 0,
  },
  {
    id: 't_energy_2',
    name: t('content.transcend.t_energy_2.name'),
    desc: t('content.transcend.t_energy_2.desc'),
    cost: 5,
    effects: [
      {
        type: 'production_mult',
        target: 'energy',
        value: 2.0,
        label: t('content.transcend.t_energy_2.effect.0.label'),
      },
    ],
    level: 0,
  },
  {
    id: 't_combat_1',
    name: t('content.transcend.t_combat_1.name'),
    desc: t('content.transcend.t_combat_1.desc'),
    cost: 5,
    effects: [
      {
        type: 'combat_mult',
        target: 'attack',
        value: 1.3,
        label: t('content.transcend.t_combat_1.effect.0.label'),
      },
      {
        type: 'combat_mult',
        target: 'defense',
        value: 1.3,
        label: t('content.transcend.t_combat_1.effect.1.label'),
      },
    ],
    level: 0,
  },
  {
    id: 't_offline',
    name: t('content.transcend.t_offline.name'),
    desc: t('content.transcend.t_offline.desc'),
    cost: 6,
    effects: [
      { type: 'offline_bonus', value: 1.5, label: t('content.transcend.t_offline.effect.0.label') },
    ],
    level: 0,
  },
  {
    id: 't_prestige_boost',
    name: t('content.transcend.t_prestige_boost.name'),
    desc: t('content.transcend.t_prestige_boost.desc'),
    cost: 8,
    effects: [
      {
        type: 'prestige_mult',
        value: 2.0,
        label: t('content.transcend.t_prestige_boost.effect.0.label'),
      },
    ],
    level: 0,
  },
  // 自动化 QoL（v0.58 新增，买断常开：买后每 tick 自动执行对应操作），
  {
    id: 't_auto_build',
    name: t('content.transcend.t_auto_build.name'),
    desc: t('content.transcend.t_auto_build.desc'),
    cost: 10,
    effects: [
      { type: 'auto_build', value: 1, label: t('content.transcend.t_auto_build.effect.0.label') },
    ],
    level: 0,
  },
  {
    id: 't_auto_research',
    name: t('content.transcend.t_auto_research.name'),
    desc: t('content.transcend.t_auto_research.desc'),
    cost: 10,
    effects: [
      {
        type: 'auto_research',
        value: 1,
        label: t('content.transcend.t_auto_research.effect.0.label'),
      },
    ],
    level: 0,
  },
  {
    id: 't_auto_explore',
    name: t('content.transcend.t_auto_explore.name'),
    desc: t('content.transcend.t_auto_explore.desc'),
    cost: 8,
    effects: [
      {
        type: 'auto_explore',
        value: 1,
        label: t('content.transcend.t_auto_explore.effect.0.label'),
      },
    ],
    level: 0,
  },
  // 无限节点（v0.56 新增，负熵支出端永不枯竭），
  {
    id: 't_inf_prod',
    name: t('content.transcend.t_inf_prod.name'),
    desc: t('content.transcend.t_inf_prod.desc'),
    cost: 5,
    effects: [
      {
        type: 'production_mult',
        target: 'all',
        value: 1.1,
        label: t('content.transcend.t_inf_prod.effect.0.label'),
      },
    ],
    level: 0,
    maxLevel: Infinity,
    costGrowth: 1.5,
  },
  {
    id: 't_inf_combat',
    name: t('content.transcend.t_inf_combat.name'),
    desc: t('content.transcend.t_inf_combat.desc'),
    cost: 5,
    effects: [
      {
        type: 'combat_mult',
        target: 'attack',
        value: 1.05,
        label: t('content.transcend.t_inf_combat.effect.0.label'),
      },
      {
        type: 'combat_mult',
        target: 'defense',
        value: 1.05,
        label: t('content.transcend.t_inf_combat.effect.1.label'),
      },
    ],
    level: 0,
    maxLevel: Infinity,
    costGrowth: 1.5,
  },
  {
    id: 't_inf_explore',
    name: t('content.transcend.t_inf_explore.name'),
    desc: t('content.transcend.t_inf_explore.desc'),
    cost: 6,
    effects: [
      {
        type: 'explore_mult',
        value: 1.1,
        label: t('content.transcend.t_inf_explore.effect.0.label'),
      },
    ],
    level: 0,
    maxLevel: Infinity,
    costGrowth: 1.5,
  },
  {
    id: 't_inf_offline',
    name: t('content.transcend.t_inf_offline.name'),
    desc: t('content.transcend.t_inf_offline.desc'),
    cost: 8,
    effects: [
      {
        type: 'offline_bonus',
        value: 1.1,
        label: t('content.transcend.t_inf_offline.effect.0.label'),
      },
    ],
    level: 0,
    maxLevel: Infinity,
    costGrowth: 1.6,
  },
]

/**
 * 无限节点 id 集合与等级硬上限（v0.81 存档安全）：
 * 校验层拒绝 level 超限的条目，防超大等级值经 allEffects 物化数组挂死首帧。
 * 上限远超正常进度可达值（按 costGrowth 1.5 的指数成本，正收益玩法内不可能触顶）。
 */
export const INFINITE_NODE_IDS: ReadonlySet<string> = new Set(
  DEFAULT_NODES.filter(isInfiniteNode).map((n) => n.id)
)
export const MAX_INFINITE_NODE_LEVEL = 1_000_000

/** 转生门槛：累计能量达到该值才产出负熵（预览公式硬门，视图提示文案同源） */
export const TRANSCEND_MIN_ENERGY = 3e5
