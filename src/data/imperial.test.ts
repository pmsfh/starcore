/**
 * imperial.test.ts：帝庭档案数据测试（帝庭 · 贡道核验仪卫裁决炉音观察留档）
 *
 * 覆盖：节池结构（5 节有序、每节恰 3 条留档、id 补零保序、节名首字
 * 互不相撞）、留档三键非空含 CJK、炉音节压轴、红线（全文不与门后
 * 文明及主脑侧勾连）、语言包完整性（zh 基线 5 节名 + 15 × 3 键齐
 * 全；en 镜像键面一致且非空）。
 */
import { describe, it, expect } from 'vitest'
import { IMPERIAL_SECTIONS } from './imperial'
import zh from '@/locales/zh-CN/index.ts'
import en from '@/locales/en/index.ts'

/** 中文断言用（缺键回落键名时不含 CJK，可捕取得词失败） */
const CJK = /[一-鿿]/

describe('imperial 节池结构', () => {
  it('共 5 节，每节恰 3 条留档（合计 15 条），节 id 形如 section_NN 补零保序', () => {
    expect(IMPERIAL_SECTIONS).toHaveLength(5)
    for (let i = 0; i < 5; i++) {
      const sec = IMPERIAL_SECTIONS[i]
      expect(sec.id).toBe(`section_${String(i + 1).padStart(2, '0')}`)
      expect(sec.entries).toHaveLength(3)
    }
    expect(IMPERIAL_SECTIONS.reduce((n, s) => n + s.entries.length, 0)).toBe(15)
  })

  it('留档 id 形如 imp_NN 补零，节内连续且随节序推进', () => {
    let n = 1
    for (const sec of IMPERIAL_SECTIONS) {
      for (const e of sec.entries) {
        expect(e.id).toBe(`imp_${String(n).padStart(2, '0')}`)
        n++
      }
    }
    expect(n).toBe(16)
  })

  it('节名与留档三键非空且含中文（取词失败可被捕获）', () => {
    for (const sec of IMPERIAL_SECTIONS) {
      expect(sec.name.length).toBeGreaterThan(0)
      expect(CJK.test(sec.name)).toBe(true)
      for (const e of sec.entries) {
        expect(e.name.length).toBeGreaterThan(0)
        expect(e.text.length).toBeGreaterThan(0)
        expect(e.note.length).toBeGreaterThan(0)
        expect(CJK.test(e.name)).toBe(true)
        expect(CJK.test(e.text)).toBe(true)
        expect(CJK.test(e.note)).toBe(true)
      }
    }
  })

  it('节名首字互不相撞、节名二字、条目名四至八字（名册体例）', () => {
    const initials = IMPERIAL_SECTIONS.map((s) => s.name[0])
    expect(new Set(initials).size).toBe(5)
    for (const sec of IMPERIAL_SECTIONS) {
      expect(sec.name).toHaveLength(2)
      for (const e of sec.entries) {
        expect(e.name.length).toBeGreaterThanOrEqual(4)
        expect(e.name.length).toBeLessThanOrEqual(8)
      }
    }
  })

  it('炉音节压轴：第五节为炉音，观察节在前', () => {
    expect(IMPERIAL_SECTIONS[4]).toMatchObject({ id: 'section_05', name: '炉音' })
  })
})

describe('imperial 揭示红线', () => {
  it('全文不与门后文明及主脑侧勾连（炉音只收信仰与传闻）', () => {
    const banned = ['门后', '接收者', '主脑', '应答源', '七门', '门扉']
    for (const sec of IMPERIAL_SECTIONS) {
      for (const e of sec.entries) {
        const all = `${e.name}${e.text}${e.note}`
        for (const w of banned) {
          expect(all.includes(w)).toBe(false)
        }
      }
    }
  })
})

describe('imperial 语言包完整性', () => {
  it('zh 基线：5 节名 + 15 × 3 键全部存在且非空', () => {
    for (let i = 1; i <= 5; i++) {
      const sec = `section_${String(i).padStart(2, '0')}`
      const v = (zh as Record<string, unknown>)[`content.imperial.${sec}`]
      expect(typeof v).toBe('string')
      expect((v as string).length).toBeGreaterThan(0)
    }
    for (let i = 1; i <= 15; i++) {
      const id = `imp_${String(i).padStart(2, '0')}`
      for (const k of ['name', 'text', 'note'] as const) {
        const v = (zh as Record<string, unknown>)[`content.imperial.${id}.${k}`]
        expect(typeof v).toBe('string')
        expect((v as string).length).toBeGreaterThan(0)
      }
    }
  })

  it('en 镜像：键面一致且非空', () => {
    for (let i = 1; i <= 5; i++) {
      const sec = `section_${String(i).padStart(2, '0')}`
      const v = (en as Record<string, unknown>)[`content.imperial.${sec}`]
      expect(typeof v).toBe('string')
      expect((v as string).length).toBeGreaterThan(0)
    }
    for (let i = 1; i <= 15; i++) {
      const id = `imp_${String(i).padStart(2, '0')}`
      for (const k of ['name', 'text', 'note'] as const) {
        const key = `content.imperial.${id}.${k}`
        const v = (en as Record<string, unknown>)[key]
        expect(typeof v).toBe('string')
        expect((v as string).length).toBeGreaterThan(0)
      }
    }
  })
})
