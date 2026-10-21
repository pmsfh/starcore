/**
 * gate.test.ts：七门观察留档数据测试（七门 · 星臂尽头巨门回望）
 *
 * 覆盖：门池结构（7 门有序、每门恰 3 条留档、id 补零保序、门名首字
 * 互不相撞、en 门名单数 Gate 词形）、留档三键非空含 CJK、应答门压
 * 轴（第七门磨痕门）、语言包完整性（zh 基线 7 门名 + 21 × 3 键齐
 * 全；en 镜像键面一致且非空）。
 */
import { describe, it, expect } from 'vitest'
import { GATE_DOORS } from './gate'
import zh from '@/locales/zh-CN/index.ts'
import en from '@/locales/en/index.ts'

/** 中文断言用（缺键回落键名时不含 CJK，可捕取得词失败） */
const CJK = /[一-鿿]/

describe('gate 门池结构', () => {
  it('共 7 门，每门恰 3 条留档（合计 21 条），门 id 形如 door_NN 补零保序', () => {
    expect(GATE_DOORS).toHaveLength(7)
    for (let i = 0; i < 7; i++) {
      const door = GATE_DOORS[i]
      expect(door.id).toBe(`door_${String(i + 1).padStart(2, '0')}`)
      expect(door.entries).toHaveLength(3)
    }
    expect(GATE_DOORS.reduce((n, d) => n + d.entries.length, 0)).toBe(21)
  })

  it('留档 id 形如 gate_NN 补零，门内连续且随门序推进', () => {
    let n = 1
    for (const door of GATE_DOORS) {
      for (const e of door.entries) {
        expect(e.id).toBe(`gate_${String(n).padStart(2, '0')}`)
        n++
      }
    }
    expect(n).toBe(22)
  })

  it('门名与留档三键非空且含中文（取词失败可被捕获）', () => {
    for (const door of GATE_DOORS) {
      expect(door.name.length).toBeGreaterThan(0)
      expect(CJK.test(door.name)).toBe(true)
      for (const e of door.entries) {
        expect(e.name.length).toBeGreaterThan(0)
        expect(e.text.length).toBeGreaterThan(0)
        expect(e.note.length).toBeGreaterThan(0)
        expect(CJK.test(e.name)).toBe(true)
        expect(CJK.test(e.text)).toBe(true)
        expect(CJK.test(e.note)).toBe(true)
      }
    }
  })

  it('七门名首字互不相撞（门名不依赖读音区分）', () => {
    const initials = GATE_DOORS.map((d) => d.name[0])
    expect(new Set(initials).size).toBe(7)
  })

  it('门名二至四字、留档条目名四至八字（名册体例）', () => {
    for (const door of GATE_DOORS) {
      expect(door.name.length).toBeGreaterThanOrEqual(2)
      expect(door.name.length).toBeLessThanOrEqual(4)
      for (const e of door.entries) {
        expect(e.name.length).toBeGreaterThanOrEqual(4)
        expect(e.name.length).toBeLessThanOrEqual(8)
      }
    }
  })

  it('应答门压轴：第七门为磨痕门，静默门在前', () => {
    expect(GATE_DOORS[6]).toMatchObject({ id: 'door_07', name: '磨痕门' })
  })
})

describe('gate en 门名词形', () => {
  it('en 门名均以单数 Gate 收尾（与 colossal gates 词族同型不撞复数）', () => {
    const names = (en as Record<string, unknown>)['content.gate.door_01'] // 探测键存在
    expect(typeof names).toBe('string')
    for (let i = 1; i <= 7; i++) {
      const v = (en as Record<string, unknown>)[`content.gate.door_${String(i).padStart(2, '0')}`]
      expect(typeof v).toBe('string')
      expect(v as string).toMatch(/^[A-Z][A-Za-z’-]+( Gate)$/)
    }
  })
})

describe('gate 语言包完整性', () => {
  it('zh 基线：7 门名 + 21 × 3 键全部存在且非空', () => {
    for (let i = 1; i <= 7; i++) {
      const door = `door_${String(i).padStart(2, '0')}`
      const v = (zh as Record<string, unknown>)[`content.gate.${door}`]
      expect(typeof v).toBe('string')
      expect((v as string).length).toBeGreaterThan(0)
    }
    for (let i = 1; i <= 21; i++) {
      const id = `gate_${String(i).padStart(2, '0')}`
      for (const k of ['name', 'text', 'note'] as const) {
        const v = (zh as Record<string, unknown>)[`content.gate.${id}.${k}`]
        expect(typeof v).toBe('string')
        expect((v as string).length).toBeGreaterThan(0)
      }
    }
  })

  it('en 镜像：键面一致且非空', () => {
    for (let i = 1; i <= 7; i++) {
      const door = `door_${String(i).padStart(2, '0')}`
      const v = (en as Record<string, unknown>)[`content.gate.${door}`]
      expect(typeof v).toBe('string')
      expect((v as string).length).toBeGreaterThan(0)
    }
    for (let i = 1; i <= 21; i++) {
      const id = `gate_${String(i).padStart(2, '0')}`
      for (const k of ['name', 'text', 'note'] as const) {
        const key = `content.gate.${id}.${k}`
        const v = (en as Record<string, unknown>)[key]
        expect(typeof v).toBe('string')
        expect((v as string).length).toBeGreaterThan(0)
      }
    }
  })
})
