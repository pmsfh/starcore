/**
 * types.ts：据点与敌方编成的类型定义
 */

import type { UnitId } from '../units'

export type StrongholdType = 'raider' | 'beast' | 'ruin' | 'silencer' | 'imperial'

export interface EnemyUnit {
  unitId: string // 兵种骨架 id（数值模板）
  name: string // 据点特色显示名（v0.97 起注明：换皮名不必与 unitId 字面一致，
  // 如同一 archon_core 在信标据点称「信标核心」、在长堤据点称「长堤核心」）
  attack: number
  defense: number
  hp: number
  count: number
  /** 该敌方单位被哪些玩家兵种克制（命中时触发 attacker.counterMult） */
  counteredBy?: UnitId[]
}

export interface StrongholdDef {
  id: string
  name: string
  type: StrongholdType
  /** 剧情章节标签（探索层级对应的叙事阶段），不代表难度排序；
   *  同 tier 内强度可差一个数量级（如 ruin_3 与 silencer_2 同为 tier 4），
   *  难度梯度以敌方总强度为准，见 endless.ts 的 TEMPLATE_NORMALIZE */
  tier: number
  desc: string
  enemies: EnemyUnit[]
  /** 胜利奖励 */
  rewards: {
    energy?: number
    crystal?: number
    alloy?: number
    data?: number
    dark?: number
    relicChance?: number // 0-1 掉落遗物概率
    relicRarityBias?: number // 偏向稀有度
  }
  /** 驻扎挂机每秒奖励（占领后） */
  idle: {
    energy?: number
    alloy?: number
    data?: number
    dark?: number
  }
  /** 解锁条件：需要完成的探索节点 */
  requires?: string
  /** 帝庭据点标记：胜利不写入常规 completedStrongholds（v1.80） */
  imperial?: boolean
}
