<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { useGameStore } from '@/stores/game'
import { GATE_DOORS } from '@/data/gate'
import ArchiveSection from './ArchiveSection.vue'
import ArchiveDoorGroup from './ArchiveDoorGroup.vue'

const game = useGameStore()

// 解锁 = 完成银河之门探索节点（当前轮；越过应答门扉后的回望视角，判读即算，
// 空门表按未解锁处理，转生后随本轮重新上锁）
const gateUnlocked = computed(
  () => GATE_DOORS.length > 0 && game.exploration.isCompleted('node_galaxy_gate')
)
</script>

<template>
  <ArchiveSection
    icon="i-relic-explore"
    :title="t('archive.gateSection')"
    :hint="t('archive.gateHint')"
    :count="
      gateUnlocked
        ? t('archive.gateCount', { seen: GATE_DOORS.length, total: GATE_DOORS.length })
        : undefined
    "
    testid="archive-gate-group"
  >
    <p v-if="!gateUnlocked" class="gate-locked locked-text" data-testid="archive-gate-locked">
      {{ t('archive.gateLocked') }}
    </p>
    <template v-else>
      <ArchiveDoorGroup
        v-for="door in GATE_DOORS"
        :key="door.id"
        :name="door.name"
        :entries="door.entries"
        testid="archive-gate-card"
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
