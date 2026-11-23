<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { useGameStore } from '@/stores/game'
import { resourceRows } from '@/lib/resource-rows'
import type { ResourceType } from '@/data/buildings'
import { IMPERIAL_CLAIM_CAP_SECONDS } from '@/data/imperial-strongholds'

const game = useGameStore()

/** 当前时刻：随 game 每秒 tick 时间戳联动（lastTickTime 读取建立响应式依赖） */
const now = computed(() => game.lastTickTime)

/** 贡赋池：资源行 + 距上限占比（取占比最高的资源驱动进度条） */
const poolBundle = computed(() => game.imperial.pool(game.combat.expeditionBest, now.value))
const poolRows = computed(() =>
  resourceRows(poolBundle.value, game.resources.allMeta).map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
  }))
)
const poolFill = computed(() => {
  const rates = game.imperial.tributeTotals(game.combat.expeditionBest, now.value)
  let fill = 0
  for (const [res, v] of Object.entries(poolBundle.value)) {
    const rate = rates[res as ResourceType] ?? 0
    if (rate > 0 && v) fill = Math.max(fill, v / (rate * IMPERIAL_CLAIM_CAP_SECONDS))
  }
  return Math.min(1, fill)
})

/** 池临满（v1.82 QoL：任一资源占比 ≥90%，领取按钮警示态 + 提示文案） */
const poolNearFull = computed(() => poolFill.value >= 0.9)

function claimTribute() {
  game.claimImperialTribute(now.value)
}
</script>

<template>
  <div class="imperial-pool" data-testid="imperial-pool">
    <div class="ip-head">
      <span class="ip-title">{{ t('map.imperialPoolTitle') }}</span>
      <span class="ip-cap font-mono">{{ t('map.imperialPoolCap') }}</span>
    </div>
    <div class="ip-bar">
      <div class="ip-fill" :style="{ width: (poolFill * 100).toFixed(1) + '%' }" />
    </div>
    <div class="ip-body">
      <div v-if="poolRows.length === 0" class="ip-empty">
        {{ t('map.imperialPoolEmpty') }}
      </div>
      <div v-else class="ip-rows font-mono">
        <template v-for="(row, i) in poolRows" :key="row.id">
          <span v-if="i > 0"> · </span>{{ row.name }} +{{ row.amount }}
        </template>
      </div>
      <button
        class="btn-accent ip-claim"
        :class="{ 'ip-claim-nearfull': poolNearFull }"
        :disabled="poolRows.length === 0"
        data-testid="imperial-pool-claim"
        @click="claimTribute"
      >
        {{
          poolNearFull && poolRows.length > 0
            ? t('map.imperialClaimNearFull')
            : t('map.imperialClaim')
        }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.imperial-pool {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
}
.ip-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.ip-title {
  font-weight: 600;
}
.ip-cap {
  font-size: var(--text-sm);
  color: var(--color-t-secondary);
}
.ip-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--color-line);
  overflow: hidden;
}
.ip-fill {
  height: 100%;
  background: var(--color-accent, var(--color-t-secondary));
  transition: width 0.3s ease;
}
.ip-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}
.ip-rows {
  font-size: var(--text-sm);
}
.ip-empty {
  font-size: var(--text-sm);
  color: var(--color-t-secondary);
}
.ip-claim {
  flex-shrink: 0;
}
/* 池临满警示（v1.82 QoL）：领取按钮转 alert 强调；光晕静态挂伪元素，
   动画只驱动 opacity（合成器友好，对齐行动队列 in-progress 先例） */
.ip-claim.ip-claim-nearfull {
  --accent: var(--color-alert);
  position: relative;
}
.ip-claim.ip-claim-nearfull::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 12px 2px rgb(226 72 77 / 25%);
  opacity: 0;
  animation: claim-pulse 1.6s ease-in-out infinite;
  will-change: opacity;
  pointer-events: none;
}
@keyframes claim-pulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}
</style>
