<script setup lang="ts">
/**
 * ImperialRouteSection.vue：贡道区（v1.81）
 *
 * 区头只保留解锁判读与已接管计数，内容拆为四件：
 * - ImperialAuditCard：巡检五态与打点
 * - ImperialStrongholdGrid：六座据点卡与整备升级
 * - ImperialForgePanel：炉域进入、稳定度与倾贡
 * - ImperialPool：贡赋池与领取
 */
import { computed } from 'vue'
import { t } from '@/i18n'
import { useGameStore } from '@/stores/game'
import ImperialAuditCard from './ImperialAuditCard.vue'
import ImperialStrongholdGrid from './ImperialStrongholdGrid.vue'
import ImperialForgePanel from './ImperialForgePanel.vue'
import ImperialPool from './ImperialPool.vue'

const game = useGameStore()

/** 贡道区解锁：银盘枢纽（与档案馆帝庭档案分组同门槛） */
const routeUnlocked = computed(() => game.exploration.isCompleted('node_galaxy_hub'))

/** 已接管计数（区头 n/6） */
const heldCount = computed(() => game.imperial.completed.size)
</script>

<template>
  <section class="imperial-section" data-testid="imperial-section">
    <h3 class="section-title alert">
      {{ t('map.imperialSectionTitle') }}
      <span v-if="routeUnlocked" class="count-lead font-mono" data-testid="imperial-held-count">{{
        t('map.imperialHeldCount', { n: heldCount })
      }}</span>
    </h3>
    <p class="imperial-hint">{{ t('map.imperialSectionHint') }}</p>
    <p v-if="!routeUnlocked" class="locked-text" data-testid="imperial-route-locked">
      {{ t('map.imperialLocked') }}
    </p>
    <template v-else>
      <ImperialAuditCard />
      <ImperialStrongholdGrid>
        <ImperialForgePanel />
      </ImperialStrongholdGrid>
      <ImperialPool />
    </template>
  </section>
</template>

<style scoped>
.imperial-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.imperial-hint {
  font-size: var(--text-sm);
  color: var(--color-t-secondary);
}
</style>
