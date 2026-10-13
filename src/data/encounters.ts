/**
 * encounters.ts：随机遭遇事件定义（v1.26 可玩内容扩展方案 8；v1.58 扩容至 25 模板）
 *
 * 在线挂机时的低频决策点：每个事件恰两个选项（稳收益 vs 风险赌注），
 * 玩家不处理则过期消失。设计红线：
 * - 量级克制：奖励是「顺路的糖」，折算能量当量 4.4e3~9.2e3（签到同级口径；实际带，测试侧用更宽护栏），
 *   不锚玩家进度、不造第二资源轴
 * - 纯增量：不碰战斗公式；存档为可选字段零迁移（store 侧见 src/stores/encounters.ts）
 * - 随机即时事件用 Math.random（无需确定性重放；fnv1a/mulberry32 保留给周期刷新类）
 *
 * 数值口径：25 模板全部经 EV 核验表程序化断言（每事件两选项期望差 ≤15%、
 * 赌注类高方差 / 资源类低方差、量级带内），调整数值前先改核验表再同步此处。
 */

import { t } from '@/i18n'
import type { UnitId } from './units'

/** 事件奖励：资源键 → 数量；负值仅允许 alloy（损失结果，结算侧至多扣空） */
export interface EncounterRewards {
  energy?: number
  crystal?: number
  alloy?: number
  data?: number
  dark?: number
  /** 收编兵员数量（兵种见 unitKind，缺省突击兵；走军事 store 入库存，不经训练队列） */
  units?: number
  /** 收编兵员类型（仅 units 存在时有效；缺省 assault） */
  unitKind?: UnitId
}

export interface EncounterOption {
  /** 选项按钮标签（数据实体字段：模块加载时取词，UI 读字段不做动态键拼接） */
  label: string
  /** 结果分布：概率 + 奖励（概率和恒为 1） */
  chances: { p: number; rewards: EncounterRewards }[]
}

export type EncounterFlavor = 'resource' | 'military' | 'explore' | 'gamble'

export interface EncounterDef {
  id: string
  flavor: EncounterFlavor
  name: string
  desc: string
  optA: EncounterOption
  optB: EncounterOption
}

/** 触发间隔下限（秒，均匀随机窗口下界） */
export const ENCOUNTER_INTERVAL_MIN = 480
/** 触发间隔上限（秒，均匀随机窗口上界） */
export const ENCOUNTER_INTERVAL_MAX = 900
/** 挂起过期时限（毫秒）：超时未处理静默失效，不代选 */
export const ENCOUNTER_EXPIRE_MS = 60_000

/**
 * 事件池：25 模板，四类风味，资源类 9 / 军事类 5 / 探索类 3 / 风险赌注类 8。
 * 数值与核验表同源；文案经语言包 content.encounters 域取词。
 */
