<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { useGameStore } from '@/stores/game'
import { EXPLORE_NODES, LAYER_INFO, type StarLayer } from '@/data/explore'
import { NODE_STORIES } from '@/data/story'
import Icon from '@/components/ui/Icon.vue'
import ArchiveSection from './ArchiveSection.vue'

interface StoryRow {
  id: string
  name: string
  layer: StarLayer
  completed: boolean
  story: string
}

const game = useGameStore()
const layers = Object.keys(LAYER_INFO) as StarLayer[]

const storyRows = computed<StoryRow[]>(() =>
  EXPLORE_NODES.map((n) => ({
    id: n.id,
    name: n.name,
    layer: n.layer,
    completed: game.exploration.isCompleted(n.id),
    story: NODE_STORIES[n.id] ?? '',
  }))
)

const storyGroups = computed(() =>
  layers.map((layer) => ({
    layer,
    rows: storyRows.value.filter((r) => r.layer === layer),
    seen: storyRows.value.filter((r) => r.layer === layer && r.completed).length,
  }))
)

const seenStories = computed(() => storyRows.value.filter((r) => r.completed).length)
</script>

<template>
  <ArchiveSection
    icon="i-nav-explore"
    :title="t('archive.starMapSection')"
    :hint="t('archive.starMapHint')"
    :count="t('archive.loreCount', { seen: seenStories, total: storyRows.length })"
  >
    <div
      v-for="g in storyGroups"
      :key="g.layer"
      class="layer-group"
      data-testid="archive-story-group"
    >
      <h4 class="layer-name" :style="{ color: LAYER_INFO[g.layer].color }">
        {{ LAYER_INFO[g.layer].name }}
      </h4>
      <div class="story-list">
        <div
          v-for="row in g.rows"
          :key="row.id"
          class="story-card"
          :class="{ unlocked: row.completed }"
          data-testid="archive-story-card"
        >
          <div class="st-head">
            <span class="st-dot" :style="{ background: LAYER_INFO[row.layer].color }"></span>
            <span class="st-name">{{
              row.completed ? row.name : t('archive.storyLockedName')
            }}</span>
            <Icon v-if="row.completed" class="st-check" name="i-ui-check" size="sm" />
          </div>
          <p v-if="row.completed" class="st-story">{{ row.story }}</p>
          <p v-else class="st-story locked-text">{{ t('archive.storyUnread') }}</p>
        </div>
      </div>
    </div>
  </ArchiveSection>
</template>

<style scoped>
.layer-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.layer-name {
  font-size: var(--text-sm);
  font-weight: 700;
}
.story-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
/* 桌面端宽屏：双列网格，利用横向空间（v1.37） */
@media (min-width: 1024px) {
  .story-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  /* 单卡分组跨列（v1.60）：孤卡跨双列，避免右列留黑；卡内行宽限 68ch */
  .story-list > .story-card:only-child {
    grid-column: span 2;
  }
  .story-list > .story-card:only-child .st-story {
    max-width: 68ch;
  }
}
.story-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-line);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
.story-card.unlocked {
  border-color: var(--color-quantum);
}
.st-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}
.st-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  --c: currentColor;
  box-shadow: var(--glow-1);
}
.st-name {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 600;
}
.story-card:not(.unlocked) .st-name {
  color: var(--color-locked);
}
.st-check {
  color: var(--color-quantum);
}
.st-story {
  font-size: var(--text-xs);
  color: var(--color-t-secondary);
  line-height: 1.6;
}
</style>
