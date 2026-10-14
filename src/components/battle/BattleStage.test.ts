/**
 * BattleStage.test.ts：对阵舞台组件测试（v1.65）
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BattleStage from './BattleStage.vue'
import type { BattleReplayFrame } from '@/stores/combat'

function makeFrame(): BattleReplayFrame {
  return {
    player: {
      groups: [{ unitId: 'assault', name: '突击兵', count: 8, hp: 30, maxHp: 40 }],
      totalHp: 310,
      totalHpMax: 400,
    },
    enemy: {
      groups: [
        { unitId: 'r1', name: '掠夺者一号', count: 0, hp: 0, maxHp: 40 },
        { unitId: 'r2', name: '掠夺者二号', count: 2, hp: 20, maxHp: 40 },
      ],
      totalHp: 60,
      totalHpMax: 120,
    },
  }
}

describe('BattleStage — 对阵舞台渲染（v1.65）', () => {
  it('两侧标签与血条宽度按血池占比渲染', () => {
    const wrapper = mount(BattleStage, { props: { frame: makeFrame() } })
    const labels = wrapper.findAll('.side-label').map((el) => el.text())
    expect(labels).toEqual(['我方', '敌方'])
    const allyFill = wrapper.find('.stage-side.ally .hp-fill')
    expect(allyFill.exists()).toBe(true)
    expect((allyFill.element as HTMLElement).style.width).toBe('77.5%')
    const enemyFill = wrapper.find('.stage-side.enemy .hp-fill')
    expect((enemyFill.element as HTMLElement).style.width).toBe('50%')
  })

  it('兵种标记随帧显示存活数，阵亡组置灰划线', () => {
    const wrapper = mount(BattleStage, { props: { frame: makeFrame() } })
    const chips = wrapper.findAll('.unit-chip')
    expect(chips.map((c) => c.text())).toEqual(['突击兵 ×8', '掠夺者一号 ×0', '掠夺者二号 ×2'])
    expect(chips[1].classes()).toContain('dead')
    expect(chips[0].classes()).not.toContain('dead')
    expect(chips[2].classes()).not.toContain('dead')
  })

  it('血池上限为零时按 0 处理（防御守卫）', () => {
    const frame = makeFrame()
    frame.enemy.totalHpMax = 0
    frame.enemy.totalHp = 0
    const wrapper = mount(BattleStage, { props: { frame } })
    const enemyFill = wrapper.find('.stage-side.enemy .hp-fill')
    expect((enemyFill.element as HTMLElement).style.width).toBe('0%')
  })
})
