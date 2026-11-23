<script setup lang="ts">
/**
 * ArchiveView.vue：档案馆（v1.18 可玩内容扩展方案 1）
 *
 * 页面骨架只保留标题与五个分组组件：
 * - 星图档案：34 节点按星层分组回读剧情，未完成锁定不剧透
 * - 七门：完成银河之门后解锁的观察留档
 * - 帝庭档案：完成银盘枢纽后解锁的五节留档，附炉前节与炉域节
 * - 回响：全宇宙探索完毕后的门后见闻
 * - 敌方档案：56 种敌方单位图鉴，交战即收录
 */
import { t } from '@/i18n'
import ArchiveStarMap from '@/components/archive/ArchiveStarMap.vue'
import ArchiveGates from '@/components/archive/ArchiveGates.vue'
import ArchiveImperial from '@/components/archive/ArchiveImperial.vue'
import ArchiveEcho from '@/components/archive/ArchiveEcho.vue'
import ArchiveBestiary from '@/components/archive/ArchiveBestiary.vue'
</script>

<template>
  <div class="archive-view screen-enter">
    <h2 class="page-title font-display">{{ t('archive.title') }}</h2>
    <p class="page-sub">{{ t('archive.subtitle') }}</p>

    <ArchiveStarMap />
    <ArchiveGates />
    <ArchiveImperial />
    <ArchiveEcho />
    <ArchiveBestiary />
  </div>
</template>

<style scoped>
.archive-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.page-title {
  color: var(--color-quantum);
}
.page-sub {
  font-size: var(--text-sm);
  color: var(--color-t-secondary);
}
</style>
