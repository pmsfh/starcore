<script setup lang="ts">
/**
 * BattleStage：对阵舞台（v1.65）
 *
 * 战报播出期双方态势与血条回放：上下两行为我方与敌方，聚合血条按当前帧
 * 血池占比推进（血池上限取开战初始编制），兵种标记随帧更新存活数，阵亡
 * 组置灰划线。数据为瞬态回放帧（combat.resolveBattle 附加字段），不进存档。
 */
import { computed } from 'vue'
import { t } from '@/i18n'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import type { BattleReplayFrame, BattleReplaySide } from '@/stores/combat'

const props = defineProps<{
  frame: BattleReplayFrame
}>()

/** 血池占比（0-100，两位小数）；上限缺失或为零按 0 处理 */
function pctOf(side: BattleReplaySide): number {
  if (side.totalHpMax <= 0) return 0
  const ratio = Math.max(0, Math.min(1, side.totalHp / side.totalHpMax))
  return Math.round(ratio * 10000) / 100
}

const rows = computed(() => [
  {
    key: 'ally',
    label: t('battle.stageAlly'),
    fill: 'var(--color-core)',
    side: props.frame.player,
  },
  {
    key: 'enemy',
    label: t('battle.stageEnemy'),
    fill: 'var(--color-alert)',
    side: props.frame.enemy,
  },
])
</script>

<template>
  <div class="battle-stage" data-testid="battle-stage">
    <div v-for="row in rows" :key="row.key" class="stage-side" :class="row.key">
      <span class="side-label">{{ row.label }}</span>
      <ProgressBar class="stage-bar" fill-class="hp-fill" :pct="pctOf(row.side)" :fill="row.fill" />
      <div class="side-units">
        <span
          v-for="g in row.side.groups"
          :key="g.unitId"
          class="unit-chip"
          :class="{ dead: g.count <= 0 }"
          >{{ g.name }} ×{{ g.count }}</span
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-stage {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border-line);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
}
.stage-side {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.side-label {
  font-size: var(--text-xs);
  color: var(--color-t-secondary);
}
.stage-bar {
  --pb-h: 8px;
  --pb-radius: var(--radius-xs);
  --pb-transition: width 0.25s var(--ease-out);
}
.side-units {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
}
.unit-chip {
  font-size: var(--text-xs);
  color: var(--color-t-secondary);
}
.unit-chip.dead {
  opacity: 0.35;
  text-decoration: line-through;
}
</style>
