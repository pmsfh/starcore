<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { useGameStore } from '@/stores/game'
import { fmt } from '@/lib/format'
import type { ResourceType } from '@/data/buildings'
import {
  FORGE_INPUT_RESOURCES,
  FORGE_STABILITY_MAX,
  FORGE_TRIBUTE_COST,
  FORGE_TRIBUTE_REFILL,
  forgeYield,
  pickForgeResource,
  type ForgeInputResource,
} from '@/data/imperial-strongholds'

const game = useGameStore()

/** 当前时刻：随 game 每秒 tick 时间戳联动（lastTickTime 读取建立响应式依赖） */
const now = computed(() => game.lastTickTime)

const forgeUnlocked = computed(() => game.imperial.forgeUnlocked)
const forgeEntered = computed(() => game.imperial.forge !== null)
/** 当前稳定度（随 tick 补算显示，不落盘） */
const forgeStabilityNow = computed(() => game.imperial.forgeStability(now.value))
const forgePicked = computed(() => pickForgeResource(game.daily.currentWeek))
const forgePickedName = computed(() => resourceName(forgePicked.value))
/** 四选一投入按钮行：点名标记 + 验资 */
const forgeTributeRows = computed(() =>
  FORGE_INPUT_RESOURCES.map((r) => ({
    id: r,
    name: resourceName(r),
    cost: FORGE_TRIBUTE_COST[r],
    picked: r === forgePicked.value,
    affordable: game.resources.getAmount(r).gte(FORGE_TRIBUTE_COST[r]),
  }))
)
/** 当日剩余倾贡次数（0 时四按钮全部禁用） */
const forgeRemaining = computed(() => game.imperial.forgeRemainingToday(now.value))
/** 本次回礼预览：按倾贡后稳定度档位结算，普通与点名各一档 */
const forgePreview = computed(() => {
  const after = Math.min(FORGE_STABILITY_MAX, forgeStabilityNow.value + FORGE_TRIBUTE_REFILL)
  return { base: forgeYield(after, false), picked: forgeYield(after, true) }
})
function enterForge(): void {
  game.enterForge()
}
function giveTribute(r: ForgeInputResource): void {
  game.tributeForge(r)
}

/** 资源显示名（炉域投入按钮） */
function resourceName(res: ResourceType): string {
  return game.resources.allMeta[res]?.name ?? res
}
</script>

<template>
  <div class="imperial-forge" data-testid="imperial-forge">
    <div class="if-head">
      <span class="if-title">{{ t('content.imperialStrongholds.forge.name') }}</span>
      <span v-if="forgeEntered" class="if-stab font-mono" data-testid="imperial-forge-stability">
        {{ t('content.imperialStrongholds.forge.stabilityLabel') }}
        {{ Math.floor(forgeStabilityNow) }}/{{ FORGE_STABILITY_MAX }}
      </span>
    </div>
    <p v-if="!forgeUnlocked" class="locked-text" data-testid="imperial-forge-locked">
      {{ t('content.imperialStrongholds.forge.lockedDesc') }}
    </p>
    <template v-else>
      <p class="if-desc">{{ t('content.imperialStrongholds.forge.desc') }}</p>
      <button
        v-if="!forgeEntered"
        class="btn-accent if-enter"
        data-testid="imperial-forge-enter"
        @click="enterForge"
      >
        {{ t('content.imperialStrongholds.forge.enter') }}
      </button>
      <template v-else>
        <div class="if-bar">
          <div
            class="if-fill"
            :style="{ width: (forgeStabilityNow / FORGE_STABILITY_MAX) * 100 + '%' }"
          />
        </div>
        <p class="if-pick font-mono" data-testid="imperial-forge-pick">
          {{ t('content.imperialStrongholds.forge.pickHint', { res: forgePickedName }) }}
        </p>
        <p class="if-remaining font-mono" data-testid="imperial-forge-remaining">
          {{ t('content.imperialStrongholds.forge.remaining', { n: forgeRemaining }) }}
        </p>
        <div class="if-tributes">
          <button
            v-for="row in forgeTributeRows"
            :key="row.id"
            class="btn-secondary if-tribute"
            :class="{ 'if-picked': row.picked }"
            :disabled="!row.affordable || forgeRemaining === 0"
            :title="t('content.imperialStrongholds.forge.tributeHint')"
            :data-testid="`imperial-forge-tribute-${row.id}`"
            @click="giveTribute(row.id)"
          >
            {{ t('content.imperialStrongholds.forge.tribute') }} · {{ row.name }}
            {{ fmt(row.cost) }}
            <span v-if="row.picked">×3</span>
          </button>
        </div>
        <p class="if-preview font-mono" data-testid="imperial-forge-yield-preview">
          {{
            t('content.imperialStrongholds.forge.yieldPreview', {
              base: fmt(forgePreview.base),
              picked: fmt(forgePreview.picked),
            })
          }}
        </p>
        <p class="if-desc">{{ t('content.imperialStrongholds.forge.yieldDesc') }}</p>
        <p class="if-desc">{{ t('content.imperialStrongholds.forge.stabilityDesc') }}</p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.imperial-forge {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
}
.if-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}
.if-title {
  font-weight: 600;
}
.if-stab {
  font-size: var(--text-sm);
  color: var(--color-t-secondary);
}
.if-desc {
  font-size: var(--text-sm);
  color: var(--color-t-secondary);
}
.if-preview {
  font-size: var(--text-sm);
  color: var(--color-t-secondary);
}
.if-bar {
  height: 8px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-soft);
  overflow: hidden;
}
.if-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  transition: width 0.3s ease;
}
.if-pick {
  font-size: var(--text-sm);
  color: var(--color-accent);
}
.if-remaining {
  font-size: var(--text-sm);
  color: var(--color-t-secondary);
}
.if-tributes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.if-tribute.if-picked {
  border-color: var(--color-accent);
}
</style>
