/**
 * daily.weekly.test.ts：周挑战扩类与每周强敌测试
 *
 * 覆盖模板池完整性、扩类计数、校验边界与每周强敌标记。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed } from 'vue'
import {
  useDailyStore,
  localDateStr,
  weekStr,
  CHALLENGE_TEMPLATES,
  type WeeklyChallenge,
} from './daily'
import { minimalSaveData } from '@/tests/fixtures'
import { validateAndRepair } from '@/lib/save/validate'
import type { DailySaveData } from '@/lib/storage'

function ch(templateId: string, over: Partial<WeeklyChallenge> = {}): WeeklyChallenge {
  return { templateId, kind: 'battles', tier: 0, target: 5, rewardDark: 3, claimed: false, ...over }
}

/** 构造指定日期（本地时区） */
function dateOf(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d)
}

describe('daily — 模板池完整性', () => {
  it('模板 ≥5 组（3 选有变化空间），kind 与计数器键对齐', () => {
    expect(CHALLENGE_TEMPLATES.length).toBeGreaterThanOrEqual(5)
    const kinds = [
      'battles',
      'explores',
      'researches',
      'upgrades',
      'transcends',
      'expedition',
      'synths',
      'enhances',
      'garrisonHours',
    ]
    for (const t of CHALLENGE_TEMPLATES) {
      expect(kinds).toContain(t.kind)
      expect(t.targets).toHaveLength(t.rewardDark.length)
      for (const target of t.targets) expect(target).toBeGreaterThan(0)
    }
  })
})

describe('daily — 周挑战扩类（v1.21 可玩内容扩展方案 3）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('模板池扩至 9：四类新模板 targets/dark 对齐且组合空间 ≥ 84', () => {
    expect(CHALLENGE_TEMPLATES).toHaveLength(9)
    const newKinds = ['expedition', 'synths', 'enhances', 'garrisonHours'] as const
    for (const k of newKinds) {
      const t = CHALLENGE_TEMPLATES.find((x) => x.kind === k)
      expect(t, `缺 kind=${k} 模板`).toBeDefined()
      expect(t!.targets).toHaveLength(t!.rewardDark.length)
      for (const target of t!.targets) expect(target).toBeGreaterThan(0)
      for (const dark of t!.rewardDark) expect(dark).toBeGreaterThan(0)
    }
    // 9 选 3 的组合数
    const n = CHALLENGE_TEMPLATES.length
    expect((n * (n - 1) * (n - 2)) / 6).toBeGreaterThanOrEqual(84)
  })

  it('新 kind 计数：bump 后进 weeklyCounters 且驱动领取', () => {
    const store = useDailyStore()
    store.ensureWeek()
    // 直接构造含新 kind 的挑战（同 v1.04 工厂口径），验证计数与领取泛化
    store.hydrate({
      lastCheckIn: localDateStr(),
      streak: 1,
      weeklyCounters: {
        battles: 0,
        explores: 0,
        researches: 0,
        upgrades: 0,
        transcends: 0,
        expedition: 0,
        synths: 0,
        enhances: 0,
        garrisonHours: 0,
      },
      challengeWeek: weekStr(),
      weekChallenges: [
        ch('wk_expedition', { kind: 'expedition', target: 2 }),
        ch('wk_synths', { kind: 'synths', target: 2 }),
        ch('wk_enhances', { kind: 'enhances', target: 10 }),
      ],
    })
    const c = store.weekChallenges.find((x) => x.kind === 'expedition')!
    store.bump('expedition')
    store.bump('expedition')
    expect(store.weeklyCounters.expedition).toBe(2)
    expect(store.claimable(c)).toBe(true)
    expect(store.claim(c.templateId)?.dark).toBe(3)
  })

  it('驻扎小时计数：bump 累加进 garrisonHours', () => {
    const store = useDailyStore()
    store.ensureWeek(dateOf(2026, 9, 7))
    store.bump('garrisonHours')
    store.bump('garrisonHours')
    expect(store.weeklyCounters.garrisonHours).toBe(2)
  })

  it('旧档兼容：v1.19 五键 counters（缺新键）hydrate 后新键视为 0', () => {
    const store = useDailyStore()
    store.hydrate({
      lastCheckIn: localDateStr(),
      streak: 3,
      weeklyCounters: {
        battles: 5,
        explores: 0,
        researches: 0,
        upgrades: 0,
        transcends: 0,
      } as unknown as DailySaveData['weeklyCounters'],
      challengeWeek: weekStr(),
      weekChallenges: [ch('wk_battles'), ch('wk_explores', { kind: 'explores', target: 6 })],
    })
    expect(store.weeklyCounters.battles).toBe(5)
    expect(store.weeklyCounters.expedition).toBe(0)
    expect(store.weeklyCounters.garrisonHours).toBe(0)
  })

  it('存档校验层：五键旧档与新九键档 validateAndRepair 均通过', () => {
    const base = {
      lastCheckIn: localDateStr(),
      streak: 1,
      challengeWeek: weekStr(),
      weekChallenges: [ch('wk_battles')],
    }
    const legacy = validateAndRepair(
      minimalSaveData({
        daily: {
          ...base,
          weeklyCounters: {
            battles: 1,
            explores: 0,
            researches: 0,
            upgrades: 0,
            transcends: 0,
          } as unknown as DailySaveData['weeklyCounters'],
        },
      })
    )
    expect(legacy).toBe(true)
    const modern = validateAndRepair(
      minimalSaveData({
        daily: {
          ...base,
          weeklyCounters: {
            battles: 1,
            explores: 0,
            researches: 0,
            upgrades: 0,
            transcends: 0,
            expedition: 0,
            synths: 0,
            enhances: 0,
            garrisonHours: 0,
          },
        },
      })
    )
    expect(modern).toBe(true)
  })

  it('存档校验层：weeklyCounters 新键出现非法值（负数/非数）整档拒绝', () => {
    const base = {
      lastCheckIn: localDateStr(),
      streak: 1,
      challengeWeek: weekStr(),
      weekChallenges: [ch('wk_battles')],
    }
    const bad = validateAndRepair(
      minimalSaveData({
        daily: {
          ...base,
          weeklyCounters: {
            battles: 1,
            explores: 0,
            researches: 0,
            upgrades: 0,
            transcends: 0,
            expedition: -1,
            synths: 0,
            enhances: 0,
            garrisonHours: 0,
          },
        },
      })
    )
    expect(bad).toBe(false)
  })
})

