<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'

defineProps<{
  icon: string
  title: string
  hint: string
  count?: string
  testid?: string
}>()
</script>

<template>
  <section class="section" :data-testid="testid">
    <h3 class="section-title with-icon">
      <Icon class="s-icon" :name="icon" />
      {{ title }}
      <span v-if="count" class="count-lead font-mono">{{ count }}</span>
    </h3>
    <p class="section-hint">{{ hint }}</p>
    <slot />
  </section>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.s-icon {
  width: var(--icon-sm);
  height: var(--icon-sm);
  color: var(--color-t-secondary);
}
.count-lead {
  font-size: var(--text-xs);
  color: var(--color-t-tertiary);
  font-weight: 400;
}
.section-hint {
  font-size: var(--text-xs);
  color: var(--color-t-tertiary);
}
.section :deep(.locked-text) {
  color: var(--color-locked);
}
</style>
