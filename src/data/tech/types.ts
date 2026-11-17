/**
 * types.ts：科技树的类型定义
 */

import type { EffectTypeBase } from '@/lib/effect-types'

export type TechBranch =
  | 'energy'
  | 'crystallography'
  | 'materials'
  | 'computing'
  | 'military'
  | 'exploration'
  | 'dark'
  | 'singularity'

export interface TechDef {
  id: string
  name: string
  desc: string
  branch: TechBranch
  icon: string
  cost: Partial<Record<'data' | 'energy' | 'crystal' | 'alloy' | 'dark', number>>
  /** 解锁前置科技 */
  requires?: string[]
  /** 效果对象：可由效果系统读取 */
  effects: TechEffect[]
  tier: number
}

export interface TechEffect {
  type: EffectTypeBase | 'cost_mult' | 'unlock' | 'training_slot'
  target?: string // buildingId | resourceId | unitId | etc
  value: number // 乘数，1.1 = +10%
  label: string
}
