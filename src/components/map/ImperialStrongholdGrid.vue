<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { resourceRows } from '@/lib/resource-rows'
import { fmt } from '@/lib/format'
import type { ResourceType } from '@/data/buildings'
import {
  IMPERIAL_STRONGHOLDS,
  imperialTributeRate,
  type ImperialStrongholdDef,
} from '@/data/imperial-strongholds'
import { EXPLORE_NODES } from '@/data/explore'

const game = useGameStore()
const router = useRouter()

/** 当前时刻：随 game 每秒 tick 时间戳联动（lastTickTime 读取建立响应式依赖） */
const now = computed(() => game.lastTickTime)

/** 贡道区解锁：银盘枢纽（与档案馆帝庭档案分组同门槛） */
const routeUnlocked = computed(() => game.exploration.isCompleted('node_galaxy_hub'))

/** 节点 id → 显示名（锁定原因展示用） */
const NODE_NAME = new Map(EXPLORE_NODES.map((n) => [n.id, n.name]))

/** 单座据点行的派生视图（状态 / 速率 / 整备成本一次算齐） */
interface ImperialRow {
  def: ImperialStrongholdDef
  captured: boolean
  /** 本周巡检目标（已接管座 + 待迎战/逾期态，卡头亮标） */
  isAuditTarget: boolean
  suspended: boolean
  tier: number
  rate: number
  locked: boolean
  requireLabel: string
  upgradeRows: { id: string; name: string; amount: string }[]
  upgradeAffordable: boolean
  maxTier: boolean
}

const rows = computed<ImperialRow[]>(() => {
  const best = game.combat.expeditionBest
  const capturedCount = game.imperial.completed.size
  const out: ImperialRow[] = []
  for (const def of IMPERIAL_STRONGHOLDS) {
    const nodeOk = game.exploration.isCompleted(def.requires)
    const capturedOk = capturedCount >= (def.requiresCaptured ?? 0)
    const captured = game.imperial.completed.has(def.id)
    const tier = game.imperial.tierOf(def.id)
    const cost = captured ? game.imperial.upgradeCost(def.id, best) : null
    const a = game.imperial.audit
    const isAuditTarget =
      captured && !!a && a.targetId === def.id && (a.status === 'pending' || a.status === 'overdue')
    out.push({
      def,
      captured,
      isAuditTarget,
      suspended: game.imperial.isSuspended(def.id, now.value),
      tier,
      // 未接管座按 1 级预估速率展示（接管决策参考）；已接管座取实时
      // 速率（含整备加成与停摆归零）
      rate: captured
        ? game.imperial.rateOf(def.id, best, now.value)
        : imperialTributeRate(def, best, 1),
      locked: !(routeUnlocked.value && nodeOk && capturedOk),
      requireLabel: !nodeOk
        ? t('map.imperialRequireNode', { node: NODE_NAME.get(def.requires) ?? def.requires })
        : t('map.imperialRequireCaptured', { n: def.requiresCaptured ?? 0 }),
      upgradeRows: cost
        ? resourceRows(cost, game.resources.allMeta).map((r) => ({
            id: r.id,
            name: r.name,
            amount: r.amount,
          }))
        : [],
      upgradeAffordable: cost ? game.resources.canAfford(cost) : false,
      maxTier: tier >= 3,
    })
  }
  return out
})

function upgradeStronghold(id: string) {
  game.upgradeImperialStronghold(id)
}
function toBattle(id: string) {
  router.push(`/battle/${id}`)
}

/** 资源显示名（据点卡未接管态的贡赋资源行） */
function resourceName(res: ResourceType): string {
  return game.resources.allMeta[res]?.name ?? res
}
</script>

<template>
  <div class="imperial-grid">
    <div
      v-for="row in rows"
      :key="row.def.id"
      class="imperial-card"
      :class="{ captured: row.captured, suspended: row.suspended, locked: row.locked }"
      :data-testid="`imperial-${row.def.id}`"
    >
      <div class="ic-head">
        <span class="ic-name">
          {{ row.def.name }}
          <span
            v-if="row.isAuditTarget"
            class="ic-audit-badge"
            data-testid="imperial-audit-target-badge"
            >{{ t('map.imperialAuditTarget') }}</span
          >
        </span>
        <span v-if="row.captured" class="ic-tier font-mono">
          {{ t('map.imperialTier', { level: row.tier }) }}
        </span>
      </div>
      <p class="ic-desc">{{ row.def.desc }}</p>
      <div class="ic-status">
        <template v-if="row.locked">{{ row.requireLabel }}</template>
        <template v-else-if="row.suspended">
          <span class="ic-suspended">{{ t('map.imperialSuspended') }}</span>
        </template>
        <template v-else-if="row.captured">
          {{ t('map.imperialCaptured') }} · +{{ fmt(row.rate) }}/s
        </template>
        <template v-else>{{ resourceName(row.def.resource) }} +{{ fmt(row.rate) }}/s</template>
      </div>
      <div class="ic-actions">
        <button
          v-if="!row.locked && !row.captured"
          class="btn-accent"
          :data-testid="`imperial-${row.def.id}-capture`"
          @click="toBattle(row.def.id)"
        >
          {{ t('map.imperialCapture') }}
        </button>
        <template v-else-if="row.captured">
          <button
            v-if="!row.maxTier"
            class="btn-secondary"
            :disabled="!row.upgradeAffordable"
            :data-testid="`imperial-${row.def.id}-upgrade`"
            @click="upgradeStronghold(row.def.id)"
          >
            {{ t('map.imperialUpgrade') }}
            <template v-for="(r, i) in row.upgradeRows" :key="r.id">
              <span v-if="i > 0"> · </span>{{ r.name }} {{ r.amount }}
            </template>
          </button>
          <span v-else class="ic-max">{{ t('map.imperialMaxTier') }}</span>
        </template>
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.imperial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: var(--space-3);
}
.imperial-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
}
.imperial-card.locked {
  opacity: 0.55;
}
.imperial-card.suspended {
  border-color: var(--color-alert);
}
.ic-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
}
.ic-name {
  font-weight: 600;
}
.ic-tier {
  font-size: var(--text-sm);
  color: var(--color-t-secondary);
}
.ic-desc {
  font-size: var(--text-sm);
  color: var(--color-t-secondary);
}
.ic-status {
  font-size: var(--text-sm);
}
.ic-suspended {
  color: var(--color-alert);
}
.ic-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-sm);
}
.ic-max {
  color: var(--color-t-secondary);
}
</style>
