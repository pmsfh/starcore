/**
 * EndlessDepthPanel.test.ts：无尽远征深度面板（v1.77 等离子渐染）
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EndlessDepthPanel from './EndlessDepthPanel.vue'

function mountAt(depth: number, maxDepth = 999) {
  return mount(EndlessDepthPanel, { props: { depth, maxDepth } })
}

/** 面板注入的渐染浓度（--depth-tint） */
function tintOf(depth: number): string {
  const el = mountAt(depth).element as HTMLElement
  return el.style.getPropertyValue('--depth-tint')
}

describe('EndlessDepthPanel — 等离子渐染（v1.77）', () => {
  it('浓度按深度线性加深，每层 2%', () => {
    expect(tintOf(1)).toBe('2%')
    expect(tintOf(3)).toBe('6%')
    expect(tintOf(4)).toBe('8%')
  })

  it('第 5 层起封顶 10%，更深不再加浓', () => {
    expect(tintOf(5)).toBe('10%')
    expect(tintOf(20)).toBe('10%')
    expect(tintOf(999)).toBe('10%')
  })

  it('前沿徽标仍只在深度等于上限时出现', () => {
    const atFrontier = mountAt(4, 4)
    expect(atFrontier.find('.depth-frontier').exists()).toBe(true)
    const behind = mountAt(3, 4)
    expect(behind.find('.depth-frontier').exists()).toBe(false)
  })
})