export const ENCOUNTERS: EncounterDef[] = [
  // 资源类 9：B 选项「稳中略好」，低方差
  {
    id: 'enc_flux',
    flavor: 'resource',
    name: t('content.encounters.enc_flux.name'),
    desc: t('content.encounters.enc_flux.desc'),
    optA: {
      label: t('content.encounters.enc_flux.optA'),
      chances: [{ p: 1, rewards: { energy: 8000 } }],
    },
    optB: {
      label: t('content.encounters.enc_flux.optB'),
      chances: [
        { p: 0.8, rewards: { energy: 10600 } },
        { p: 0.2, rewards: { energy: 3400 } },
      ],
    },
  },
  {
    id: 'enc_vein',
    flavor: 'resource',
    name: t('content.encounters.enc_vein.name'),
    desc: t('content.encounters.enc_vein.desc'),
    optA: {
      label: t('content.encounters.enc_vein.optA'),
      chances: [{ p: 1, rewards: { alloy: 4800 } }],
    },
    optB: {
      label: t('content.encounters.enc_vein.optB'),
      chances: [
        { p: 0.8, rewards: { alloy: 6300 } },
        { p: 0.2, rewards: { alloy: 1500 } },
      ],
    },
  },
  {
    id: 'enc_signal',
    flavor: 'resource',
    name: t('content.encounters.enc_signal.name'),
    desc: t('content.encounters.enc_signal.desc'),
    optA: {
      label: t('content.encounters.enc_signal.optA'),
      chances: [{ p: 1, rewards: { data: 900 } }],
    },
    optB: {
      label: t('content.encounters.enc_signal.optB'),
      chances: [
        { p: 0.5, rewards: { data: 1450 } },
        { p: 0.5, rewards: { data: 550 } },
      ],
    },
  },
  {
    id: 'enc_depot',
    flavor: 'resource',
    name: t('content.encounters.enc_depot.name'),
    desc: t('content.encounters.enc_depot.desc'),
    optA: {
      label: t('content.encounters.enc_depot.optA'),
      chances: [{ p: 1, rewards: { energy: 6000, alloy: 400 } }],
    },
    optB: {
      label: t('content.encounters.enc_depot.optB'),
      chances: [
        { p: 0.65, rewards: { energy: 9200, alloy: 600 } },
        { p: 0.35, rewards: { energy: 2500, alloy: 300 } },
      ],
    },
  },
  {
    id: 'enc_thermo',
    flavor: 'resource',
    name: t('content.encounters.enc_thermo.name'),
    desc: t('content.encounters.enc_thermo.desc'),
    optA: {
      label: t('content.encounters.enc_thermo.optA'),
      chances: [{ p: 1, rewards: { energy: 5300 } }],
    },
    optB: {
      label: t('content.encounters.enc_thermo.optB'),
      chances: [
        { p: 0.85, rewards: { energy: 6800 } },
        { p: 0.15, rewards: { energy: 1500 } },
      ],
    },
  },
  {
    id: 'enc_crystal',
    flavor: 'resource',
    name: t('content.encounters.enc_crystal.name'),
    desc: t('content.encounters.enc_crystal.desc'),
    optA: {
      label: t('content.encounters.enc_crystal.optA'),
      chances: [{ p: 1, rewards: { crystal: 95 } }],
    },
    optB: {
      label: t('content.encounters.enc_crystal.optB'),
      chances: [
        { p: 0.8, rewards: { crystal: 125 } },
        { p: 0.2, rewards: { crystal: 40 } },
      ],
    },
  },
  {
    id: 'enc_array',
    flavor: 'resource',
    name: t('content.encounters.enc_array.name'),
    desc: t('content.encounters.enc_array.desc'),
    optA: {
      label: t('content.encounters.enc_array.optA'),
      chances: [{ p: 1, rewards: { data: 880 } }],
    },
    optB: {
      label: t('content.encounters.enc_array.optB'),
      chances: [
        { p: 0.7, rewards: { data: 1100 } },
        { p: 0.3, rewards: { data: 420 } },
      ],
    },
  },
  {
    id: 'enc_hull',
    flavor: 'resource',
    name: t('content.encounters.enc_hull.name'),
    desc: t('content.encounters.enc_hull.desc'),
    optA: {
      label: t('content.encounters.enc_hull.optA'),
      chances: [{ p: 1, rewards: { energy: 4200, alloy: 500 } }],
    },
    optB: {
      label: t('content.encounters.enc_hull.optB'),
      chances: [
        { p: 0.75, rewards: { energy: 5900, alloy: 700 } },
        { p: 0.25, rewards: { energy: 1500, alloy: 200 } },
      ],
    },
  },
  {
    id: 'enc_orefield',
    flavor: 'resource',
    name: t('content.encounters.enc_orefield.name'),
    desc: t('content.encounters.enc_orefield.desc'),
    optA: {
      label: t('content.encounters.enc_orefield.optA'),
      chances: [{ p: 1, rewards: { alloy: 3200, data: 200 } }],
    },
    optB: {
      label: t('content.encounters.enc_orefield.optB'),
      chances: [
        { p: 0.75, rewards: { alloy: 4000, data: 300 } },
        { p: 0.25, rewards: { alloy: 1400, data: 80 } },
      ],
    },
  },
  // 军事类 5：收编 vs 折现 / 稳拆 vs 赌核心
  {
    id: 'enc_salvage',
    flavor: 'military',
    name: t('content.encounters.enc_salvage.name'),
    desc: t('content.encounters.enc_salvage.desc'),
    optA: {
      label: t('content.encounters.enc_salvage.optA'),
      chances: [{ p: 1, rewards: { alloy: 2800, data: 280 } }],
    },
    optB: {
      label: t('content.encounters.enc_salvage.optB'),
      chances: [
        { p: 0.6, rewards: { alloy: 6400, data: 400 } },
        { p: 0.4, rewards: { alloy: -1400 } },
      ],
    },
  },
  {
    id: 'enc_recruit',
    flavor: 'military',
    name: t('content.encounters.enc_recruit.name'),
    desc: t('content.encounters.enc_recruit.desc'),
    optA: {
      label: t('content.encounters.enc_recruit.optA'),
      chances: [{ p: 1, rewards: { units: 80 } }],
    },
    optB: {
      label: t('content.encounters.enc_recruit.optB'),
      chances: [{ p: 1, rewards: { energy: 4400, alloy: 400 } }],
    },
  },
  {
    id: 'enc_barracks',
    flavor: 'military',
    name: t('content.encounters.enc_barracks.name'),
    desc: t('content.encounters.enc_barracks.desc'),
    optA: {
      label: t('content.encounters.enc_barracks.optA'),
      chances: [{ p: 1, rewards: { units: 85, unitKind: 'guard' } }],
    },
    optB: {
      label: t('content.encounters.enc_barracks.optB'),
      chances: [{ p: 1, rewards: { energy: 4700, alloy: 400 } }],
    },
  },
  {
    id: 'enc_armory',
    flavor: 'military',
    name: t('content.encounters.enc_armory.name'),
    desc: t('content.encounters.enc_armory.desc'),
    optA: {
      label: t('content.encounters.enc_armory.optA'),
      chances: [{ p: 1, rewards: { alloy: 2500, data: 320 } }],
    },
    optB: {
      label: t('content.encounters.enc_armory.optB'),
      chances: [
        { p: 0.55, rewards: { alloy: 5000, data: 500 } },
        { p: 0.45, rewards: {} },
      ],
    },
  },
  {
    id: 'enc_vanguard',
    flavor: 'military',
    name: t('content.encounters.enc_vanguard.name'),
    desc: t('content.encounters.enc_vanguard.desc'),
    optA: {
      label: t('content.encounters.enc_vanguard.optA'),
      chances: [{ p: 1, rewards: { units: 20, unitKind: 'heavy' } }],
    },
    optB: {
      label: t('content.encounters.enc_vanguard.optB'),
      chances: [{ p: 1, rewards: { energy: 4300, alloy: 500 } }],
    },
  },
  // 探索类 3：暗物质独家产出 vs 大额能源
  {
    id: 'enc_beacon',
    flavor: 'explore',
    name: t('content.encounters.enc_beacon.name'),
    desc: t('content.encounters.enc_beacon.desc'),
    optA: {
      label: t('content.encounters.enc_beacon.optA'),
      chances: [{ p: 1, rewards: { data: 90, dark: 1 } }],
    },
    optB: {
      label: t('content.encounters.enc_beacon.optB'),
      chances: [
        { p: 0.85, rewards: { energy: 9600 } },
        { p: 0.15, rewards: { energy: 2000 } },
      ],
    },
  },
  {
    id: 'enc_echo',
    flavor: 'explore',
    name: t('content.encounters.enc_echo.name'),
    desc: t('content.encounters.enc_echo.desc'),
    optA: {
      label: t('content.encounters.enc_echo.optA'),
      chances: [{ p: 1, rewards: { data: 120, dark: 1 } }],
    },
    optB: {
      label: t('content.encounters.enc_echo.optB'),
      chances: [
        { p: 0.85, rewards: { energy: 9000 } },
        { p: 0.15, rewards: { energy: 1800 } },
      ],
    },
  },
  {
    id: 'enc_outpost',
    flavor: 'explore',
    name: t('content.encounters.enc_outpost.name'),
    desc: t('content.encounters.enc_outpost.desc'),
    optA: {
      label: t('content.encounters.enc_outpost.optA'),
      chances: [{ p: 1, rewards: { data: 100, dark: 1 } }],
    },
    optB: {
      label: t('content.encounters.enc_outpost.optB'),
      chances: [
        { p: 0.85, rewards: { energy: 8200 } },
        { p: 0.15, rewards: { energy: 3200 } },
      ],
    },
  },
  // 赌注类 8：高方差同期望，「翻倍 or 白忙」
  {
    id: 'enc_well',
    flavor: 'gamble',
    name: t('content.encounters.enc_well.name'),
    desc: t('content.encounters.enc_well.desc'),
    optA: {
      label: t('content.encounters.enc_well.optA'),
      chances: [{ p: 1, rewards: { energy: 7000 } }],
    },
    optB: {
      label: t('content.encounters.enc_well.optB'),
      chances: [
        { p: 0.35, rewards: { energy: 22000 } },
        { p: 0.65, rewards: {} },
      ],
    },
  },
  {
    id: 'enc_core',
    flavor: 'gamble',
    name: t('content.encounters.enc_core.name'),
    desc: t('content.encounters.enc_core.desc'),
    optA: {
      label: t('content.encounters.enc_core.optA'),
      chances: [{ p: 1, rewards: { alloy: 4400 } }],
    },
    optB: {
      label: t('content.encounters.enc_core.optB'),
      chances: [
        { p: 0.5, rewards: { alloy: 9600 } },
        { p: 0.25, rewards: { alloy: 2000 } },
        { p: 0.25, rewards: { alloy: -1300 } },
      ],
    },
  },
  {
    id: 'enc_wager',
    flavor: 'gamble',
    name: t('content.encounters.enc_wager.name'),
    desc: t('content.encounters.enc_wager.desc'),
    optA: {
      label: t('content.encounters.enc_wager.optA'),
      chances: [{ p: 1, rewards: { energy: 4400, alloy: 400 } }],
    },
    optB: {
      label: t('content.encounters.enc_wager.optB'),
      chances: [
        { p: 0.4, rewards: { energy: 12000 } },
        { p: 0.6, rewards: {} },
      ],
    },
  },
  {
    id: 'enc_gravity',
    flavor: 'gamble',
    name: t('content.encounters.enc_gravity.name'),
    desc: t('content.encounters.enc_gravity.desc'),
    optA: {
      label: t('content.encounters.enc_gravity.optA'),
      chances: [{ p: 1, rewards: { alloy: 7200 } }],
    },
    optB: {
      label: t('content.encounters.enc_gravity.optB'),
      chances: [
        { p: 0.35, rewards: { alloy: 20500 } },
        { p: 0.65, rewards: {} },
      ],
    },
  },
  {
    id: 'enc_fission',
    flavor: 'gamble',
    name: t('content.encounters.enc_fission.name'),
    desc: t('content.encounters.enc_fission.desc'),
    optA: {
      label: t('content.encounters.enc_fission.optA'),
      chances: [{ p: 1, rewards: { energy: 4800 } }],
    },
    optB: {
      label: t('content.encounters.enc_fission.optB'),
      chances: [
        { p: 0.45, rewards: { energy: 10000 } },
        { p: 0.55, rewards: {} },
      ],
    },
  },
  {
    id: 'enc_matrix',
    flavor: 'gamble',
    name: t('content.encounters.enc_matrix.name'),
    desc: t('content.encounters.enc_matrix.desc'),
    optA: {
      label: t('content.encounters.enc_matrix.optA'),
      chances: [{ p: 1, rewards: { crystal: 140 } }],
    },
    optB: {
      label: t('content.encounters.enc_matrix.optB'),
      chances: [
        { p: 0.35, rewards: { crystal: 330 } },
        { p: 0.65, rewards: { crystal: 30 } },
      ],
    },
  },
  {
    id: 'enc_storm',
    flavor: 'gamble',
    name: t('content.encounters.enc_storm.name'),
    desc: t('content.encounters.enc_storm.desc'),
    optA: {
      label: t('content.encounters.enc_storm.optA'),
      chances: [{ p: 1, rewards: { energy: 4600, alloy: 400 } }],
    },
    optB: {
      label: t('content.encounters.enc_storm.optB'),
      chances: [
        { p: 0.45, rewards: { energy: 11500 } },
        { p: 0.55, rewards: {} },
      ],
    },
  },
  {
    id: 'enc_chips',
    flavor: 'gamble',
    name: t('content.encounters.enc_chips.name'),
    desc: t('content.encounters.enc_chips.desc'),
    optA: {
      label: t('content.encounters.enc_chips.optA'),
      chances: [{ p: 1, rewards: { data: 760 } }],
    },
    optB: {
      label: t('content.encounters.enc_chips.optB'),
      chances: [
        { p: 0.3, rewards: { data: 2300 } },
        { p: 0.7, rewards: { data: 200 } },
      ],
    },
  },
]

