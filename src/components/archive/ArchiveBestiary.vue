<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { useGameStore } from '@/stores/game'
import { ENEMY_KIND_BUCKETS } from '@/data/pve'
import { STRONGHOLDS, STRONGHOLD_TYPES } from '@/data/pve'
import { getBestiaryNoteForEntries, type BestiaryNote } from '@/data/bestiary'
import Icon from '@/components/ui/Icon.vue'
import ArchiveSection from './ArchiveSection.vue'

/** 据点四类 id（与 pve/types.ts 的 StrongholdType 同源） */
type StrongholdType = keyof typeof STRONGHOLD_TYPES

interface EnemyCard {
  /** 聚合显示名（首个条目的名） */
  name: string
  type: StrongholdType
  seen: boolean
  /** 该名下全部条目是否都已遭遇（收集口径展示用） */
  complete: boolean
  /** 代表条目（首个已遭遇者；未遭遇时为该名首条） */
  representativeIndex: number
  representativeStronghold: string
  /** 生态注（仅异星巨兽部分物种配注；代表键语言无关，显示名运行时取） */
  note?: BestiaryNote
}

const game = useGameStore()
const archive = game.archive
const typeOrder: StrongholdType[] = ['raider', 'beast', 'ruin', 'silencer']

const enemyCards = computed<EnemyCard[]>(() => {
  // 名 → 聚合桶（同显示名多据点条目合并；聚合桶单一来源 = archive store 的
  // ENEMY_KIND_BUCKETS，v1.22 下沉后视图只补进度态）
  const byName = ENEMY_KIND_BUCKETS
  const cards: EnemyCard[] = []
  for (const [name, bucket] of byName) {
    const entries = bucket.entries.map((e) => ({
      key: e.key,
      seen: archive.hasSeen(e.key),
    }))
    const seenEntry = entries.find((e) => e.seen)
    cards.push({
      name,
      type: bucket.type,
      seen: entries.some((e) => e.seen),
      complete: entries.every((e) => e.seen),
      representativeIndex: Number((seenEntry ?? entries[0]).key.split('#')[1]),
      representativeStronghold: (seenEntry ?? entries[0]).key.split('#')[0],
      note: getBestiaryNoteForEntries(bucket.entries.map((e) => e.key)),
    })
  }
  return cards
})

const enemyGroups = computed(() =>
  typeOrder.map((type) => ({
    type,
    cards: enemyCards.value.filter((c) => c.type === type),
    seen: enemyCards.value.filter((c) => c.type === type && c.seen).length,
  }))
)

const seenEnemies = computed(() => enemyCards.value.filter((c) => c.seen).length)

/** 图鉴卡展示属性取代表条目（首个已遭遇者） */
function cardEnemy(card: EnemyCard) {
  const s = STRONGHOLDS.find((x) => x.id === card.representativeStronghold)
  return s?.enemies[card.representativeIndex]
}
</script>

<template>
  <ArchiveSection
    icon="i-ui-sword"
    :title="t('archive.bestiarySection')"
    :hint="t('archive.bestiaryHint')"
    :count="t('archive.enemyCount', { seen: seenEnemies, total: enemyCards.length })"
  >
    <div v-for="g in enemyGroups" :key="g.type" class="type-group">
      <h4 class="type-name" :style="{ color: STRONGHOLD_TYPES[g.type].color }">
        {{ STRONGHOLD_TYPES[g.type].name }}
      </h4>
      <div class="enemy-grid">
        <div
          v-for="card in g.cards"
          :key="card.name"
          class="enemy-card"
          :class="{ seen: card.seen }"
          data-testid="archive-enemy-card"
        >
          <div class="e-icon-wrap">
            <Icon class="e-icon" :name="STRONGHOLD_TYPES[card.type].icon" />
          </div>
          <div class="e-body">
            <div class="e-name">
              {{ card.seen ? card.name : t('archive.unknownEnemy') }}
            </div>
            <div v-if="card.seen && cardEnemy(card)" class="e-stats font-mono">
              <span>{{ t('common.statAttack') }} {{ cardEnemy(card)!.attack }}</span>
              <span>{{ t('common.statDefense') }} {{ cardEnemy(card)!.defense }}</span>
              <span>HP {{ cardEnemy(card)!.hp }}</span>
            </div>
            <div v-else class="e-stats locked-text">{{ t('archive.unknownEnemyDesc') }}</div>
            <div v-if="card.seen && card.note" class="e-note" data-testid="archive-beast-note">
              <p>{{ card.note.mig }}</p>
              <p>{{ card.note.feed }}</p>
              <p>{{ card.note.hab }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ArchiveSection>
</template>

<style scoped>
.type-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.type-name {
  font-size: var(--text-sm);
  font-weight: 700;
}
.enemy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-2);
}
.enemy-card {
  display: flex;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border-line);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
.enemy-card.seen {
  border-color: var(--color-quantum);
}
.e-icon-wrap {
  flex-shrink: 0;
  width: var(--icon-lg);
  height: var(--icon-lg);
}
.e-icon {
  width: var(--icon-lg);
  height: var(--icon-lg);
  color: var(--color-t-tertiary);
}
.enemy-card.seen .e-icon {
  color: var(--color-quantum);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--color-quantum) 40%, transparent));
}
.e-body {
  flex: 1;
  min-width: 0;
}
.e-name {
  font-size: var(--text-sm);
  font-weight: 600;
}
.enemy-card:not(.seen) .e-name {
  color: var(--color-locked);
}
.e-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-t-secondary);
  margin-top: var(--space-1);
}
/* 生态注区：仅已收录异星巨兽卡出现；三行允许折行，两端一致 */
.e-note {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px dashed var(--color-border-line);
  font-size: var(--text-xs);
  color: var(--color-t-tertiary);
  line-height: 1.5;
}
</style>
