<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { resourceRows } from '@/lib/resource-rows'
import { fmtTime } from '@/lib/format'
import { IMPERIAL_AUDIT_STRICT_BONUS, IMPERIAL_STRONGHOLDS } from '@/data/imperial-strongholds'

const game = useGameStore()
const router = useRouter()

/** 当前时刻：随 game 每秒 tick 时间戳联动（lastTickTime 读取建立响应式依赖） */
const now = computed(() => game.lastTickTime)

/** 巡检视图状态：pending / overdue 可迎战可打点，其余只读 */
interface AuditView {
  key: 'pending' | 'overdue' | 'passed' | 'paid' | 'failed'
  text: string
  fightable: boolean
  /** 窗口临近关闭（v1.82 QoL：pending 剩余不足 12 小时，卡面警示态） */
  urgent: boolean
}

/** 巡检临期阈值（秒）：剩余不足此值的 pending 巡检进入警示态 */
const AUDIT_URGENT_SECONDS = 12 * 3600

const auditView = computed<AuditView | null>(() => {
  const a = game.imperial.audit
  if (!a) return null
  const target = IMPERIAL_STRONGHOLDS.find((s) => s.id === a.targetId)
  const name = target?.name ?? a.targetId
  switch (a.status) {
    case 'pending':
      return {
        key: 'pending',
        text: t('map.imperialAuditPending', {
          name,
          time: fmtTime(Math.max(0, (a.deadline - now.value) / 1000)),
        }),
        fightable: true,
        urgent: (a.deadline - now.value) / 1000 < AUDIT_URGENT_SECONDS,
      }
    case 'overdue':
      return {
        key: 'overdue',
        text: t('map.imperialAuditOverdue', { name }),
        fightable: true,
        urgent: true,
      }
    case 'passed':
      return a.paid
        ? { key: 'paid', text: t('map.imperialAuditPaid'), fightable: false, urgent: false }
        : {
            key: 'passed',
            text: t('map.imperialAuditPassed', {
              pct: game.imperial.bonus === IMPERIAL_AUDIT_STRICT_BONUS ? 30 : 10,
            }),
            fightable: false,
            urgent: false,
          }
    case 'failed':
      return {
        key: 'failed',
        text: t('map.imperialAuditFailed', { name }),
        fightable: false,
        urgent: false,
      }
  }
  // status 为穷尽联合，此行仅为 lint 显式兜底（vue/return-in-computed-property）
  return null
})

/** 打点成本（仅待迎战/逾期时展示） */
const payCostRows = computed(() => {
  if (!auditView.value?.fightable) return []
  const cost = game.imperial.auditPayCost(game.combat.expeditionBest, now.value)
  if (!cost) return []
  return resourceRows(cost, game.resources.allMeta).map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
  }))
})

const payAffordable = computed(() => {
  if (!auditView.value?.fightable) return false
  const cost = game.imperial.auditPayCost(game.combat.expeditionBest, now.value)
  return cost ? game.resources.canAfford(cost) : false
})

function payAudit() {
  game.payImperialAudit()
}
function toBattle(id: string) {
  router.push(`/battle/${id}`)
}
</script>

<template>
  <div
    v-if="auditView"
    class="imperial-audit"
    :class="{ 'ia-urgent': auditView.urgent }"
    :data-testid="`imperial-audit-${auditView.key}`"
  >
    <div class="ia-left">
      <span class="ia-title">{{ t('map.imperialAuditTitle') }}</span>
      <span class="ia-text">{{ auditView.text }}</span>
    </div>
    <div v-if="auditView.fightable" class="ia-actions">
      <button
        class="btn-accent ia-fight"
        data-testid="imperial-audit-fight"
        @click="toBattle('imperial_audit')"
      >
        {{ t('map.imperialAuditFight') }}
      </button>
      <button
        class="btn-secondary ia-pay"
        :disabled="!payAffordable"
        :data-testid="payAffordable ? 'imperial-audit-pay' : 'imperial-audit-pay-disabled'"
        @click="payAudit"
      >
        {{ t('map.imperialAuditPay') }}
        <template v-for="(row, i) in payCostRows" :key="row.id">
          <span v-if="i > 0"> · </span>{{ row.name }} {{ row.amount }}
        </template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.imperial-audit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
}
/* 巡检临期/逾期警示（v1.82 QoL）：边框与文字转 alert 色 */
.imperial-audit.ia-urgent {
  border-color: var(--color-alert);
}
.imperial-audit.ia-urgent .ia-text {
  color: var(--color-alert);
  font-weight: 600;
}
.ia-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}
.ia-title {
  font-weight: 600;
}
.ia-text {
  font-size: var(--text-sm);
  color: var(--color-t-secondary);
}
.ia-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex-shrink: 0;
}
.ia-pay {
  font-size: var(--text-sm);
  white-space: nowrap;
}

@media (max-width: 390px) {
  .imperial-audit {
    flex-direction: column;
    align-items: stretch;
  }
  .ia-actions {
    flex-direction: row;
  }
  .ia-pay {
    white-space: normal;
  }
}
</style>
