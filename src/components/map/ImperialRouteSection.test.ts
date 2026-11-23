/**
 * ImperialRouteSection.test.ts：贡道区组件测试（拆件前行为钉住）
 *
 * 覆盖：解锁与计数、巡检五态与打点、六座据点卡状态、贡赋池、
 * 炉域进入与倾贡、时间推进后的显示联动。
 *
 * 说明：先挂载再落状态。组件测试与 store 必须共用 mount 安装的 pinia，
 * 挂载前调 store 会落到另一个 pinia 实例，断言随文件执行顺序漂移。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { mountView, useViewTestHooks, sharedVueRouterMock, focusTrapMock } from '@/tests/view-mount'
import ImperialRouteSection from './ImperialRouteSection.vue'
import { useGameStore } from '@/stores/game'
import { EXPLORE_NODES } from '@/data/explore'
import {
  FORGE_TRIBUTE_COST,
  IMPERIAL_STRONGHOLDS,
  pickForgeResource,
} from '@/data/imperial-strongholds'

vi.mock('vue-router', () => sharedVueRouterMock())
vi.mock('@/composables/useFocusTrap', () => focusTrapMock())

type Game = ReturnType<typeof useGameStore>

const ALL_NODES = [
  'node_galaxy_hub',
  'node_arm_gate',
  'node_arm_spine',
  'node_arm_cradle',
  'node_galaxy_range',
  'node_galaxy_halo',
]

function nodeName(id: string): string {
  return EXPLORE_NODES.find((n) => n.id === id)?.name ?? id
}

function progressOf(ids: string[]) {
  const progress: Record<
    string,
    { nodeId: string; startTime: number; endTime: number; completed: boolean }
  > = {}
  for (const id of ids) progress[id] = { nodeId: id, startTime: 0, endTime: 0, completed: true }
  return progress
}

/** 落探索与帝庭状态（必须在挂载之后调用） */
function seed(now: number, captured: string[] = [], nodes: string[] = ALL_NODES): Game {
  const game = useGameStore()
  game.exploration.hydrate({ progress: progressOf(nodes) })
  game.imperial.reset()
  for (const id of captured) game.imperial.capture(id, now)
  game.lastTickTime = now
  return game
}

async function mountSeeded(now: number, captured: string[] = []) {
  const wrapper = mountView(ImperialRouteSection)
  const game = seed(now, captured)
  await wrapper.vm.$nextTick()
  return { wrapper, game }
}

function seedAudit(
  game: Game,
  status: 'pending' | 'overdue' | 'passed' | 'failed',
  now: number,
  over: Partial<{ paid: boolean; deadline: number; targetId: string }> = {}
) {
  game.imperial.audit = {
    week: '2026-W47',
    targetId: over.targetId ?? 'imp_pass',
    deadline: over.deadline ?? now + 20 * 3600_000,
    status,
    paid: over.paid,
  }
}

