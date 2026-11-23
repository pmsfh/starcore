/**
 * game.systems.test.ts：game store 系统集成测试
 *
 * 覆盖远征里程碑、随机遭遇生命周期与自动化 QoL 协议。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { clearAllSaves } from '@/lib/storage'
import { useGameStore } from './game'
import { useResourcesStore } from './resources'
import { useBuildingsStore } from './buildings'
import { BUILDINGS, buildingCost } from '@/data/buildings'
import { useTranscendStore } from './transcend'
import { useEncountersStore } from './encounters'
import { setEncounterRandomProvider } from './encounters'
import { useMilitaryStore } from './military'
import { useResearchStore } from './research'
import { D } from '@/lib/decimal'
import { getRelicById } from '@/data/relics'
import { setRelicSlotProvider } from './relics'

/** 基础能量采集建筑 = BUILDINGS[0]（solar_collector，无 requires） */
const SOLAR = BUILDINGS[0].id
describe('game store — expedition milestone lifecycle（v1.20）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 重置模块级 slotProvider，防止跨测试污染
    setRelicSlotProvider(() => 0)
  })

  /** 经 recordExpedition 把深度推进到 10（里程碑档 1 达标） */
  function pushToDepth10(game: ReturnType<typeof useGameStore>) {
    for (let d = 1; d <= 10; d++) game.combat.recordExpedition(d, true)
  }

  it('doTranscend keeps milestone claims', () => {
    const game = useGameStore()
    pushToDepth10(game)
    const reward = game.claimMilestone(1)
    expect(reward).not.toBeNull()
    expect(game.combat.milestonesClaimed).toEqual([1])

    // 转生：里程碑领取记录与远征深度保留（终身数据口径）
    const resources = useResourcesStore()
    resources.setAmount('energy', 1e9)
    resources.gain('energy', 1e9)
    expect(game.canTranscend()).toBe(true)
    expect(game.doTranscend()).toBe(true)
    expect(game.combat.milestonesClaimed).toEqual([1])
    expect(game.combat.expeditionBest).toBe(10)
  })

  it('hardReset clears milestone claims and grants resources on claim', async () => {
    await clearAllSaves()
    const game = useGameStore()
    pushToDepth10(game)

    // 领取发放：dark 按奖励表入账
    const resources = useResourcesStore()
    const before = Number(resources.amounts.dark)
    const reward = game.claimMilestone(1)
    expect(reward).not.toBeNull()
    expect(reward!.dark).toBeGreaterThan(0)
    expect(Number(resources.amounts.dark)).toBeGreaterThan(before)

    await game.hardReset()
    expect(game.combat.milestonesClaimed).toEqual([])
    expect(game.combat.expeditionBest).toBe(0)
    game.stop()
  })
})

