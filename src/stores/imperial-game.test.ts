/**
 * imperial-game.test.ts：帝庭据点线门面接线（v1.80）
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from './game'
import { IMPERIAL_ANCHOR_BEST } from '@/data/imperial-strongholds'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('game — 帝庭据点门面', () => {
  it('领取贡赋写入资源并清池', () => {
    const game = useGameStore()
    game.imperial.reset()
    game.resources.reset()
    const resources = game.resources
    game.combat.expeditionBest = IMPERIAL_ANCHOR_BEST
    const t0 = Date.now()
    game.imperial.capture('imp_pass', t0)
    const before = resources.getAmount('energy').toNumber()
    game.claimImperialTribute(t0 + 3600 * 1000)
    expect(resources.getAmount('energy').toNumber()).toBeGreaterThan(before)
    expect(game.imperial.pool(IMPERIAL_ANCHOR_BEST, t0 + 3600 * 1000)).toEqual({})
  })

  it('整备扣费成功，资源不足失败', () => {
    const game = useGameStore()
    game.imperial.reset()
    game.resources.reset()
    const resources = game.resources
    game.combat.expeditionBest = IMPERIAL_ANCHOR_BEST
    game.imperial.capture('imp_pass')
    expect(game.upgradeImperialStronghold('imp_pass')).toBe(false)
    resources.setAmount('energy', 1e15)
    expect(game.upgradeImperialStronghold('imp_pass')).toBe(true)
    expect(game.imperial.tierOf('imp_pass')).toBe(2)
  })

  it('巡检打点扣费并通过', () => {
    const game = useGameStore()
    game.imperial.reset()
    game.resources.reset()
    const resources = game.resources
    game.combat.expeditionBest = IMPERIAL_ANCHOR_BEST
    game.imperial.capture('imp_pass')
    game.imperial.ensureAudit('2026-W45', Date.now())
    resources.setAmount('energy', 1e15)
    expect(game.payImperialAudit()).toBe(true)
    expect(game.imperial.audit?.status).toBe('passed')
    expect(game.imperial.audit?.paid).toBe(true)
  })

  it('迎战结算：胜利通过，失败失守', () => {
    const game = useGameStore()
    game.imperial.reset()
    game.resources.reset()
    game.combat.expeditionBest = IMPERIAL_ANCHOR_BEST
    game.imperial.capture('imp_pass')
    const a = game.imperial.ensureAudit('2026-W45', Date.now())
    expect(game.imperial.isOccupied('imp_pass')).toBe(true)
    expect(a).not.toBeNull()
    expect(game.imperial.audit?.status).toBe('pending')
    expect(game.settleImperialAudit(true)).toBe(true)
    expect(game.imperial.audit?.status).toBe('passed')

    game.imperial.ensureAudit('2026-W46', Date.now() + 8 * 24 * 3600 * 1000)
    expect(game.settleImperialAudit(false)).toBe(true)
    expect(game.imperial.isOccupied('imp_pass')).toBe(false)
  })
})