describe('ImperialRouteSection — 拆件前行为', () => {
  useViewTestHooks()

  it('银盘枢纽未完成：只出锁定提示，不出计数与据点卡', async () => {
    const wrapper = mountView(ImperialRouteSection)
    const game = useGameStore()
    game.exploration.hydrate({ progress: {} })
    game.imperial.reset()
    game.lastTickTime = Date.now()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="imperial-route-locked"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="imperial-held-count"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="imperial-imp_pass"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="imperial-pool"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="imperial-forge"]').exists()).toBe(false)
  })

  it('解锁后显示接管计数与六张据点卡', async () => {
    const now = Date.now()
    const { wrapper } = await mountSeeded(now, ['imp_pass'])

    const count = wrapper.find('[data-testid="imperial-held-count"]')
    expect(count.exists()).toBe(true)
    expect(count.text()).toContain('1')
    expect(count.text()).toContain('6')
    for (const def of IMPERIAL_STRONGHOLDS) {
      expect(wrapper.find(`[data-testid="imperial-${def.id}"]`).exists()).toBe(true)
    }
  })

  it('无巡检时不渲染巡检卡', async () => {
    const { wrapper } = await mountSeeded(Date.now())
    expect(wrapper.find('.imperial-audit').exists()).toBe(false)
  })

  it('pending 巡检显示剩余时间、迎战与打点按钮', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now, ['imp_pass'])
    seedAudit(game, 'pending', now)
    await wrapper.vm.$nextTick()

    const card = wrapper.find('[data-testid="imperial-audit-pending"]')
    expect(card.exists()).toBe(true)
    expect(card.classes()).not.toContain('ia-urgent')
    expect(wrapper.find('[data-testid="imperial-audit-fight"]').exists()).toBe(true)
    expect(
      wrapper.find('[data-testid="imperial-audit-pay"]').exists() ||
        wrapper.find('[data-testid="imperial-audit-pay-disabled"]').exists()
    ).toBe(true)
    expect(card.find('.ia-text').text()).not.toBe('')
  })

  it('pending 剩余不足 12 小时进入警示态，时间推进后切换', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now, ['imp_pass'])
    seedAudit(game, 'pending', now, { deadline: now + 13 * 3600_000 })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="imperial-audit-pending"]').classes()).not.toContain(
      'ia-urgent'
    )
    game.lastTickTime = now + 2 * 3600_000
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="imperial-audit-pending"]').classes()).toContain('ia-urgent')
  })

  it('overdue 巡检带警示态，仍可迎战与打点', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now, ['imp_pass'])
    seedAudit(game, 'overdue', now)
    await wrapper.vm.$nextTick()

    const card = wrapper.find('[data-testid="imperial-audit-overdue"]')
    expect(card.exists()).toBe(true)
    expect(card.classes()).toContain('ia-urgent')
    expect(wrapper.find('[data-testid="imperial-audit-fight"]').exists()).toBe(true)
  })

  it('passed 未打点：标准档显示 10%，严格档显示 30%', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now, ['imp_pass'])
    seedAudit(game, 'passed', now, { paid: false })
    game.imperial.bonus = 1.1
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="imperial-audit-passed"]').text()).toContain('10%')
    expect(wrapper.find('[data-testid="imperial-audit-fight"]').exists()).toBe(false)

    game.imperial.bonus = 1.3
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="imperial-audit-passed"]').text()).toContain('30%')
  })

  it('passed 已打点：只读文案，无迎战与打点按钮', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now, ['imp_pass'])
    seedAudit(game, 'passed', now, { paid: true })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="imperial-audit-paid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="imperial-audit-fight"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="imperial-audit-pay"]').exists()).toBe(false)
  })

  it('failed 巡检只读且目标失守', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now, ['imp_pass'])
    seedAudit(game, 'pending', now)
    game.imperial.markAuditFailed()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="imperial-audit-failed"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="imperial-audit-fight"]').exists()).toBe(false)
    expect(game.imperial.occupiedCount).toBe(0)
  })

  it('打点按钮按资源切换禁用态，点击后结算为已打点', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now, ['imp_pass'])
    seedAudit(game, 'pending', now)
    for (const res of ['energy', 'crystal', 'alloy', 'data', 'dark'] as const) {
      game.resources.setAmount(res, 0)
    }
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="imperial-audit-pay-disabled"]').exists()).toBe(true)

    for (const res of ['energy', 'crystal', 'alloy', 'data', 'dark'] as const) {
      game.resources.setAmount(res, 1e9)
    }
    await wrapper.vm.$nextTick()
    const pay = wrapper.find('[data-testid="imperial-audit-pay"]')
    expect(pay.exists()).toBe(true)
    await pay.trigger('click')
    expect(game.imperial.audit?.status).toBe('passed')
    expect(game.imperial.audit?.paid).toBe(true)
  })

  it('迎战按钮可点击且不改变巡检状态', async () => {
    // 导航目标由 e2e（v181 / v183）覆盖：共享 vue-router mock 绑定首个注册文件，
    // 组件测试内无法稳定断言 push 目标。
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now, ['imp_pass'])
    seedAudit(game, 'pending', now)
    await wrapper.vm.$nextTick()

    const fight = wrapper.find('[data-testid="imperial-audit-fight"]')
    expect(fight.attributes('disabled')).toBeUndefined()
    await fight.trigger('click')
    expect(game.imperial.audit?.status).toBe('pending')
    expect(wrapper.find('[data-testid="imperial-audit-pending"]').exists()).toBe(true)
  })

  it('未解锁据点显示前置节点名，接管数量不足显示所需数量', async () => {
    const now = Date.now()
    const wrapper = mountView(ImperialRouteSection)
    const game = seed(
      now,
      ['imp_pass', 'imp_audit', 'imp_guard', 'imp_verdict'],
      ['node_galaxy_hub']
    )
    await wrapper.vm.$nextTick()

    const pass = wrapper.find('[data-testid="imperial-imp_pass"]')
    expect(pass.classes()).toContain('locked')
    expect(pass.text()).toContain(nodeName('node_arm_gate'))

    const court = wrapper.find('[data-testid="imperial-imp_court"]')
    expect(court.classes()).toContain('locked')
    expect(court.find('.ic-status').text()).toContain('5')
    expect(game.imperial.occupiedCount).toBe(4)
  })

  it('可接管据点出征按钮可点击', async () => {
    const now = Date.now()
    const { wrapper } = await mountSeeded(now)

    const capture = wrapper.find('[data-testid="imperial-imp_pass-capture"]')
    expect(capture.exists()).toBe(true)
    expect(capture.attributes('disabled')).toBeUndefined()
    await capture.trigger('click')
  })

  it('已接管据点升级按钮按资源启用，点击后提升等级', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now, ['imp_pass'])
    for (const res of ['energy', 'crystal', 'alloy', 'data', 'dark'] as const) {
      game.resources.setAmount(res, 0)
    }
    await wrapper.vm.$nextTick()

    expect(
      wrapper.find('[data-testid="imperial-imp_pass-upgrade"]').attributes('disabled')
    ).toBeDefined()

    for (const res of ['energy', 'crystal', 'alloy', 'data', 'dark'] as const) {
      game.resources.setAmount(res, 1e9)
    }
    await wrapper.vm.$nextTick()
    expect(
      wrapper.find('[data-testid="imperial-imp_pass-upgrade"]').attributes('disabled')
    ).toBeUndefined()
    await wrapper.find('[data-testid="imperial-imp_pass-upgrade"]').trigger('click')
    expect(game.imperial.tierOf('imp_pass')).toBe(2)
  })

  it('整备三级封顶：不显示升级按钮', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now, ['imp_pass'])
    game.imperial.tiers = { imp_pass: 3 }
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="imperial-imp_pass-upgrade"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="imperial-imp_pass"]').text()).not.toBe('')
  })

  it('巡检逾期时目标据点显示停摆态', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now, ['imp_pass'])
    seedAudit(game, 'overdue', now)
    await wrapper.vm.$nextTick()

    const card = wrapper.find('[data-testid="imperial-imp_pass"]')
    expect(card.classes()).toContain('suspended')
    expect(card.find('.ic-status').text()).not.toContain('+')
  })

  it('空贡赋池领取按钮禁用，接管并累积后领取入账', async () => {
    const now = Date.now()
    const wrapper = mountView(ImperialRouteSection)
    const game = seed(now)
    game.resources.setAmount('energy', 0)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="imperial-pool-claim"]').attributes('disabled')).toBeDefined()

    game.imperial.capture('imp_pass', now - 3600_000)
    game.imperial.lastClaimAt = now - 3600_000
    await wrapper.vm.$nextTick()

    const claim = wrapper.find('[data-testid="imperial-pool-claim"]')
    expect(claim.attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.ip-rows').text()).not.toBe('')
    await claim.trigger('click')
    expect(game.resources.getAmount('energy').toNumber()).toBeGreaterThan(0)
  })

  it('贡赋池临满时切换警示文案与样式', async () => {
    const now = Date.now()
    const wrapper = mountView(ImperialRouteSection)
    const game = seed(now)
    game.imperial.capture('imp_pass', now - 12 * 3600_000)
    game.imperial.lastClaimAt = now - 12 * 3600_000
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.ip-claim').classes()).toContain('ip-claim-nearfull')
    expect(wrapper.find('.ip-fill').attributes('style')).toContain('100')
  })

  it('炉域未解锁只出说明，满足门槛后出现进入按钮并可进入', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now)
    expect(wrapper.find('[data-testid="imperial-forge-locked"]').exists()).toBe(true)

    for (const id of IMPERIAL_STRONGHOLDS.map((s) => s.id)) game.imperial.capture(id, now)
    game.imperial.auditEverPassed = true
    await wrapper.vm.$nextTick()

    const enter = wrapper.find('[data-testid="imperial-forge-enter"]')
    expect(enter.exists()).toBe(true)
    await enter.trigger('click')
    expect(game.imperial.forge).not.toBeNull()
    expect(wrapper.find('[data-testid="imperial-forge-stability"]').exists()).toBe(true)
  })

  it('炉域进入后显示稳定度、剩余次数、点名标记与验资禁用', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now)
    for (const id of IMPERIAL_STRONGHOLDS.map((s) => s.id)) game.imperial.capture(id, now)
    game.imperial.auditEverPassed = true
    game.imperial.forge = {
      stability: 50,
      lastTick: now,
      day: Math.floor(now / 86400_000),
      dayCount: 0,
    }
    for (const res of ['energy', 'crystal', 'alloy', 'dark'] as const) {
      game.resources.setAmount(res, 1e12)
    }
    const picked = pickForgeResource(game.daily.currentWeek)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="imperial-forge-stability"]').text()).toContain('50/100')
    expect(wrapper.find('[data-testid="imperial-forge-remaining"]').text()).toContain('4')
    expect(wrapper.find(`[data-testid="imperial-forge-tribute-${picked}"]`).text()).toContain('×3')

    game.resources.setAmount(picked, 0)
    await wrapper.vm.$nextTick()
    expect(
      wrapper.find(`[data-testid="imperial-forge-tribute-${picked}"]`).attributes('disabled')
    ).toBeDefined()
  })

  it('倾贡点击回填稳定度并发出 data', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now)
    for (const id of IMPERIAL_STRONGHOLDS.map((s) => s.id)) game.imperial.capture(id, now)
    game.imperial.auditEverPassed = true
    game.imperial.forge = {
      stability: 50,
      lastTick: now,
      day: Math.floor(now / 86400_000),
      dayCount: 0,
    }
    for (const res of ['energy', 'crystal', 'alloy', 'dark'] as const) {
      game.resources.setAmount(res, 1e12)
    }
    game.resources.setAmount('data', 0)
    const picked = pickForgeResource(game.daily.currentWeek)
    await wrapper.vm.$nextTick()

    await wrapper.find(`[data-testid="imperial-forge-tribute-${picked}"]`).trigger('click')
    expect(game.imperial.forge?.stability).toBeGreaterThan(73.99)
    expect(game.imperial.forge?.dayCount).toBe(1)
    expect(game.resources.getAmount('data').toNumber()).toBeGreaterThan(0)
  })

  it('炉域当日次数用尽：四个投入按钮全部禁用', async () => {
    const now = Date.now()
    const { wrapper, game } = await mountSeeded(now)
    for (const id of IMPERIAL_STRONGHOLDS.map((s) => s.id)) game.imperial.capture(id, now)
    game.imperial.auditEverPassed = true
    game.imperial.forge = {
      stability: 50,
      lastTick: now,
      day: Math.floor(now / 86400_000),
      dayCount: 4,
    }
    for (const res of ['energy', 'crystal', 'alloy', 'dark'] as const) {
      game.resources.setAmount(res, 1e12)
    }
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="imperial-forge-remaining"]').text()).toContain('0')
    for (const res of Object.keys(FORGE_TRIBUTE_COST)) {
      expect(
        wrapper.find(`[data-testid="imperial-forge-tribute-${res}"]`).attributes('disabled')
      ).toBeDefined()
    }
  })
})
