/**
 * game.test.ts：game store 基础集成测试
 *
 * 覆盖 tick 循环、离线补算、转生重置与档案馆生命周期。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { clearAllSaves } from '@/lib/storage'
import { useGameStore } from './game'
import { useResourcesStore } from './resources'
import { useBuildingsStore } from './buildings'
import { BUILDINGS } from '@/data/buildings'
import { STRONGHOLDS } from '@/data/pve'
import { useRelicsStore } from './relics'
import { useTranscendStore } from './transcend'
import { useArchiveStore } from './archive'
import { rollRelic } from '@/data/relics'
import { setRelicSlotProvider } from './relics'

/** 基础能量采集建筑 = BUILDINGS[0]（solar_collector，无 requires） */
const SOLAR = BUILDINGS[0].id
describe('game store — tick integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 重置模块级 slotProvider，防止跨测试污染
    setRelicSlotProvider(() => 0)
  })

  it('tryUpgradeBuilding succeeds with enough resources', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    const buildings = useBuildingsStore()

    resources.setAmount('energy', 500)
    const ok = game.tryUpgradeBuilding(SOLAR)
    expect(ok).toBe(true)
    expect(buildings.getLevel(SOLAR)).toBe(1)
  })

  it('tick runs without error after building upgrade', () => {
    const game = useGameStore()
    const resources = useResourcesStore()

    resources.setAmount('energy', 500)
    game.tryUpgradeBuilding(SOLAR)

    expect(() => game.tick()).not.toThrow()
  })

  it('tick applies resource production', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    const buildings = useBuildingsStore()

    resources.setAmount('energy', 500)
    game.tryUpgradeBuilding(SOLAR)
    expect(buildings.getLevel(SOLAR)).toBe(1)

    // tick 前记录能量
    const before = resources.getAmount('energy').toNumber()
    game.tick()
    const after = resources.getAmount('energy').toNumber()
    // 区间断言锁签到 20000 + 产出上界。
    // delta = 每日签到自动首签 20000（数值源 daily.ts streakReward；签到 tick 驱动，
    // 新档首 tick 必触发）+ solar L1 产出 0.5×dt（dt 为真实时钟差，
    // 测试环境远小于 1s，不确定）
    const delta = after - before
    expect(delta).toBeGreaterThanOrEqual(20000) // 签到 20000
    expect(delta).toBeLessThan(20001) // + 产出 0.5×(<1s)，升级消耗已在 before 之前
  })
})

describe('game store — offline gains', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('computeOfflineGains returns null for short elapsed', () => {
    const game = useGameStore()
    const result = game.computeOfflineGains(30)
    expect(result).toBeNull()
  })

  it('computeOfflineGains returns report for long elapsed with buildings', () => {
    const game = useGameStore()
    const resources = useResourcesStore()

    resources.setAmount('energy', 500)
    game.tryUpgradeBuilding(SOLAR)

    const result = game.computeOfflineGains(600)
    expect(result).not.toBeNull()
    expect(result!.duration).toBe(600)
    // 有建筑产出时，gains 应非空
    expect(Object.keys(result!.gains).length).toBeGreaterThan(0)
  })

  it('offline gains are capped at 24 hours', () => {
    const game = useGameStore()

    const result = game.computeOfflineGains(100000)
    expect(result).not.toBeNull()
    expect(result!.duration).toBe(86400)
  })
})

describe('game store — transcend reset', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 重置模块级 slotProvider，防止跨测试污染
    setRelicSlotProvider(() => 0)
  })

  it('doTranscend resets buildings but keeps relics', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    const buildings = useBuildingsStore()
    const relics = useRelicsStore()
    const transcend = useTranscendStore()

    // 准备：升级建筑 + 获取遗物
    resources.setAmount('energy', 1e9)
    game.tryUpgradeBuilding(SOLAR)
    game.tryUpgradeBuilding(SOLAR)
    expect(buildings.getLevel(SOLAR)).toBe(2)

    // 获取遗物
    const testRelic = rollRelic(0)
    relics.obtain(testRelic)
    expect(relics.ownedCount).toBe(1)

    // 积累足够的 total energy 以满足转生条件
    resources.gain('energy', 1e9)

    // 尝试转生
    expect(game.canTranscend()).toBe(true)
    const result = game.doTranscend()
    expect(result).toBe(true)
    // 建筑应重置
    expect(buildings.getLevel(SOLAR)).toBe(0)
    // 遗物应保留
    expect(relics.ownedCount).toBe(1)
    // 转生次数应增加
    expect(transcend.totalTranscends).toBeGreaterThan(0)
  })

  it('doTranscend 清空本周强敌标记并保留签到与挑战状态', () => {
    const game = useGameStore()
    const resources = useResourcesStore()

    resources.setAmount('energy', 1e9)
    resources.gain('energy', 1e9)
    game.daily.claimWeeklyBoss()
    game.daily.streak = 4
    game.daily.challengeWeek = '2026-W41'
    expect(game.daily.isWeeklyBossDefeated()).toBe(true)

    expect(game.doTranscend()).toBe(true)
    expect(game.daily.weeklyBossClaimedWeek).toBe('')
    expect(game.daily.isWeeklyBossDefeated()).toBe(false)
    expect(game.daily.streak).toBe(4)
    expect(game.daily.challengeWeek).toBe('2026-W41')
  })
})

describe('game store — archive lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 重置模块级 slotProvider，防止跨测试污染
    setRelicSlotProvider(() => 0)
  })

  it('doTranscend keeps archive records', () => {
    const game = useGameStore()
    const archive = useArchiveStore()
    const resources = useResourcesStore()

    archive.recordEncounter(STRONGHOLDS[0].id, STRONGHOLDS[0].enemies)
    archive.recordEncounter(STRONGHOLDS[10].id, STRONGHOLDS[10].enemies)
    const before = archive.seenCount
    expect(before).toBeGreaterThan(0)

    resources.setAmount('energy', 1e9)
    resources.gain('energy', 1e9)
    expect(game.canTranscend()).toBe(true)
    expect(game.doTranscend()).toBe(true)
    // 终身数据：转生保留（与 achievements 同口径）
    expect(archive.seenCount).toBe(before)
  })

  it('hardReset clears archive records', async () => {
    await clearAllSaves()
    const game = useGameStore()
    const archive = useArchiveStore()

    archive.recordEncounter(STRONGHOLDS[0].id, STRONGHOLDS[0].enemies)
    expect(archive.seenCount).toBeGreaterThan(0)

    await game.hardReset()
    expect(archive.seenCount).toBe(0)
    game.stop()
  })
})
