/**
 * tech/：科技树定义
 * 8 大分支：能量学、晶脉学、材料学、计算学、军事学、探索学、暗物质学、奇点学
 * 按学科区与星层配套区分文件存放，拼接顺序即科技页展示顺序。
 *
 * 图标口径：同族科技复用 symbol 为 Phase 1 去重定案
 * （与 IconsTech.vue 头注互证）；如需逐科技独立图标另行评估新增。
 */
import { t } from '@/i18n'
import type { TechBranch, TechDef } from './types'
import { DISCIPLINE_TECHS } from './disciplines'
import { LAYER_TECHS } from './layers'

export type { TechBranch, TechDef, TechEffect } from './types'

export const TECH_BRANCHES: Record<
  TechBranch,
  { id: TechBranch; name: string; color: string; icon: string }
> = {
  energy: {
    id: 'energy',
    name: t('content.tech.branch.energy.name'),
    color: 'var(--color-core)',
    icon: 'i-branch-energy',
  },
  crystallography: {
    id: 'crystallography',
    name: t('content.tech.branch.crystallography.name'),
    color: 'var(--color-quantum)',
    icon: 'i-branch-crystal',
  },
  materials: {
    id: 'materials',
    name: t('content.tech.branch.materials.name'),
    color: 'var(--color-amber)',
    icon: 'i-branch-material',
  },
  computing: {
    id: 'computing',
    name: t('content.tech.branch.computing.name'),
    color: 'var(--color-plasma)',
    icon: 'i-branch-computing',
  },
  military: {
    id: 'military',
    name: t('content.tech.branch.military.name'),
    color: 'var(--color-alert)',
    icon: 'i-branch-military',
  },
  exploration: {
    id: 'exploration',
    name: t('content.tech.branch.exploration.name'),
    color: 'var(--color-layer-void)',
    icon: 'i-branch-explore',
  },
  dark: {
    id: 'dark',
    name: t('content.tech.branch.dark.name'),
    color: 'var(--color-silencer)',
    icon: 'i-branch-dark',
  },
  singularity: {
    id: 'singularity',
    name: t('content.tech.branch.singularity.name'),
    color: 'var(--color-singularity)',
    icon: 'i-branch-singularity',
  },
}

export const TECHS: TechDef[] = [...DISCIPLINE_TECHS, ...LAYER_TECHS]

const TECH_MAP = new Map(TECHS.map((tech) => [tech.id, tech]))

export const getTech = (id: string): TechDef | undefined => TECH_MAP.get(id)

/** 判断科技是否可研究（前置已满足且未完成） */
export function techAvailable(def: TechDef, completed: Set<string>): boolean {
  if (completed.has(def.id)) return false
  if (def.requires) {
    for (const r of def.requires) if (!completed.has(r)) return false
  }
  return true
}

/**
 * 按成本乘数换算科技实付成本（向上取整）
 *
 * v0.73 统一：原 game/useActionQueue/TechView 三处重复循环统一调用本函数。
 * 乘数由调用方传 game.techCostMult（含科技与遗物的 cost_mult/tech 全量聚合）。
 */
export function adjustedTechCost(cost: TechDef['cost'], mult: number): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [k, v] of Object.entries(cost)) result[k] = Math.ceil(v * mult)
  return result
}
