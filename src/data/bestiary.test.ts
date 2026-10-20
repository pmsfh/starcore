/**
 * bestiary.test.ts：异星巨兽生态志数据测试（v1.73 异星巨兽生态志）
 *
 * 覆盖：条目池结构（十种配注、稳定键形式合法且在聚合桶代表集内）、
 * 三键非空含 CJK（取词失败可被捕获）、语言包完整性（zh 基线与 en
 * 镜像键面一致且非空）、驱赶者意象条目存在（鲲王与晶云母兽）。
 */
import { describe, it, expect } from 'vitest'
import { BESTIARY_NOTES, getBestiaryNote, getBestiaryNoteForEntries } from './bestiary'
import { enemyKey, STRONGHOLDS } from './pve'
import zh from '@/locales/zh-CN/index.ts'
import en from '@/locales/en/index.ts'

/** 中文断言用（缺键回落键名时不含 CJK，可捕获取词失败） */
const CJK = /[一-鿿]/

/** 聚合桶全部合法收录键（据点 id#序号） */
const ALL_KEYS = new Set<string>(
  STRONGHOLDS.flatMap((s) => s.enemies.map((_, i) => enemyKey(s.id, i)))
)

describe('bestiary 条目池结构', () => {
  it('共十种配注，三键非空且含中文', () => {
    expect(BESTIARY_NOTES).toHaveLength(9)
    for (const n of BESTIARY_NOTES) {
      expect(n.key.length).toBeGreaterThan(0)
      expect(n.mig.length).toBeGreaterThan(0)
      expect(n.feed.length).toBeGreaterThan(0)
      expect(n.hab.length).toBeGreaterThan(0)
      expect(CJK.test(n.mig)).toBe(true)
      expect(CJK.test(n.feed)).toBe(true)
      expect(CJK.test(n.hab)).toBe(true)
    }
  })

  it('稳定键形式合法（据点id#序号）且在聚合桶收录键全集内', () => {
    for (const n of BESTIARY_NOTES) {
      expect(n.key).toMatch(/^beast_\d+#\d+$/)
      expect(ALL_KEYS.has(n.key)).toBe(true)
    }
  })

  it('代表键互不相同（一卡一注，不重不漏聚合桶）', () => {
    const keys = BESTIARY_NOTES.map((n) => n.key)
    expect(new Set(keys).size).toBe(9)
  })

  it('注卡显示名互不重复（每注只落一张聚合卡）', () => {
    const names = BESTIARY_NOTES.map((n) => {
      const [sid, idx] = n.key.split('#')
      const s = STRONGHOLDS.find((x) => x.id === sid)
      return s?.enemies[Number(idx)]?.name ?? ''
    })
    expect(new Set(names).size).toBe(9)
  })

  it('驱赶者意象条目存在（鲲王与晶云母兽的迁徙注）', () => {
    const kun = BESTIARY_NOTES.find((n) => n.key === 'beast_7#4')
    const cloud = BESTIARY_NOTES.find((n) => n.key === 'beast_5#0')
    expect(kun).toBeDefined()
    expect(cloud).toBeDefined()
    expect(kun!.mig).toContain('绕行')
    expect(cloud!.mig).toContain('同步')
  })

  it('getBestiaryNote：已知键命中、未知键返回 undefined', () => {
    expect(getBestiaryNote('beast_7#4')?.mig).toBeTruthy()
    expect(getBestiaryNote('beast_99#9')).toBeUndefined()
  })

  it('桶级取注：非代表条目键命中同物种注', () => {
    // 晶云母兽注挂 beast_5#0；beast_6#0 / beast_7#0 为同显示名的其他据点条目
    const via6 = getBestiaryNoteForEntries(['beast_6#0'])
    const via7 = getBestiaryNoteForEntries(['beast_7#0'])
    expect(via6).toBeDefined()
    expect(via7).toBeDefined()
    expect(via6!.mig).toBe(getBestiaryNote('beast_5#0')!.mig)
  })
})

describe('bestiary 语言包完整性', () => {
  const SLUGS = [
    'kun_king',
    'cloud_matriarch',
    'star_leviathan',
    'crystalback',
    'crystal_spider',
    'void_behemoth',
    'void_matriarch',
    'white_matriarch',
    'white_king',
  ] as const

  it('zh 基线：九种 × 3 键全部存在且非空', () => {
    for (const slug of SLUGS) {
      for (const k of ['mig', 'feed', 'hab'] as const) {
        const v = (zh as Record<string, unknown>)[`content.bestiary.${slug}.${k}`]
        expect(typeof v).toBe('string')
        expect((v as string).length).toBeGreaterThan(0)
      }
    }
  })

  it('en 镜像：键面一致且非空', () => {
    for (const slug of SLUGS) {
      for (const k of ['mig', 'feed', 'hab'] as const) {
        const key = `content.bestiary.${slug}.${k}`
        const v = (en as Record<string, unknown>)[key]
        expect(typeof v).toBe('string')
        expect((v as string).length).toBeGreaterThan(0)
      }
    }
  })
})
