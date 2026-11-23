<script setup lang="ts">
withDefaults(
  defineProps<{
    name: string
    entries: readonly { id: string; name: string; text: string; note: string }[]
    testid: string
    locked?: boolean
    lockedText?: string
    lockedTestid?: string
  }>(),
  { locked: false, lockedText: '', lockedTestid: undefined }
)
</script>

<template>
  <div class="gate-door">
    <h4 class="gate-door-name">{{ name }}</h4>
    <p v-if="locked" class="gate-locked" :data-testid="lockedTestid">{{ lockedText }}</p>
    <div v-else class="gate-grid">
      <article v-for="entry in entries" :key="entry.id" class="gate-card" :data-testid="testid">
        <h5 class="gate-name">{{ entry.name }}</h5>
        <p class="gate-text">{{ entry.text }}</p>
        <p class="gate-note">{{ entry.note }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.gate-locked {
  font-size: var(--text-sm);
  padding: var(--space-3) 0;
}
.gate-door {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.gate-door-name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-layer-void);
}
.gate-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
/* 桌面端宽屏：双列网格（沿星图档案 v1.37 模式） */
@media (min-width: 1024px) {
  .gate-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.gate-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-line);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
.gate-name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-layer-void);
}
.gate-text {
  font-size: var(--text-xs);
  color: var(--color-t-secondary);
  line-height: 1.6;
  margin-top: var(--space-1);
}
.gate-note {
  font-size: var(--text-xs);
  color: var(--color-t-tertiary);
  margin-top: var(--space-1);
}
</style>
