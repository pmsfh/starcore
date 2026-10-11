/**
 * BattleView.test.ts：战斗视图组件测试
 *
 * 重点测试：
 * 1. 组件挂载
 * 2. 战斗结果弹窗显示
 * 3. 奖励发放时机与防重复（回归验证）
 * 4. 远征深度上限封顶
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import BattleView from './BattleView.vue'
import { useResourcesStore } from '@/stores/resources'
import { useMilitaryStore } from '@/stores/military'
import { useCombatStore } from '@/stores/combat'
import { ENDLESS_STRONGHOLD_ID } from '@/data/endless'
import { exploredNodes } from '@/tests/fixtures'

// Mock vue-router
const mockPush = vi.fn()
const mockRouteParams = ref({ id: 'raider_1' })

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: mockRouteParams.value }),
  useRouter: () => ({ push: mockPush }),
  RouterLink: defineComponent({
    props: {
      to: { type: String, required: false, default: '' },
    },
    template: '<a><slot /></a>',
  }),
  RouterView: defineComponent({
    template: '<div />',
  }),
}))

// Mock useFocusTrap
vi.mock('@/composables/useFocusTrap', () => ({
  useFocusTrap: () => {},
}))

let pinia: ReturnType<typeof createPinia>

function mountBattle() {
  return mount(BattleView, {
    global: {
      plugins: [pinia],
      stubs: {
        Icons: defineComponent({ template: '<svg />' }),
      },
    },
  })
}

function setupBattleReady() {
  pinia = createPinia()
  setActivePinia(pinia)

  const resources = useResourcesStore()
  const military = useMilitaryStore()

  // 设置足够资源
  resources.setAmount('energy', 1e6)
  resources.setAmount('crystal', 1e5)
  resources.setAmount('alloy', 1e4)

  // 直接设置编队中有士兵（跳过训练流程）
  military.formations[0].units.assault = 10
  military.owned.assault = 10
}

describe('BattleView — 挂载与渲染', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupBattleReady()
  })

  it('正常挂载并渲染战斗视图', () => {
    const wrapper = mountBattle()

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.battle-view').exists()).toBe(true)
  })

  it('显示编队信息和驻扎区域', () => {
    const wrapper = mountBattle()

    // 战斗按钮区域存在（迁移后 class 从 .btn-battle → .btn-accent）
    expect(wrapper.find('[data-testid="battle-start"]').exists()).toBe(true)
  })
})

describe('BattleView — 驻扎守卫与确认', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouteParams.value = { id: 'raider_1' }
    setupBattleReady()
  })

  it('未攻克据点驻扎按钮禁用', () => {
    const wrapper = mountBattle()
    const btn = wrapper.find('[data-testid="battle-garrison"]')
    expect(btn.exists()).toBe(true)
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('已攻克可驻扎：点击弹出收益确认，确认后进入驻扎态', async () => {
    exploredNodes('node_orbit')
    const combat = useCombatStore()
    combat.completedStrongholds.add('raider_1')
    const wrapper = mountBattle()
    const btn = wrapper.find('[data-testid="battle-garrison"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    await btn.trigger('click')
    const modal = wrapper.find('.garrison-confirm-modal')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('挂机驻扎')
    await modal.find('.btn-accent').trigger('click')
    expect(combat.garrisoned['raider_1']?.formationId).toBe('f1')
  })
})

describe('BattleView — 无尽远征深度步进', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouteParams.value = { id: ENDLESS_STRONGHOLD_ID }
    setupBattleReady()
  })

  afterEach(() => {
    mockRouteParams.value = { id: 'raider_1' }
  })

  it('进页跟随前沿且加号禁用，退至深度 1 后减号禁用', async () => {
    const combat = useCombatStore()
    combat.expeditionBest = 2 // 前沿 = best+1 = 3
    const wrapper = mountBattle()
    const minus = wrapper.find('[data-testid="endless-depth-minus"]')
    const plus = wrapper.find('[data-testid="endless-depth-plus"]')
    expect(minus.exists()).toBe(true)
    // 初始深度自动跟随前沿 3：前沿徽标在、加号禁用、减号可用
    expect(wrapper.find('[data-testid="endless-depth-value"]').text()).toContain('前沿')
    expect((plus.element as HTMLButtonElement).disabled).toBe(true)
    expect((minus.element as HTMLButtonElement).disabled).toBe(false)
    await minus.trigger('click')
    await minus.trigger('click')
    expect(wrapper.find('[data-testid="endless-depth-value"]').text()).toContain('第 1 层')
    expect((minus.element as HTMLButtonElement).disabled).toBe(true) // 深度 1 触底禁用
  })
})

describe('BattleView — 战斗流程与奖励发放', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupBattleReady()
  })

  it('startBattle 后战报播完弹出结果弹窗', async () => {
    vi.useFakeTimers()
    const wrapper = mountBattle()

    const vm = wrapper.vm as any
    vm.startBattle()
    await wrapper.vm.$nextTick()
    // 战报播完前弹窗不出场（v1.56 战斗过程演出）
    vi.advanceTimersByTime(6000)
    await wrapper.vm.$nextTick()

    // 应显示结果弹窗
    const overlay = wrapper.find('.modal-overlay')
    expect(overlay.exists()).toBe(true)
    vi.useRealTimers()
  })

  it('胜利奖励在战斗结算时即时到账，弹窗动作与重复调用不再发放', async () => {
    const wrapper = mountBattle()

    const resources = useResourcesStore()
    const vm = wrapper.vm as any
    const before = resources.getAmount('energy').toNumber()

    // 开始战斗（raider_1 奖励能量 500，结算即到账）
    vm.startBattle()
    await wrapper.vm.$nextTick()
    const afterBattle = resources.getAmount('energy').toNumber()
    expect(afterBattle).toBe(before + 500)

    // 弹窗动作与重复调用不再发放（防重复）
    vm.skipPlayback()
    vm.confirmResult()
    vm.stayHere()
    vm.confirmResult()
    await wrapper.vm.$nextTick()
    expect(resources.getAmount('energy').toNumber()).toBe(afterBattle)
  })
})

describe('BattleView — 战报逐条播出（v1.56）', () => {
  // matchMedia 托管：共享 worker 下他文件（TopBar/AppShell）的文件级桩
  // 不可配置且 matches 取值不定，本组用例须自行钉死环境（默认非减动效）。
  // 不可配置桩只能换值还原；属性不存在时用可配置 defineProperty、用后删除。
  let priorMm: PropertyDescriptor | undefined
  function stubMatchMedia(matches: boolean) {
    const stub = (query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })
    if (priorMm && !priorMm.configurable) {
      ;(window as { matchMedia?: unknown }).matchMedia = stub
    } else {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: stub,
      })
    }
  }
  function restoreMatchMedia() {
    if (priorMm && !priorMm.configurable) {
      ;(window as { matchMedia?: unknown }).matchMedia = priorMm.value
    } else if (priorMm) {
      Object.defineProperty(window, 'matchMedia', priorMm)
    } else {
      delete (window as { matchMedia?: unknown }).matchMedia
    }
    priorMm = undefined
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouteParams.value = { id: 'raider_1' }
    setupBattleReady()
    vi.useFakeTimers()
    priorMm = Object.getOwnPropertyDescriptor(window, 'matchMedia')
    stubMatchMedia(false)
  })
  afterEach(() => {
    vi.useRealTimers()
    restoreMatchMedia()
  })

  it('弹窗延后出场：战报逐条递增，播完弹窗出现', async () => {
    const wrapper = mountBattle()
    const vm = wrapper.vm as any
    vm.startBattle()
    await wrapper.vm.$nextTick()
    // 弹窗不立即出现，播出进行中
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    expect(vm.playing).toBe(true)

    vi.advanceTimersByTime(260)
    await wrapper.vm.$nextTick()
    const early = wrapper.findAll('.log-entry').length
    expect(early).toBeGreaterThan(0)

    vi.advanceTimersByTime(700)
    await wrapper.vm.$nextTick()
    const later = wrapper.findAll('.log-entry').length
    expect(later).toBeGreaterThan(early)

    // 播完：弹窗出场、播出态结束、战报补全
    vi.advanceTimersByTime(6000)
    await wrapper.vm.$nextTick()
    expect(vm.playing).toBe(false)
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
  })

  it('skipPlayback 立即补全战报并弹出结果弹窗', async () => {
    const wrapper = mountBattle()
    const vm = wrapper.vm as any
    vm.startBattle()
    await wrapper.vm.$nextTick()
    expect(vm.playing).toBe(true)
    vm.skipPlayback()
    await wrapper.vm.$nextTick()
    expect(vm.playing).toBe(false)
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(vm.displayedLog.length).toBe(vm.battleLog.length)
  })

  it('减动效偏好不播出，结算后弹窗即出', async () => {
    stubMatchMedia(true)
    const wrapper = mountBattle()
    const vm = wrapper.vm as any
    vm.startBattle()
    await wrapper.vm.$nextTick()
    expect(vm.playing).toBe(false)
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
  })

  it('播放期出征按钮禁用，重复 startBattle 不重置播出', async () => {
    const wrapper = mountBattle()
    const vm = wrapper.vm as any
    vm.startBattle()
    await wrapper.vm.$nextTick()
    const btn = wrapper.find('[data-testid="battle-start"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)

    vi.advanceTimersByTime(260)
    await wrapper.vm.$nextTick()
    const before = vm.displayedLog.length
    const logRef = vm.battleLog
    vm.startBattle()
    await wrapper.vm.$nextTick()
    expect(vm.battleLog).toBe(logRef)

    vi.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()
    expect(vm.displayedLog.length).toBeGreaterThan(before)
  })
})

describe('BattleView — 远征深度上限', () => {
  it('前沿达到最大深度时选择封顶，不出现超过上限的层数', async () => {
    mockRouteParams.value = { id: 'endless' }
    pinia = createPinia()
    setActivePinia(pinia)
    const combat = useCombatStore()
    combat.completedStrongholds.add('silencer_3')
    combat.expeditionBest = 999

    const wrapper = mountBattle()
    await wrapper.vm.$nextTick()

    const depthText = wrapper.find('[data-testid="endless-depth-value"]').text()
    expect(depthText).toContain('第 999 层')
    expect(depthText).not.toContain('1000')
    expect(wrapper.find('.depth-frontier').exists()).toBe(true)

    mockRouteParams.value = { id: 'raider_1' }
  })
})
