/**
 * pve/：PVE 据点定义
 * 4 类据点（共 36 个）：掠夺者营地、异星巨兽、古代遗迹、沉默者前哨站
 * 按星图层分文件存放，拼接顺序即星图出征列表顺序。
 */
import { t } from '@/i18n'
import type { StrongholdDef, StrongholdType } from './types'
import { EARLY_STRONGHOLDS } from './early'
import { STELLAR_STRONGHOLDS } from './stellar'
import { CLUSTER_STRONGHOLDS } from './cluster'
import { ARM_STRONGHOLDS } from './arm'
import { GALAXY_STRONGHOLDS } from './galaxy'
import { VOID_STRONGHOLDS } from './void'

export type { EnemyUnit, StrongholdDef } from './types'

export const STRONGHOLD_TYPES: Record<
  StrongholdType,
  { id: StrongholdType; name: string; color: string; icon: string }
> = {
  raider: {
    id: 'raider',
    name: t('content.pve.type.raider.name'),
    color: 'var(--color-alert)',
    icon: 'i-stronghold-raider',
  },
  beast: {
    id: 'beast',
    name: t('content.pve.type.beast.name'),
    color: 'var(--color-amber)',
    icon: 'i-stronghold-beast',
  },
  ruin: {
    id: 'ruin',
    name: t('content.pve.type.ruin.name'),
    color: 'var(--color-plasma)',
    icon: 'i-stronghold-ruin',
  },
  silencer: {
    id: 'silencer',
    name: t('content.pve.type.silencer.name'),
    color: 'var(--color-silencer)',
    icon: 'i-stronghold-silencer',
  },
  imperial: {
    id: 'imperial',
    name: t('content.pve.type.imperial.name'),
    color: 'var(--color-amber)',
    // 帝庭专属图标待界面版补，系统层先复用沉默者据点图标
    icon: 'i-stronghold-silencer',
  },
}

export const STRONGHOLDS: StrongholdDef[] = [
  ...EARLY_STRONGHOLDS,
  ...STELLAR_STRONGHOLDS,
  ...CLUSTER_STRONGHOLDS,
  ...ARM_STRONGHOLDS,
  ...GALAXY_STRONGHOLDS,
  ...VOID_STRONGHOLDS,
]

/** 据点查找 Map（O(1) 查找） */
const STRONGHOLD_MAP = new Map(STRONGHOLDS.map((s) => [s.id, s]))

export const getStronghold = (id: string): StrongholdDef | undefined => STRONGHOLD_MAP.get(id)

/** 图鉴条目键：据点 id + 敌方编成序号（语言无关） */
export function enemyKey(strongholdId: string, index: number): string {
  return `${strongholdId}#${index}`
}

interface EnemyKindBucket {
  type: keyof typeof STRONGHOLD_TYPES
  entries: { key: string; name: string }[]
}

/**
 * 敌方种数聚合（v1.22 自 ArchiveView 下沉单一来源，后自 archive store 再下沉
 * 到数据层）：按显示名分桶（同 unitId 换皮条目自然合并）；条目键语言无关，
 * 桶数与键面同样语言无关，成就阈值与展示口径共用。
 */
export const ENEMY_KIND_BUCKETS: ReadonlyMap<string, EnemyKindBucket> = (() => {
  const byName = new Map<string, EnemyKindBucket>()
  for (const s of STRONGHOLDS) {
    s.enemies.forEach((e, i) => {
      const bucket = byName.get(e.name) ?? { type: s.type, entries: [] }
      bucket.entries.push({ key: enemyKey(s.id, i), name: e.name })
      byName.set(e.name, bucket)
    })
  }
  return byName
})()

/** 敌方种数（显示名聚合桶数；ach_battle_9 阈值同源） */
export const ENEMY_KIND_TOTAL = ENEMY_KIND_BUCKETS.size

/**
 * 合法图鉴键全集（数据表派生，存档校验与图鉴白名单同源）：
 * 正式据点每个敌方编成条目一个键，共 116 个（36 据点）。
 * 远征 / 周 Boss 合成据点不在 STRONGHOLDS 内，天然不入册。
 */
export const ARCHIVE_ENEMY_KEYS: ReadonlySet<string> = new Set(
  STRONGHOLDS.flatMap((s) => s.enemies.map((_, i) => enemyKey(s.id, i)))
)