/** 事件 id 白名单（存档校验剥离未知挂起 id 用） */
export const ENCOUNTER_IDS = new Set<string>(ENCOUNTERS.map((e) => e.id))

/** 按 id 取事件定义（未知 id 返回 undefined，调用方自行兜底） */
export function getEncounter(id: string): EncounterDef | undefined {
  return ENCOUNTERS.find((e) => e.id === id)
}

/** 按选项分布掷一次结果；随机源可注入（测试固定分支），缺省 Math.random */
export function rollOutcome(
  opt: EncounterOption,
  rand: () => number = Math.random
): EncounterRewards {
  let roll = rand()
  for (const c of opt.chances) {
    roll -= c.p
    if (roll < 0) return { ...c.rewards }
  }
  // 浮点兜底：概率和为 1 时不可达，退化返回末位结果
  return { ...opt.chances[opt.chances.length - 1]!.rewards }
}

/** 下一次触发间隔（毫秒，均匀随机窗口；store 侧经 randomProvider 注入通道消费） */
export function rollIntervalMs(rng: () => number = Math.random): number {
  return (
    ENCOUNTER_INTERVAL_MIN * 1000 + rng() * (ENCOUNTER_INTERVAL_MAX - ENCOUNTER_INTERVAL_MIN) * 1000
  )
}