describe('daily — 每周强敌标记（v1.24 可玩内容扩展方案 5）', () => {
  let store: ReturnType<typeof useDailyStore>
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDailyStore()
  })

  it('默认未击败；记账后本周已击败；重复记账幂等', () => {
    const now = dateOf(2026, 9, 7) // 周一
    expect(store.isWeeklyBossDefeated(now)).toBe(false)
    store.claimWeeklyBoss(now)
    expect(store.isWeeklyBossDefeated(now)).toBe(true)
    store.claimWeeklyBoss(now) // 幂等：同周重复记账无副作用
    expect(store.isWeeklyBossDefeated(now)).toBe(true)
    expect(store.weeklyBossClaimedWeek).toBe(weekStr(now))
  })

  it('跨周自动失效：上周标记在本周不可见（无需显式清除）', () => {
    const wk1 = dateOf(2026, 9, 7) // 周一
    store.claimWeeklyBoss(wk1)
    expect(store.isWeeklyBossDefeated(wk1)).toBe(true)
    const wk2 = dateOf(2026, 9, 14) // 下周一
    expect(store.isWeeklyBossDefeated(wk2)).toBe(false)
    // 同周内任意日期仍判定已击败
    expect(store.isWeeklyBossDefeated(dateOf(2026, 9, 13))).toBe(true) // 周日
  })

  it('响应式当前周：跨周 tick 自动对齐，无参判定与缓存自动刷新', () => {
    // 先把响应式当前周对齐到基准周（不依赖运行时的真实时间）
    store.onTickCheckIn(dateOf(2026, 9, 23)) // W39 周三
    store.claimWeeklyBoss(dateOf(2026, 9, 23))
    expect(store.isWeeklyBossDefeated()).toBe(true)
    const flag = computed(() => store.isWeeklyBossDefeated())
    expect(flag.value).toBe(true)
    // 跨到下一周一（W40）：tick 对齐响应式当前周 → 标记失效、缓存自动重算（免重挂载）
    store.onTickCheckIn(dateOf(2026, 9, 28))
    expect(store.currentWeek).toBe('2026-W40')
    expect(store.isWeeklyBossDefeated()).toBe(false)
    expect(flag.value).toBe(false)
  })

  it('reset 清空标记（转生/清档语义：转生当周可再打）', () => {
    const now = dateOf(2026, 9, 7)
    store.claimWeeklyBoss(now)
    store.reset()
    expect(store.isWeeklyBossDefeated(now)).toBe(false)
    expect(store.weeklyBossClaimedWeek).toBe('')
  })

  it('serialize：已击败写出 weeklyBoss 键；未击败不写（与旧档同构）', () => {
    const now = dateOf(2026, 9, 7)
    expect(store.serialize().weeklyBoss).toBeUndefined()
    store.claimWeeklyBoss(now)
    expect(store.serialize().weeklyBoss).toEqual({ claimedWeek: weekStr(now) })
  })

  it('hydrate：旧档缺键 → 未击败；合法键 → 载入；跨周旧标记读取侧自动失效', () => {
    const now = dateOf(2026, 9, 7)
    store.hydrate({
      lastCheckIn: '',
      streak: 0,
      weeklyCounters: {
        battles: 0,
        explores: 0,
        researches: 0,
        upgrades: 0,
        transcends: 0,
        expedition: 0,
        synths: 0,
        enhances: 0,
        garrisonHours: 0,
      },
      challengeWeek: '',
      weekChallenges: [],
    })
    expect(store.isWeeklyBossDefeated(now)).toBe(false)
    store.hydrate({
      lastCheckIn: '',
      streak: 0,
      weeklyCounters: {
        battles: 0,
        explores: 0,
        researches: 0,
        upgrades: 0,
        transcends: 0,
        expedition: 0,
        synths: 0,
        enhances: 0,
        garrisonHours: 0,
      },
      challengeWeek: '',
      weekChallenges: [],
      weeklyBoss: { claimedWeek: weekStr(now) },
    })
    expect(store.isWeeklyBossDefeated(now)).toBe(true)
    // 上周标记载入后读取侧按当前周比较自动失效
    store.hydrate({
      lastCheckIn: '',
      streak: 0,
      weeklyCounters: {
        battles: 0,
        explores: 0,
        researches: 0,
        upgrades: 0,
        transcends: 0,
        expedition: 0,
        synths: 0,
        enhances: 0,
        garrisonHours: 0,
      },
      challengeWeek: '',
      weekChallenges: [],
      weeklyBoss: { claimedWeek: '2026-W36' }, // 早于 2026-W37
    })
    expect(store.isWeeklyBossDefeated(now)).toBe(false)
  })

  it('存档校验层：weeklyBoss 合法结构通过，非对象/缺 claimedWeek 拒档', () => {
    const now = dateOf(2026, 9, 7)
    const base = {
      lastCheckIn: localDateStr(),
      streak: 1,
      challengeWeek: weekStr(),
      weekChallenges: [ch('wk_battles')],
      weeklyCounters: {
        battles: 0,
        explores: 0,
        researches: 0,
        upgrades: 0,
        transcends: 0,
        expedition: 0,
        synths: 0,
        enhances: 0,
        garrisonHours: 0,
      },
    }
    // 合法：完整对象
    const ok = validateAndRepair(
      minimalSaveData({ daily: { ...base, weeklyBoss: { claimedWeek: weekStr(now) } } })
    )
    expect(ok).toBe(true)
    // 非对象 → 拒档（结构门，不做静默自愈）
    const badShape = validateAndRepair(
      minimalSaveData({
        daily: { ...base, weeklyBoss: 'garbage' } as unknown as DailySaveData,
      })
    )
    expect(badShape).toBe(false)
    // 缺 claimedWeek → 拒档
    const badField = validateAndRepair(
      minimalSaveData({
        daily: { ...base, weeklyBoss: {} } as unknown as DailySaveData,
      })
    )
    expect(badField).toBe(false)
  })
})
