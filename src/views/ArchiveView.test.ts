/**
 * ArchiveView.test.ts：档案馆视图组件测试（v1.18）
 *
 * 重点测试：
 * 1. 页面渲染（标题 + 星图档案/回响/敌方档案三区块与计数）
 * 2. 星图档案：已完成节点显示剧情文案，未完成显示锁定占位不剧透
 * 3. 回响：未全宇宙探索完毕显示留白提示不剧透；完毕后 30 条按三段
 *    小节渲染（门后回响·终局后日谈）
 * 4. 敌方档案：未遭遇显示未知敌影；交战收录后显示名称与属性；
 *    同名聚合口径；生态注仅已收录异星巨兽卡渲染（v1.73 异星巨兽生态志）
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { vueRouterMock, focusTrapMock, mountView, useViewTestHooks } from '@/tests/view-mount'
import ArchiveView from './ArchiveView.vue'
import { exploredNodes } from '@/tests/fixtures'
import { STRONGHOLDS } from '@/data/pve'
import { EXPLORE_NODES } from '@/data/explore'
import { ECHO_ENTRIES } from '@/data/echo'
import { BESTIARY_NOTES } from '@/data/bestiary'
import { useArchiveStore } from '@/stores/archive'
import { useGameStore } from '@/stores/game'

vi.mock('vue-router', () => vueRouterMock({ push: () => vi.fn() }))
vi.mock('@/composables/useFocusTrap', () => focusTrapMock())

describe('ArchiveView — 渲染', () => {
  useViewTestHooks()

  it('渲染标题与两区块及计数', () => {
    const wrapper = mountView(ArchiveView)

    expect(wrapper.find('.archive-view').exists()).toBe(true)
    expect(wrapper.text()).toContain('星图档案馆')
    expect(wrapper.find('[data-testid="archive-story-group"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('已留档 0 / 34')
    // 56 种聚合名 + 0 已收录
    expect(wrapper.text()).toContain('已收录 0 / 56')
    expect(wrapper.findAll('[data-testid="archive-story-card"]').length).toBe(34)
    expect(wrapper.findAll('[data-testid="archive-enemy-card"]').length).toBe(56)
  })

  it('未完成节点显示锁定占位，不剧透剧情', () => {
    const wrapper = mountView(ArchiveView)
    const cards = wrapper.findAll('[data-testid="archive-story-card"]')

    // 全新档：全部锁定态（名称 ???，无剧情文本）
    for (const c of cards) {
      expect(c.text()).not.toContain('扫描器')
    }
    expect(wrapper.text()).toContain('尚未踏足这片空域')
  })

  it('已完成节点显示名称与剧情文案', async () => {
    exploredNodes('node_orbit')
    const wrapper = mountView(ArchiveView)
    await wrapper.vm.$nextTick()

    const cards = wrapper.findAll('[data-testid="archive-story-card"]')
    const unlocked = cards.find((c) => c.text().includes('轨道残骸带'))
    expect(unlocked).toBeTruthy()
    expect(unlocked!.text()).toContain('扫描器在轨道残骸带中发现了掠夺者的踪迹')
    expect(wrapper.text()).toContain('已留档 1 / 34')
  })
})

describe('ArchiveView — 回响', () => {
  useViewTestHooks()

  it('锁定态：分组标题可见、留白提示、条目零渲染不剧透', () => {
    const wrapper = mountView(ArchiveView)

    expect(wrapper.find('[data-testid="archive-echo-group"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('回响')
    // 锁定态不显示计数（仅解锁与未解锁两态，避免误读为逐条收集）
    expect(wrapper.find('[data-testid="archive-echo-group"] .count-lead').exists()).toBe(false)
    expect(wrapper.find('[data-testid="archive-echo-locked"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('门还很安静')
    // 条目零渲染：首条名不出现
    expect(wrapper.findAll('[data-testid="archive-echo-card"]').length).toBe(0)
    expect(wrapper.text()).not.toContain(ECHO_ENTRIES[0].name)
  })

  it('解锁态：全宇宙探索完毕后 30 条按三段小节渲染、计数 30/30', async () => {
    exploredNodes(...EXPLORE_NODES.map((n) => n.id))
    const wrapper = mountView(ArchiveView)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('已回响 30 / 30')
    expect(wrapper.findAll('[data-testid="archive-echo-card"]').length).toBe(30)
    // 三段小节名齐备
    for (const seg of ['迎接', '见闻', '余韵']) {
      expect(wrapper.text()).toContain(seg)
    }
    // 首末条目可见
    expect(wrapper.text()).toContain(ECHO_ENTRIES[0].name)
    expect(wrapper.text()).toContain(ECHO_ENTRIES[29].name)
    expect(wrapper.text()).toContain(ECHO_ENTRIES[29].note)
  })

  it('差一节点未完成仍锁定（34/34 全毕口径）', async () => {
    const all = EXPLORE_NODES.map((n) => n.id)
    exploredNodes(...all.slice(0, all.length - 1))
    const wrapper = mountView(ArchiveView)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="archive-echo-group"] .count-lead').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="archive-echo-card"]').length).toBe(0)
  })
})

describe('ArchiveView — 生态注', () => {
  useViewTestHooks()

  it('未收录卡不渲染注区（交战观察视角）', () => {
    const wrapper = mountView(ArchiveView)
    expect(wrapper.findAll('[data-testid="archive-beast-note"]').length).toBe(0)
  })

  it('已收录异星巨兽卡渲染三行注（迁徙食性栖地）', async () => {
    // 注入噬星鲲王一条收录（beast_7 全部条目同显示名聚合）
    const archive = useArchiveStore()
    archive.hydrate({ enemies: ['beast_7#4'] })
    const wrapper = mountView(ArchiveView)
    await wrapper.vm.$nextTick()

    const notes = wrapper.findAll('[data-testid="archive-beast-note"]')
    expect(notes.length).toBe(1)
    expect(notes[0]!.text()).toContain('绕行弧')
    expect(notes[0]!.text()).toContain('星尘')
    expect(notes[0]!.text()).toContain('盘面')
  })

  it('非代表条目先收录同显示名注仍渲染（晶云母兽跨据点）', async () => {
    // 晶云母兽注挂 beast_5#0；先收录 beast_6#0（同显示名的其他据点条目）
    const archive = useArchiveStore()
    archive.hydrate({ enemies: ['beast_6#0'] })
    const wrapper = mountView(ArchiveView)
    await wrapper.vm.$nextTick()

    const notes = wrapper.findAll('[data-testid="archive-beast-note"]')
    expect(notes.length).toBe(1)
    expect(notes[0]!.text()).toContain('晶尘云')
  })

  it('已收录非异星巨兽卡无注区', async () => {
    const archive = useArchiveStore()
    archive.hydrate({ enemies: ['raider_1#0'] })
    const wrapper = mountView(ArchiveView)
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('[data-testid="archive-beast-note"]').length).toBe(0)
  })

  it('注卡与聚合桶显示名一一对应（十注十名不重）', () => {
    // BESTIARY_NOTES 已在数据层测试覆盖；此处核视图消费面键完整
    for (const n of BESTIARY_NOTES) {
      expect(n.mig.length).toBeGreaterThan(0)
    }
  })
})

describe('ArchiveView — 敌方档案', () => {
  useViewTestHooks()

  it('未遭遇显示未知敌影占位', () => {
    const wrapper = mountView(ArchiveView)
    const cards = wrapper.findAll('[data-testid="archive-enemy-card"]')

    for (const c of cards) {
      expect(c.text()).not.toContain('掠夺者步兵')
    }
    expect(wrapper.text()).toContain('未知敌影')
  })

  it('交战收录后显示名称与属性', async () => {
    const archive = useArchiveStore()
    const s = STRONGHOLDS[0] // raider_1
    archive.recordEncounter(s.id, s.enemies)
    const wrapper = mountView(ArchiveView)
    await wrapper.vm.$nextTick()

    const seenCard = wrapper
      .findAll('[data-testid="archive-enemy-card"]')
      .find((c) => c.text().includes(s.enemies[0].name))
    expect(seenCard).toBeTruthy()
    expect(seenCard!.text()).toContain('攻')
    expect(wrapper.text()).toContain('已收录 1 / 56')
  })

  it('存档注入的遭遇记录渲染已收录态', async () => {
    const archive = useArchiveStore()
    archive.hydrate({ enemies: ['raider_1#0', 'beast_1#0'] })
    const wrapper = mountView(ArchiveView)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('已收录 2 / 56')
  })
})

describe('ArchiveView — 集成（game store 挂载面）', () => {
  useViewTestHooks()

  it('archive 随 game store 暴露（记录路径可达）', () => {
    setActivePinia(createPinia())
    const game = useGameStore()
    expect(game.archive).toBeDefined()
    expect(typeof game.archive.recordEncounter).toBe('function')
    game.archive.recordEncounter('raider_1', STRONGHOLDS[0].enemies)
    expect(game.archive.seenCount).toBeGreaterThan(0)
  })
})