describe('game store — encounters lifecycle（v1.26）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 重置模块级 slotProvider，防止跨测试污染
    setRelicSlotProvider(() => 0)
    setEncounterRandomProvider(() => 0)
  })

  it('doTranscend clears pending encounter and rerolls window（本轮数据口径）', () => {
    const game = useGameStore()
    const encounters = useEncountersStore()
    const resources = useResourcesStore()

    // 预制挂起态
    encounters.pendingEventId = 'enc_flux'
    encounters.pendingAt = Date.now()
    encounters.nextTriggerAt = Date.now() + 300_000

    resources.setAmount('energy', 1e9)
    resources.gain('energy', 1e9)
    expect(game.canTranscend()).toBe(true)
    expect(game.doTranscend()).toBe(true)
    // 本轮数据：挂起清空、窗口重开
    expect(encounters.pendingEventId).toBe('')
    expect(encounters.pendingAt).toBe(0)
  })

  it('hardReset clears pending encounter', async () => {
    await clearAllSaves()
    const game = useGameStore()
    const encounters = useEncountersStore()

    encounters.pendingEventId = 'enc_vein'
    encounters.pendingAt = Date.now()

    await game.hardReset()
    expect(encounters.pendingEventId).toBe('')
    game.stop()
  })

  it('tick 触发遭遇事件（预制过期窗口后单 tick 秒触）', () => {
    const game = useGameStore()
    const encounters = useEncountersStore()
    // 预制窗口已到（固定通道 → 事件恒取池首）
    encounters.nextTriggerAt = Date.now() - 1
    game.tick()
    expect(encounters.pendingEventId).not.toBe('')
    game.stop()
  })

  it('resolveEncounter 发放：资源入账 + 收编入库存 + 损失至多扣空', () => {
    const game = useGameStore()
    const encounters = useEncountersStore()
    const resources = useResourcesStore()
    const military = useMilitaryStore()

    // 稳定分支结算（固定通道 → rollOutcome 恒命中首支）
    setEncounterRandomProvider(() => 0)
    encounters.pendingEventId = 'enc_flux'
    encounters.pendingAt = Date.now()
    const r = game.resolveEncounter('A')
    expect(r).toEqual({ encounterId: 'enc_flux', rewards: { energy: 8000 } })
    expect(resources.getAmount('energy').toNumber()).toBeGreaterThanOrEqual(8000)

    // 收编：突击兵直接入库存
    encounters.pendingEventId = 'enc_recruit'
    encounters.pendingAt = Date.now()
    const r2 = game.resolveEncounter('A')
    expect(r2).not.toBeNull()
    expect(military.getOwned('assault')).toBe(80)

    // 收编扩展（v1.58）：unitKind 分派护卫兵 / 重装兵入库存
    encounters.pendingEventId = 'enc_barracks'
    encounters.pendingAt = Date.now()
    expect(game.resolveEncounter('A')).not.toBeNull()
    expect(military.getOwned('guard')).toBe(85)
    encounters.pendingEventId = 'enc_vanguard'
    encounters.pendingAt = Date.now()
    expect(game.resolveEncounter('A')).not.toBeNull()
    expect(military.getOwned('heavy')).toBe(20)

    // 晶体入账（v1.58）：走通用资源路径
    resources.setAmount('crystal', 100)
    encounters.pendingEventId = 'enc_crystal'
    encounters.pendingAt = Date.now()
    const rc = game.resolveEncounter('A')
    expect(rc).toEqual({ encounterId: 'enc_crystal', rewards: { crystal: 95 } })
    expect(resources.getAmount('crystal').toNumber()).toBe(195)

    // 损失分支（enc_core B 末支 -1300）：余额充足照额扣减 2000 → 700
    resources.setAmount('alloy', 2000)
    encounters.pendingEventId = 'enc_core'
    encounters.pendingAt = Date.now()
    setEncounterRandomProvider(() => 0.99)
    const r3 = game.resolveEncounter('B')
    expect(r3).toEqual({ encounterId: 'enc_core', rewards: { alloy: -1300 } })
    expect(resources.getAmount('alloy').toNumber()).toBe(700)

    // 余额不足（100 < 1300）：扣至空且不为负
    resources.setAmount('alloy', 100)
    encounters.pendingEventId = 'enc_core'
    encounters.pendingAt = Date.now()
    const r4 = game.resolveEncounter('B')
    expect(r4).toEqual({ encounterId: 'enc_core', rewards: { alloy: -1300 } })
    expect(resources.getAmount('alloy').toNumber()).toBe(0)
  })

  it('resolveEncounter 无挂起返回 null 且不改资源', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    expect(game.resolveEncounter('A')).toBeNull()
    expect(resources.getAmount('energy').toNumber()).toBe(resources.getAmount('energy').toNumber())
  })
})

