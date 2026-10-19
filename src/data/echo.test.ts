/**
 * echo.test.ts：门后回响条目数据测试（门后回响·终局后日谈）
 *
 * 覆盖：条目池结构（30 条有序、id 补零保序、三键非空含 CJK）、
 * 分段划分（三段各十条、按序覆盖全部条目且不重叠、段名非空）、
 * 语言包完整性（zh 基线 30 × 3 键齐全；en 镜像键面一致且非空）。
 */
import { describe, it, expect } from 'vitest'
import { ECHO_ENTRIES, ECHO_SEGMENTS } from './echo'
import zh from '@/locales/zh-CN/index.ts'
import en from '@/locales/en/index.ts'

/** 中文断言用（缺键回落键名时不含 CJK，可捕取得词失败） */
const CJK = /[一-鿿]/

describe('echo 条目池结构', () => {
  it('共 30 条，id 形如 echo_NN 补零且随序号单调', () => {
    expect(ECHO_ENTRIES).toHaveLength(30)
    for (let i = 0; i < 30; i++) {
      const e = ECHO_ENTRIES[i]
      expect(e.id).toBe(`echo_${String(i + 1).padStart(2, '0')}`)
    }
  })

  it('每条三键非空且含中文（取词失败可被捕获）', () => {
    for (const e of ECHO_ENTRIES) {
      expect(e.name.length).toBeGreaterThan(0)
      expect(e.text.length).toBeGreaterThan(0)
      expect(e.note.length).toBeGreaterThan(0)
      expect(CJK.test(e.name)).toBe(true)
      expect(CJK.test(e.text)).toBe(true)
      expect(CJK.test(e.note)).toBe(true)
    }
  })

  it('条目名四至八字（名册体例）', () => {
    for (const e of ECHO_ENTRIES) {
      expect(e.name.length).toBeGreaterThanOrEqual(4)
      expect(e.name.length).toBeLessThanOrEqual(8)
    }
  })
})

describe('echo 分段划分', () => {
  it('三段（迎接 / 见闻 / 余韵），每段十条，起止与条目池对齐', () => {
    expect(ECHO_SEGMENTS).toHaveLength(3)
    expect(ECHO_SEGMENTS.map((s) => s.name)).toEqual(['迎接', '见闻', '余韵'])
    expect(ECHO_SEGMENTS[0]).toMatchObject({ start: 0, end: 10 })
    expect(ECHO_SEGMENTS[1]).toMatchObject({ start: 10, end: 20 })
    expect(ECHO_SEGMENTS[2]).toMatchObject({ start: 20, end: 30 })
  })

  it('分段覆盖全部条目且不重叠', () => {
    const covered = new Set<number>()
    for (const s of ECHO_SEGMENTS) {
      for (let i = s.start; i < s.end; i++) {
        expect(covered.has(i)).toBe(false)
        covered.add(i)
      }
    }
    expect(covered.size).toBe(ECHO_ENTRIES.length)
  })
})

describe('echo 语言包完整性', () => {
  it('zh 基线：30 × 3 键全部存在且非空', () => {
    for (let i = 1; i <= 30; i++) {
      const id = `echo_${String(i).padStart(2, '0')}`
      for (const k of ['name', 'text', 'note'] as const) {
        const v = (zh as Record<string, unknown>)[`content.echo.${id}.${k}`]
        expect(typeof v).toBe('string')
        expect((v as string).length).toBeGreaterThan(0)
      }
    }
  })

  it('en 镜像：键面一致且非空', () => {
    for (let i = 1; i <= 30; i++) {
      const id = `echo_${String(i).padStart(2, '0')}`
      for (const k of ['name', 'text', 'note'] as const) {
        const key = `content.echo.${id}.${k}`
        const v = (en as Record<string, unknown>)[key]
        expect(typeof v).toBe('string')
        expect((v as string).length).toBeGreaterThan(0)
      }
    }
  })
})
