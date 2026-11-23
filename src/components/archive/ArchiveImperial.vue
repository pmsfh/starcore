<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { useGameStore } from '@/stores/game'
import {
  IMPERIAL_ENTRY_COUNT,
  IMPERIAL_FINAL_ENTRY_COUNT,
  IMPERIAL_FINAL_SECTION,
  IMPERIAL_FORGE_ENTRY_COUNT,
  IMPERIAL_FORGE_SECTION,
  IMPERIAL_SECTIONS,
  IMPERIAL_TOTAL_ENTRY_COUNT,
} from '@/data/imperial'
import ArchiveSection from './ArchiveSection.vue'
import ArchiveDoorGroup from './ArchiveDoorGroup.vue'

const game = useGameStore()

// 解锁 = 完成银盘枢纽探索节点（当前轮；贡道走到进贡终点后的观察视角，判读即算，
// 空节表按未解锁处理，转生后随本轮重新上锁，与七门及回响的解锁口径错开）
const imperialUnlocked = computed(
  () => IMPERIAL_SECTIONS.length > 0 && game.exploration.isCompleted('node_galaxy_hub')
)

// 炉前节（v1.81）：解锁 = 曾接管全部 6 座贡道据点（按曾接管集判读，
// 巡检失守不回收档案；与五节观察留档的分组解锁错开）
const imperialFinalUnlocked = computed(() => game.imperial.everCompleted.size >= 6)

// 炉域节（v1.83）：forgeEntered 终身置位即解锁（跨转生保持，与节六 everCompleted 口径同构；
// 置位在炉域入口动作内，首次进门当帧可见）
const imperialForgeUnlocked = computed(() => game.achievements.metricValue('forgeEntered') > 0)

// 分组计数：五节常开，炉前节与炉域节随解锁计入
const imperialSeenCount = computed(
  () =>
    IMPERIAL_ENTRY_COUNT +
    (imperialFinalUnlocked.value ? IMPERIAL_FINAL_ENTRY_COUNT : 0) +
    (imperialForgeUnlocked.value ? IMPERIAL_FORGE_ENTRY_COUNT : 0)
)
</script>

<template>
  <ArchiveSection
    icon="i-tech-prestige"
    :title="t('archive.imperialSection')"
    :hint="t('archive.imperialHint')"
    :count="
      imperialUnlocked
        ? t('archive.imperialCount', {
            seen: imperialSeenCount,
            total: IMPERIAL_TOTAL_ENTRY_COUNT,
          })
        : undefined
    "
    testid="archive-imperial-group"
  >
    <p
      v-if="!imperialUnlocked"
      class="gate-locked locked-text"
      data-testid="archive-imperial-locked"
    >
      {{ t('archive.imperialLocked') }}
    </p>
    <template v-else>
      <ArchiveDoorGroup
        v-for="sec in IMPERIAL_SECTIONS"
        :key="sec.id"
        :name="sec.name"
        :entries="sec.entries"
        testid="archive-imperial-card"
      />
      <ArchiveDoorGroup
        :name="IMPERIAL_FINAL_SECTION.name"
        :entries="IMPERIAL_FINAL_SECTION.entries"
        testid="archive-imperial-final-card"
        :locked="!imperialFinalUnlocked"
        :locked-text="t('archive.imperialFinalLocked')"
        locked-testid="archive-imperial-final-locked"
      />
      <ArchiveDoorGroup
        :name="IMPERIAL_FORGE_SECTION.name"
        :entries="IMPERIAL_FORGE_SECTION.entries"
        testid="archive-imperial-forge-card"
        :locked="!imperialForgeUnlocked"
        :locked-text="t('archive.imperialForgeLocked')"
        locked-testid="archive-imperial-forge-locked"
      />
    </template>
  </ArchiveSection>
</template>

<style scoped>
.gate-locked {
  font-size: var(--text-sm);
  padding: var(--space-3) 0;
}
</style>