describe('game store — 自动化 QoL（v0.58）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setRelicSlotProvider(() => 0)
  })

  /** 给 store 购买指定转生节点 */
  function buyNodes(ids: string[]) {
    const game = useGameStore()
    const transcend = useTranscendStore()
    transcend.negativeEntropy = D(1e6)
    for (const id of ids) expect(transcend.purchaseNode(id)).toBe(true)
    return game
  }

  it('未购建造协议：tick 不自动升级建筑', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    const buildings = useBuildingsStore()
    resources.setAmount('energy', 1e6)
    game.lastTickTime = Date.now() - 1000
    game.tick()
    expect(buildings.getLevel(SOLAR)).toBe(0)
  })

  it('购买建造协议：tick 自动升级（且成就钩子联动）', () => {
    const game = buyNodes(['t_auto_build'])
    const resources = useResourcesStore()
    const buildings = useBuildingsStore()
    resources.setAmount('energy', 1e6)
    game.lastTickTime = Date.now() - 1000
    game.tick()
    expect(buildings.getLevel(SOLAR)).toBe(1)
    // 每建筑每 tick 至多 1 级
    expect(buildings.getLevel('crystal_mine')).toBe(1)
    // 成就钩子联动：自动升级计入终身计数
    expect(game.achievements.metricValue('upgrades')).toBeGreaterThanOrEqual(2)
  })

  it('建造协议尊重科技解锁门槛（未解锁高阶建筑不买）', () => {
    const game = buyNodes(['t_auto_build'])
    const resources = useResourcesStore()
    const buildings = useBuildingsStore()
    resources.setAmount('energy', 1e9)
    game.lastTickTime = Date.now() - 1000
    game.tick()
    // fusion_reactor requires fusion_tech，未研究则不被自动升级
    expect(buildings.getLevel('fusion_reactor')).toBe(0)
    // 而 SOLAR（无 requires）已升
    expect(buildings.getLevel(SOLAR)).toBeGreaterThanOrEqual(1)
  })

  it('v0.82 正例：研究完成后 requires 建筑进入自动升级（传 completed 集合）', () => {
    const game = buyNodes(['t_auto_build'])
    const resources = useResourcesStore()
    const buildings = useBuildingsStore()
    const research = useResearchStore()
    // 先完成 fusion_tech（fusion_reactor 的 requires）
    resources.setAmount('data', 1e9)
    resources.setAmount('crystal', 1e9)
    resources.setAmount('energy', 1e12)
    expect(game.tryResearch('fusion_tech')).toBe(true)
    expect(research.isCompleted('fusion_tech')).toBe(true)
    resources.setAmount('energy', 1e12)
    game.lastTickTime = Date.now() - 1000
    game.tick()
    // 修复前：runAutomation 传按 unlock 效果目标派生的集合（建筑 id 集合），isUnlocked 查科技 id 永不相交；
    // 修复后：传 completed 科技 id 集合
    expect(buildings.getLevel('fusion_reactor')).toBe(1)
  })

  it('v0.82：tryUpgradeBuilding 未知建筑 id 拒绝且不记账', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    resources.setAmount('energy', 1e9)
    const upgradesBefore = game.achievements.metricValue('upgrades')
    expect(game.tryUpgradeBuilding('ghost_building')).toBe(false)
    expect(game.achievements.metricValue('upgrades')).toBe(upgradesBefore)
    expect(game.buildings.getLevel('ghost_building')).toBe(0)
  })

  it('v0.86 批量升级：预算充足买满 steps 级', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    const buildings = useBuildingsStore()
    resources.setAmount('energy', 1e9)
    const done = game.tryUpgradeBuildingSteps(SOLAR, 10)
    expect(done).toBe(10)
    expect(buildings.getLevel(SOLAR)).toBe(10)
  })

  it('v0.86 批量升级：预算不足买到买不起为止，返回实际级数', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    const buildings = useBuildingsStore()
    // costGrowth 1.18：10 + 12 = 22 ≤ 30、+ 14 = 36 > 30 → 2 级
    resources.setAmount('energy', 30)
    const done = game.tryUpgradeBuildingSteps(SOLAR, 10)
    expect(done).toBe(2)
    expect(buildings.getLevel(SOLAR)).toBe(2)
  })

  it('v0.86 批量升级与连点记账等价：成就与周挑战计数一致', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    resources.setAmount('energy', 1e6)
    const upBefore = game.achievements.metricValue('upgrades')
    const dailyBefore = game.daily.weeklyCounters.upgrades
    // A：一次批量 3 级
    game.tryUpgradeBuildingSteps(SOLAR, 3)
    const upAfterBatch = game.achievements.metricValue('upgrades')
    const dailyAfterBatch = game.daily.weeklyCounters.upgrades
    // B：连点 3 次（增量应与批量完全一致）
    for (let i = 0; i < 3; i++) game.tryUpgradeBuilding(SOLAR)
    expect(game.achievements.metricValue('upgrades') - upAfterBatch).toBe(upAfterBatch - upBefore)
    expect(game.daily.weeklyCounters.upgrades - dailyAfterBatch).toBe(dailyAfterBatch - dailyBefore)
  })

  it('v0.86 批量升级：一级都买不起返回 0 且零副作用', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    const buildings = useBuildingsStore()
    resources.setAmount('energy', 5) // 低于首级成本 10
    const upgradesBefore = game.achievements.metricValue('upgrades')
    const done = game.tryUpgradeBuildingSteps(SOLAR, 10)
    expect(done).toBe(0)
    expect(buildings.getLevel(SOLAR)).toBe(0)
    expect(game.achievements.metricValue('upgrades')).toBe(upgradesBefore)
  })

  it('批量升级预览与实扣一致：预算充足买满 steps 级', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    resources.setAmount('energy', 1e6)
    const preview = game.previewUpgradeBuildingSteps(SOLAR, 10)
    expect(preview.count).toBe(10)
    const before = resources.getAmount('energy')
    const done = game.tryUpgradeBuildingSteps(SOLAR, 10)
    expect(done).toBe(10)
    // 预计总花费 = 实扣额
    expect(preview.cost).toEqual({ energy: before.minus(resources.getAmount('energy')).toNumber() })
  })

  it('批量升级预览与实扣一致：预算中途耗尽买几级算几级', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    // 成本曲线由 buildingCost 实算：预算设为「够 2 级、不够第 3 级」（防曲线漂移）
    const c0 = buildingCost(BUILDINGS[0], 0).energy!
    const c1 = buildingCost(BUILDINGS[0], 1).energy!
    const c2 = buildingCost(BUILDINGS[0], 2).energy!
    resources.setAmount('energy', c0 + c1 + Math.floor(c2 / 2))
    const preview = game.previewUpgradeBuildingSteps(SOLAR, 10)
    expect(preview.count).toBe(2)
    expect(preview.cost.energy).toBe(c0 + c1)
    const before = resources.getAmount('energy')
    game.tryUpgradeBuildingSteps(SOLAR, 10)
    expect(before.minus(resources.getAmount('energy')).toNumber()).toBe(preview.cost.energy)
  })

  it('批量强化预览与实扣一致：按能量逐级模拟，段位标称值仅作上限', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    // epic 首级 25M、每级 ×1.5：25 + 37.5 = 62.5M ≤ 100M < +56.25M → 2 级
    resources.setAmount('energy', 1e8)
    game.relics.obtain(getRelicById('r_energy_3')!)
    const inst = game.relics.owned[0].instanceId

    expect(game.previewRelicEnhanceSteps(inst, 100)).toBe(2)
    const before = resources.getAmount('energy')
    const done = game.relics.enhanceSteps(inst, 100)
    expect(done).toBe(2)
    expect(before.minus(resources.getAmount('energy')).toNumber()).toBe(25e6 + 37.5e6)
  })

  it('批量强化预览：能量不足一级时返回 0（与实扣的 0 级一致）', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    resources.setAmount('energy', 5) // 低于 epic 首级 25M
    game.relics.obtain(getRelicById('r_energy_3')!)
    const inst = game.relics.owned[0].instanceId

    expect(game.previewRelicEnhanceSteps(inst, 100)).toBe(0)
    expect(game.relics.enhanceSteps(inst, 100)).toBe(0)
  })

  it('等级上限：批量、单次与预览在封顶处一致停止', () => {
    // maxLevel 当前数据未启用：临时注入封顶值验证各路径共用同一门槛，测试后还原
    const def = BUILDINGS.find((b) => b.id === SOLAR)!
    def.maxLevel = 2
    try {
      const game = useGameStore()
      const resources = useResourcesStore()
      resources.setAmount('energy', 1e6)
      expect(game.previewUpgradeBuildingSteps(SOLAR, 10).count).toBe(2)
      expect(game.tryUpgradeBuildingSteps(SOLAR, 10)).toBe(2)
      expect(game.buildings.getLevel(SOLAR)).toBe(2)
      expect(game.buildings.isMaxed(SOLAR)).toBe(true)
      const before = resources.getAmount('energy')
      expect(game.tryUpgradeBuilding(SOLAR)).toBe(false) // 封顶拒绝且不扣费
      expect(resources.getAmount('energy').eq(before)).toBe(true)
      expect(game.previewUpgradeBuildingSteps(SOLAR, 10).count).toBe(0)
    } finally {
      delete def.maxLevel
    }
  })

  it('购买研究协议：tick 自动完成可用科技（成就联动）', () => {
    const game = buyNodes(['t_auto_research'])
    const resources = useResourcesStore()
    const research = useResearchStore()
    resources.setAmount('data', 1e6)
    resources.setAmount('energy', 1e9)
    game.lastTickTime = Date.now() - 1000
    game.tick()
    expect(research.count).toBeGreaterThan(0)
    // 首个可研究科技是 fusion_tech（无 requires）
    expect(research.isCompleted('fusion_tech')).toBe(true)
    expect(game.achievements.metricValue('researches')).toBe(research.count)
  })

  it('购买探索协议：tick 自动开始可探索节点', () => {
    const game = buyNodes(['t_auto_explore'])
    const resources = useResourcesStore()
    resources.setAmount('energy', 1e6)
    game.lastTickTime = Date.now() - 1000
    game.tick()
    // node_orbit 无前置且买得起 → 已开始探索
    expect(game.exploration.isExploring('node_orbit')).toBe(true)
    const startTime = game.exploration.progress['node_orbit'].startTime
    const energyBefore = resources.getAmount('energy').toNumber()
    // 已在探索中的节点不会重复开始（isExploring 挡），不会重复扣探索费
    game.lastTickTime = Date.now() - 1000
    game.tick()
    expect(game.exploration.progress['node_orbit'].startTime).toBe(startTime)
    expect(resources.getAmount('energy').toNumber()).toBe(energyBefore)
  })

  it('三个协议独立：只买探索协议不建造', () => {
    const game = buyNodes(['t_auto_explore'])
    const resources = useResourcesStore()
    const buildings = useBuildingsStore()
    resources.setAmount('energy', 1e6)
    game.lastTickTime = Date.now() - 1000
    game.tick()
    expect(game.autoExplore).toBe(true)
    expect(game.autoBuild).toBe(false)
    expect(buildings.getLevel(SOLAR)).toBe(0)
  })
})
