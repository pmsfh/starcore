/**
 * encounters.ts：随机遭遇事件定义（v1.26 可玩内容扩展方案 8；v1.58 扩容；vn 势力叙事扩容至 47）
 *
 * 在线挂机时的低频决策点：每个事件恰两个选项（稳收益 vs 风险赌注），
 * 玩家不处理则过期消失。设计红线：
 * - 量级克制：奖励是「顺路的糖」，折算能量当量 4.4e3~9.2e3（签到同级口径；实际带，测试侧用更宽护栏），
 *   不锚玩家进度、不造第二资源轴
 * - 纯增量：不碰战斗公式；存档为可选字段零迁移（store 侧见 src/stores/encounters.ts）
 * - 随机即时事件用 Math.random（无需确定性重放；fnv1a/mulberry32 保留给周期刷新类）
 *
 * 数值口径：47 模板全部经 EV 核验表程序化断言（每事件两选项期望差 ≤15%、
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
 * 事件池：47 模板，四类风味，资源类 15 / 军事类 8 / 探索类 11 / 风险赌注类 13。
 * 数值与核验表同源；文案经语言包 content.encounters 域取词。
 * vn 势力叙事扩容：王庭商队 6 / 帝庭巡检 5 / 先驱遗存 6 / 白鲸灯语 5（22 模板）。
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
  // vn 势力叙事：王庭商队（资源 4 + 赌注 2）
  {
    id: 'enc_tribute_convoy',
    flavor: 'resource',
    name: t('content.encounters.enc_tribute_convoy.name'),
    desc: t('content.encounters.enc_tribute_convoy.desc'),
    optA: {
      label: t('content.encounters.enc_tribute_convoy.optA'),
      chances: [{ p: 1, rewards: { energy: 7500 } }],
    },
    optB: {
      label: t('content.encounters.enc_tribute_convoy.optB'),
      chances: [
        { p: 0.8, rewards: { energy: 9800 } },
        { p: 0.2, rewards: { energy: 2900 } },
      ],
    },
  },
  {
    id: 'enc_caravan_market',
    flavor: 'resource',
    name: t('content.encounters.enc_caravan_market.name'),
    desc: t('content.encounters.enc_caravan_market.desc'),
    optA: {
      label: t('content.encounters.enc_caravan_market.optA'),
      chances: [{ p: 1, rewards: { crystal: 110 } }],
    },
    optB: {
      label: t('content.encounters.enc_caravan_market.optB'),
      chances: [
        { p: 0.75, rewards: { crystal: 150 } },
        { p: 0.25, rewards: { crystal: 45 } },
      ],
    },
  },
  {
    id: 'enc_toll_gate',
    flavor: 'resource',
    name: t('content.encounters.enc_toll_gate.name'),
    desc: t('content.encounters.enc_toll_gate.desc'),
    optA: {
      label: t('content.encounters.enc_toll_gate.optA'),
      chances: [{ p: 1, rewards: { alloy: 5200 } }],
    },
    optB: {
      label: t('content.encounters.enc_toll_gate.optB'),
      chances: [
        { p: 0.8, rewards: { alloy: 6800 } },
        { p: 0.2, rewards: { alloy: 1700 } },
      ],
    },
  },
  {
    id: 'enc_tribute_ledger',
    flavor: 'resource',
    name: t('content.encounters.enc_tribute_ledger.name'),
    desc: t('content.encounters.enc_tribute_ledger.desc'),
    optA: {
      label: t('content.encounters.enc_tribute_ledger.optA'),
      chances: [{ p: 1, rewards: { data: 820 } }],
    },
    optB: {
      label: t('content.encounters.enc_tribute_ledger.optB'),
      chances: [
        { p: 0.5, rewards: { data: 1300 } },
        { p: 0.5, rewards: { data: 500 } },
      ],
    },
  },
  {
    id: 'enc_smuggle_hold',
    flavor: 'gamble',
    name: t('content.encounters.enc_smuggle_hold.name'),
    desc: t('content.encounters.enc_smuggle_hold.desc'),
    optA: {
      label: t('content.encounters.enc_smuggle_hold.optA'),
      chances: [{ p: 1, rewards: { energy: 7000 } }],
    },
    optB: {
      label: t('content.encounters.enc_smuggle_hold.optB'),
      chances: [
        { p: 0.5, rewards: { crystal: 260 } },
        { p: 0.3, rewards: { energy: 2500 } },
        { p: 0.2, rewards: { alloy: -1400 } },
      ],
    },
  },
  {
    id: 'enc_exile_fleet',
    flavor: 'gamble',
    name: t('content.encounters.enc_exile_fleet.name'),
    desc: t('content.encounters.enc_exile_fleet.desc'),
    optA: {
      label: t('content.encounters.enc_exile_fleet.optA'),
      chances: [{ p: 1, rewards: { units: 85, unitKind: 'guard' } }],
    },
    optB: {
      label: t('content.encounters.enc_exile_fleet.optB'),
      chances: [
        { p: 0.6, rewards: { units: 130, unitKind: 'guard' } },
        { p: 0.25, rewards: { energy: 2500 } },
        { p: 0.15, rewards: { units: 5, unitKind: 'guard' } },
      ],
    },
  },
  // vn 势力叙事：帝庭巡检（资源 2 + 军事 3）
  {
    id: 'enc_imperial_audit',
    flavor: 'resource',
    name: t('content.encounters.enc_imperial_audit.name'),
    desc: t('content.encounters.enc_imperial_audit.desc'),
    optA: {
      label: t('content.encounters.enc_imperial_audit.optA'),
      chances: [{ p: 1, rewards: { energy: 7800 } }],
    },
    optB: {
      label: t('content.encounters.enc_imperial_audit.optB'),
      chances: [
        { p: 0.8, rewards: { energy: 10200 } },
        { p: 0.2, rewards: { energy: 3200 } },
      ],
    },
  },
  {
    id: 'enc_arbiter_salvage',
    flavor: 'resource',
    name: t('content.encounters.enc_arbiter_salvage.name'),
    desc: t('content.encounters.enc_arbiter_salvage.desc'),
    optA: {
      label: t('content.encounters.enc_arbiter_salvage.optA'),
      chances: [{ p: 1, rewards: { data: 860 } }],
    },
    optB: {
      label: t('content.encounters.enc_arbiter_salvage.optB'),
      chances: [
        { p: 0.5, rewards: { data: 1400 } },
        { p: 0.5, rewards: { data: 520 } },
      ],
    },
  },
  {
    id: 'enc_tribute_escort',
    flavor: 'military',
    name: t('content.encounters.enc_tribute_escort.name'),
    desc: t('content.encounters.enc_tribute_escort.desc'),
    optA: {
      label: t('content.encounters.enc_tribute_escort.optA'),
      chances: [{ p: 1, rewards: { units: 110, unitKind: 'assault' } }],
    },
    optB: {
      label: t('content.encounters.enc_tribute_escort.optB'),
      chances: [
        { p: 0.7, rewards: { units: 160, unitKind: 'assault' } },
        { p: 0.3, rewards: { units: 55, unitKind: 'assault' } },
      ],
    },
  },
  {
    id: 'enc_ceremonial_guard',
    flavor: 'military',
    name: t('content.encounters.enc_ceremonial_guard.name'),
    desc: t('content.encounters.enc_ceremonial_guard.desc'),
    optA: {
      label: t('content.encounters.enc_ceremonial_guard.optA'),
      chances: [{ p: 1, rewards: { units: 110, unitKind: 'guard' } }],
    },
    optB: {
      label: t('content.encounters.enc_ceremonial_guard.optB'),
      chances: [
        { p: 0.7, rewards: { units: 155, unitKind: 'guard' } },
        { p: 0.3, rewards: { units: 25, unitKind: 'guard' } },
      ],
    },
  },
  {
    id: 'enc_court_parade',
    flavor: 'military',
    name: t('content.encounters.enc_court_parade.name'),
    desc: t('content.encounters.enc_court_parade.desc'),
    optA: {
      label: t('content.encounters.enc_court_parade.optA'),
      chances: [{ p: 1, rewards: { units: 27, unitKind: 'heavy' } }],
    },
    optB: {
      label: t('content.encounters.enc_court_parade.optB'),
      chances: [
        { p: 0.5, rewards: { units: 48, unitKind: 'heavy' } },
        { p: 0.5, rewards: { units: 12, unitKind: 'heavy' } },
      ],
    },
  },
  // vn 势力叙事：先驱遗存（探索 6）
  {
    id: 'enc_relay_echo',
    flavor: 'explore',
    name: t('content.encounters.enc_relay_echo.name'),
    desc: t('content.encounters.enc_relay_echo.desc'),
    optA: {
      label: t('content.encounters.enc_relay_echo.optA'),
      chances: [{ p: 1, rewards: { data: 780 } }],
    },
    optB: {
      label: t('content.encounters.enc_relay_echo.optB'),
      chances: [
        { p: 0.8, rewards: { data: 990 } },
        { p: 0.2, rewards: { data: 300 } },
      ],
    },
  },
  {
    id: 'enc_watchtower_beam',
    flavor: 'explore',
    name: t('content.encounters.enc_watchtower_beam.name'),
    desc: t('content.encounters.enc_watchtower_beam.desc'),
    optA: {
      label: t('content.encounters.enc_watchtower_beam.optA'),
      chances: [{ p: 1, rewards: { energy: 7400 } }],
    },
    optB: {
      label: t('content.encounters.enc_watchtower_beam.optB'),
      chances: [
        { p: 0.75, rewards: { energy: 9500 } },
        { p: 0.25, rewards: { energy: 2600 } },
      ],
    },
  },
  {
    id: 'enc_abandoned_probe',
    flavor: 'explore',
    name: t('content.encounters.enc_abandoned_probe.name'),
    desc: t('content.encounters.enc_abandoned_probe.desc'),
    optA: {
      label: t('content.encounters.enc_abandoned_probe.optA'),
      chances: [{ p: 1, rewards: { crystal: 100 } }],
    },
    optB: {
      label: t('content.encounters.enc_abandoned_probe.optB'),
      chances: [
        { p: 0.8, rewards: { crystal: 135 } },
        { p: 0.2, rewards: { crystal: 40 } },
      ],
    },
  },
  {
    id: 'enc_legacy_cache',
    flavor: 'explore',
    name: t('content.encounters.enc_legacy_cache.name'),
    desc: t('content.encounters.enc_legacy_cache.desc'),
    optA: {
      label: t('content.encounters.enc_legacy_cache.optA'),
      chances: [{ p: 1, rewards: { alloy: 5000 } }],
    },
    optB: {
      label: t('content.encounters.enc_legacy_cache.optB'),
      chances: [
        { p: 0.75, rewards: { alloy: 6400 } },
        { p: 0.25, rewards: { alloy: 3800 } },
      ],
    },
  },
  {
    id: 'enc_signal_garden',
    flavor: 'explore',
    name: t('content.encounters.enc_signal_garden.name'),
    desc: t('content.encounters.enc_signal_garden.desc'),
    optA: {
      label: t('content.encounters.enc_signal_garden.optA'),
      chances: [{ p: 1, rewards: { data: 800 } }],
    },
    optB: {
      label: t('content.encounters.enc_signal_garden.optB'),
      chances: [
        { p: 0.8, rewards: { data: 1050 } },
        { p: 0.2, rewards: { data: 350 } },
      ],
    },
  },
  {
    id: 'enc_derelict_beacon',
    flavor: 'explore',
    name: t('content.encounters.enc_derelict_beacon.name'),
    desc: t('content.encounters.enc_derelict_beacon.desc'),
    optA: {
      label: t('content.encounters.enc_derelict_beacon.optA'),
      chances: [{ p: 1, rewards: { energy: 7600 } }],
    },
    optB: {
      label: t('content.encounters.enc_derelict_beacon.optB'),
      chances: [
        { p: 0.7, rewards: { energy: 10000 } },
        { p: 0.3, rewards: { energy: 3300 } },
      ],
    },
  },
  // vn 势力叙事：白鲸灯语（探索 2 + 赌注 3）
  {
    id: 'enc_whale_song',
    flavor: 'explore',
    name: t('content.encounters.enc_whale_song.name'),
    desc: t('content.encounters.enc_whale_song.desc'),
    optA: {
      label: t('content.encounters.enc_whale_song.optA'),
      chances: [{ p: 1, rewards: { data: 840 } }],
    },
    optB: {
      label: t('content.encounters.enc_whale_song.optB'),
      chances: [
        { p: 0.8, rewards: { data: 1080 } },
        { p: 0.2, rewards: { data: 320 } },
      ],
    },
  },
  {
    id: 'enc_beacon_supply',
    flavor: 'explore',
    name: t('content.encounters.enc_beacon_supply.name'),
    desc: t('content.encounters.enc_beacon_supply.desc'),
    optA: {
      label: t('content.encounters.enc_beacon_supply.optA'),
      chances: [{ p: 1, rewards: { energy: 7900 } }],
    },
    optB: {
      label: t('content.encounters.enc_beacon_supply.optB'),
      chances: [
        { p: 0.75, rewards: { energy: 10300 } },
        { p: 0.25, rewards: { energy: 3100 } },
      ],
    },
  },
  {
    id: 'enc_whale_pod',
    flavor: 'gamble',
    name: t('content.encounters.enc_whale_pod.name'),
    desc: t('content.encounters.enc_whale_pod.desc'),
    optA: {
      label: t('content.encounters.enc_whale_pod.optA'),
      chances: [{ p: 1, rewards: { energy: 6900 } }],
    },
    optB: {
      label: t('content.encounters.enc_whale_pod.optB'),
      chances: [
        { p: 0.5, rewards: { crystal: 260 } },
        { p: 0.5, rewards: { energy: 1500 } },
      ],
    },
  },
  {
    id: 'enc_lantern_drift',
    flavor: 'gamble',
    name: t('content.encounters.enc_lantern_drift.name'),
    desc: t('content.encounters.enc_lantern_drift.desc'),
    optA: {
      label: t('content.encounters.enc_lantern_drift.optA'),
      chances: [{ p: 1, rewards: { alloy: 4800 } }],
    },
    optB: {
      label: t('content.encounters.enc_lantern_drift.optB'),
      chances: [
        { p: 0.5, rewards: { alloy: 10300 } },
        { p: 0.5, rewards: { alloy: 70 } },
      ],
    },
  },
  {
    id: 'enc_pioneer_wreck',
    flavor: 'gamble',
    name: t('content.encounters.enc_pioneer_wreck.name'),
    desc: t('content.encounters.enc_pioneer_wreck.desc'),
    optA: {
      label: t('content.encounters.enc_pioneer_wreck.optA'),
      chances: [{ p: 1, rewards: { data: 760 } }],
    },
    optB: {
      label: t('content.encounters.enc_pioneer_wreck.optB'),
      chances: [
        { p: 0.5, rewards: { units: 32, unitKind: 'heavy' } },
        { p: 0.25, rewards: { data: 870 } },
        { p: 0.25, rewards: { alloy: -900 } },
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
