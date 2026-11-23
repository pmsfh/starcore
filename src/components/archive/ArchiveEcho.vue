<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { useGameStore } from '@/stores/game'
import { EXPLORE_NODES } from '@/data/explore'
import { ECHO_ENTRIES, ECHO_SEGMENTS } from '@/data/echo'
import ArchiveSection from './ArchiveSection.vue'

const game = useGameStore()

// 解锁 = 当前轮全宇宙探索完毕（与星图档案、首页贺词同口径逐节点判读，
// 空节点表按未解锁处理，转生后随本轮重新上锁）
const echoUnlocked = computed(
  () =>
    EXPLORE_NODES.length > 0 &&
    EXPLORE_NODES.every((n) => game.exploration.isCompleted(n.id)) &&
    ECHO_ENTRIES.length > 0
)
</script>

<template>
  <ArchiveSection
    icon="i-relic-silence"
    :title="t('archive.echoSection')"
    :hint="t('archive.echoHint')"
    :count="
      echoUnlocked
        ? t('archive.echoCount', { seen: ECHO_ENTRIES.length, total: ECHO_ENTRIES.length })
        : undefined
    "
    testid="archive-echo-group"
  >
    <p v-if="!echoUnlocked" class="echo-locked locked-text" data-testid="archive-echo-locked">
      {{ t('archive.echoLocked') }}
    </p>
    <template v-else>
      <div v-for="seg in ECHO_SEGMENTS" :key="seg.id" class="echo-segment">
        <h4 class="echo-seg-name">{{ seg.name }}</h4>
        <div class="echo-grid">
          <article
            v-for="e in ECHO_ENTRIES.slice(seg.start, seg.end)"
            :key="e.id"
            class="echo-card"
            data-testid="archive-echo-card"
          >
            <h5 class="echo-name font-display">{{ e.name }}</h5>
            <p class="echo-text">{{ e.text }}</p>
            <p class="echo-note font-mono">{{ e.note }}</p>
          </article>
        </div>
      </div>
    </template>
  </ArchiveSection>
</template>

<style scoped>
.echo-locked {
  font-size: var(--text-sm);
  padding: var(--space-3) 0;
}
.echo-segment {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.echo-seg-name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-layer-void);
}
.echo-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
/* 桌面端宽屏：双列网格（沿星图档案 v1.37 模式） */
@media (min-width: 1024px) {
  .echo-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.echo-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-line);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
.echo-name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-layer-void);
}
.echo-text {
  font-size: var(--text-xs);
  color: var(--color-t-secondary);
  line-height: 1.6;
  margin-top: var(--space-1);
}
.echo-note {
  font-size: var(--text-xs);
  color: var(--color-t-tertiary);
  margin-top: var(--space-1);
}
</style>
