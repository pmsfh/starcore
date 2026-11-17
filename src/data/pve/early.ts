/**
 * early.ts：前四层据点
 * 轨道带 / 内层星系 / 外层星系 / 深空带。顺序即星图出征列表顺序，勿重排。
 */
import { t } from '@/i18n'
import type { StrongholdDef } from './types'

export const EARLY_STRONGHOLDS: StrongholdDef[] = [
  // 掠夺者营地
  {
    id: 'raider_1',
    name: t('content.pve.raider_1.name'),
    type: 'raider',
    tier: 1,
    desc: t('content.pve.raider_1.desc'),
    enemies: [
      {
        unitId: 'raider_grunt',
        name: t('content.pve.raider_1.enemy.0.name'),
        attack: 6,
        defense: 3,
        hp: 40,
        count: 5,
        counteredBy: ['assault'],
      },
    ],
    rewards: { energy: 500, alloy: 50, data: 20, relicChance: 0.1 },
    idle: { energy: 2, alloy: 0.2 },
    requires: 'node_orbit',
  },

  {
    id: 'raider_2',
    name: t('content.pve.raider_2.name'),
    type: 'raider',
    tier: 2,
    desc: t('content.pve.raider_2.desc'),
    enemies: [
      {
        unitId: 'raider_grunt',
        name: t('content.pve.raider_2.enemy.0.name'),
        attack: 10,
        defense: 5,
        hp: 60,
        count: 8,
        counteredBy: ['assault'],
      },
      {
        unitId: 'raider_gun',
        name: t('content.pve.raider_2.enemy.1.name'),
        attack: 15,
        defense: 4,
        hp: 50,
        count: 4,
        counteredBy: ['guard', 'psionic'],
      },
    ],
    rewards: { energy: 3000, alloy: 200, data: 100, relicChance: 0.15 },
    idle: { energy: 10, alloy: 1, data: 0.5 },
    requires: 'node_inner',
  },

  {
    id: 'raider_3',
    name: t('content.pve.raider_3.name'),
    type: 'raider',
    tier: 3,
    desc: t('content.pve.raider_3.desc'),
    enemies: [
      {
        unitId: 'raider_gun',
        name: t('content.pve.raider_3.enemy.0.name'),
        attack: 25,
        defense: 8,
        hp: 100,
        count: 10,
        counteredBy: ['guard', 'psionic'],
      },
      {
        unitId: 'raider_tank',
        name: t('content.pve.raider_3.enemy.1.name'),
        attack: 40,
        defense: 20,
        hp: 300,
        count: 3,
        counteredBy: ['heavy'],
      },
    ],
    rewards: {
      energy: 20000,
      alloy: 1000,
      data: 500,
      dark: 2,
      relicChance: 0.25,
      relicRarityBias: 0.3,
    },
    idle: { energy: 50, alloy: 5, data: 3 },
    requires: 'node_outer',
  },

  // 异星巨兽
  {
    id: 'beast_1',
    name: t('content.pve.beast_1.name'),
    type: 'beast',
    tier: 1,
    desc: t('content.pve.beast_1.desc'),
    enemies: [
      {
        unitId: 'crystal_spider',
        name: t('content.pve.beast_1.enemy.0.name'),
        attack: 8,
        defense: 2,
        hp: 30,
        count: 12,
        counteredBy: ['assault'],
      },
    ],
    rewards: { crystal: 500, energy: 300, relicChance: 0.12 },
    idle: { energy: 3, alloy: 0.3 },
    requires: 'node_inner',
  },

  {
    id: 'beast_2',
    name: t('content.pve.beast_2.name'),
    type: 'beast',
    tier: 3,
    desc: t('content.pve.beast_2.desc'),
    enemies: [
      {
        unitId: 'void_beast',
        name: t('content.pve.beast_2.enemy.0.name'),
        attack: 80,
        defense: 30,
        hp: 5000,
        count: 1,
        counteredBy: ['guard', 'psionic'],
      },
    ],
    rewards: {
      energy: 50000,
      alloy: 2000,
      data: 1000,
      dark: 10,
      relicChance: 0.4,
      relicRarityBias: 0.5,
    },
    idle: { energy: 100, alloy: 10, data: 8, dark: 0.5 },
    requires: 'node_deep',
  },

  // 古代遗迹
  {
    id: 'ruin_1',
    name: t('content.pve.ruin_1.name'),
    type: 'ruin',
    tier: 2,
    desc: t('content.pve.ruin_1.desc'),
    enemies: [
      {
        unitId: 'ancient_drone',
        name: t('content.pve.ruin_1.enemy.0.name'),
        attack: 18,
        defense: 10,
        hp: 80,
        count: 6,
        counteredBy: ['heavy'],
      },
    ],
    rewards: { data: 500, energy: 2000, alloy: 300, relicChance: 0.3, relicRarityBias: 0.4 },
    idle: { data: 5, energy: 15, alloy: 2 },
    requires: 'node_outer',
  },

  {
    id: 'ruin_2',
    name: t('content.pve.ruin_2.name'),
    type: 'ruin',
    tier: 4,
    desc: t('content.pve.ruin_2.desc'),
    enemies: [
      {
        unitId: 'temple_guardian',
        name: t('content.pve.ruin_2.enemy.0.name'),
        attack: 120,
        defense: 80,
        hp: 8000,
        count: 2,
        counteredBy: ['guard', 'psionic'],
      },
      {
        unitId: 'ancient_drone',
        name: t('content.pve.ruin_2.enemy.1.name'),
        attack: 40,
        defense: 20,
        hp: 200,
        count: 10,
        counteredBy: ['heavy'],
      },
    ],
    rewards: {
      energy: 200000,
      alloy: 5000,
      data: 5000,
      dark: 30,
      relicChance: 0.6,
      relicRarityBias: 0.8,
    },
    idle: { energy: 300, alloy: 30, data: 20, dark: 1 },
    requires: 'node_deep',
  },

  // 沉默者前哨站
  {
    id: 'silencer_1',
    name: t('content.pve.silencer_1.name'),
    type: 'silencer',
    tier: 4,
    desc: t('content.pve.silencer_1.desc'),
    enemies: [
      {
        unitId: 'silencer_scout',
        name: t('content.pve.silencer_1.enemy.0.name'),
        attack: 100,
        defense: 50,
        hp: 1500,
        count: 5,
        counteredBy: ['assault'],
      },
      {
        unitId: 'silencer_elite',
        name: t('content.pve.silencer_1.enemy.1.name'),
        attack: 200,
        defense: 100,
        hp: 4000,
        count: 2,
        counteredBy: ['heavy'],
      },
    ],
    rewards: {
      energy: 500000,
      alloy: 10000,
      data: 10000,
      dark: 50,
      relicChance: 0.8,
      relicRarityBias: 1.0,
    },
    idle: { energy: 500, alloy: 50, data: 40, dark: 2 },
    requires: 'node_deep',
  },
]
