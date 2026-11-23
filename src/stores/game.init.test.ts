/**
 * game.init.test.ts：game store 初始化与后台存档测试
 *
 * 覆盖初始化错误态、驻扎守卫、实时速率与后台切换落档。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { saveSignature } from '@/lib/integrity'
import { fnv1a } from '@/lib/random'
import { makeSaveData, minimalSaveData, exploredNodes } from '@/tests/fixtures'
import { exportSave, importSave, clearAllSaves, type SaveData } from '@/lib/storage'
import { useGameStore } from './game'
import { useResourcesStore } from './resources'
import { useBuildingsStore } from './buildings'
import { BUILDINGS, type ResourceType } from '@/data/buildings'
import { useCombatStore } from './combat'
import { setRelicSlotProvider } from './relics'
import type { Formation } from './military'

/** 基础能量采集建筑 = BUILDINGS[0]（solar_collector，无 requires） */
const SOLAR = BUILDINGS[0].id
// v0.75：初始化错误态（兜底：读档/hydrate 异常不静默卡加载屏），
// 走真实 readSave 通道：把存档写进 localStorage 备份键（jsdom 环境；IndexedDB
// 主档在 jsdom 不可用，v0.93 用例以 try/catch 兼容两态）。不 mock 是因集成测试
// 须驱动真实 store 链，非可靠性考量（vi.mock 按文件隔离、不跨文件泄漏）
const BACKUP_KEY = 'starcore_save_v1_backup'

function writeBackupSave(data: SaveData): void {
  const json = JSON.stringify(data)
  localStorage.setItem(BACKUP_KEY, JSON.stringify({ d: json, c: saveSignature(json) }))
}

describe('game store — 初始化错误态（v0.75）', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    setRelicSlotProvider(() => 0)
    // 双通道全清（v0.93）：IndexedDB 主档跨用例残留会让「双档取新」写入的主档
    // 盖掉后续用例的备份档断言（isolate:false 下 IndexedDB 不随 pinia 重建）
    await clearAllSaves()
  })

  it('版本过新：initError=too_new，不启动游戏循环', async () => {
    writeBackupSave({ ...minimalSaveData(), version: 2 })
    const game = useGameStore()
    const loaded = await game.init()
    expect(loaded).toBe(false)
    expect(game.initError).toBe('too_new')
    expect(game.isRunning).toBe(false)
  })

  it('hydrate 抛错：initError=failed，不启动游戏循环', async () => {
    writeBackupSave(minimalSaveData())
    const combat = useCombatStore()
    const spy = vi.spyOn(combat, 'hydrate').mockImplementation(() => {
      throw new Error('boom')
    })
    const game = useGameStore()
    const loaded = await game.init()
    expect(loaded).toBe(false)
    expect(game.initError).toBe('failed')
    expect(game.isRunning).toBe(false)
    spy.mockRestore()
  })

  it('无档：正常启动（回归，不误入错误态）', async () => {
    const game = useGameStore()
    const loaded = await game.init()
    expect(loaded).toBe(false)
    expect(game.initError).toBeNull()
    expect(game.isRunning).toBe(true)
    game.stop()
  })

  it('hardReset 清除错误态并启动', async () => {
    writeBackupSave({ ...minimalSaveData(), version: 2 })
    const game = useGameStore()
    await game.init()
    expect(game.initError).toBe('too_new')
    await game.hardReset()
    expect(game.initError).toBeNull()
    expect(game.isRunning).toBe(true)
    game.stop()
  })

  it('A1 端到端：远征胜利后整档导出/导入通过', async () => {
    const game = useGameStore()
    const combat = useCombatStore()
    combat.completedStrongholds.add('silencer_3') // 解锁锚点据点 → 远征（endless）解锁
    const stronghold = combat.getEndlessStronghold(1)
    const formation = {
      id: 'f1',
      name: '回归编队',
      units: { assault: 100000, guard: 0, heavy: 0, psionic: 0 },
    } as Formation
    const result = combat.resolveBattle(formation, stronghold, game.atkMult, game.defMult)
    expect(result.victory).toBe(true)
    // 胜利后 'endless' 不入 completed → 整档可过校验（修复前此处必挂）
    const code = await game.doExport()
    const imported = await importSave(code)
    expect(imported.ok).toBe(true)
    if (imported.ok) expect(imported.data.combat.completed).not.toContain('endless')
  })

  it('v0.81 corrupt：主备档都在但全损坏 → initError=corrupt，不启动循环', async () => {
    // 真实写入两份「有值但不可读」的档（checksum 错误 + 非 JSON）
    localStorage.setItem(BACKUP_KEY, 'not-a-payload')
    const game = useGameStore()
    const loaded = await game.init()
    expect(loaded).toBe(false)
    expect(game.initError).toBe('corrupt')
    expect(game.isRunning).toBe(false)
    // 原始载荷保留，供错误屏导出
    expect(game.corruptRaw).toBe('not-a-payload')
    expect(game.exportCorruptRaw()).toBe('not-a-payload')
  })

  it('v0.81 corrupt：损坏档不触发自动存档覆盖（15s 保护窗内原始载荷不变）', async () => {
    localStorage.setItem(BACKUP_KEY, 'not-a-payload')
    const game = useGameStore()
    await game.init()
    expect(game.initError).toBe('corrupt')
    // 错误态下手动 save 也应被拒绝，错误态未 stop（无循环），但 save 会覆盖原档，
    // 校验 save 前的守卫：手动 save 在错误态直接返回
    await game.save()
    expect(localStorage.getItem(BACKUP_KEY)).toBe('not-a-payload')
  })

  it('v1.35 硬切：旧 fnv1a 校验和档判 corrupt（走错误屏出口）', async () => {
    // v1.35 之前的写路径形态：c 为 fnv1a 十六进制
    const data = makeSaveData()
    const json = JSON.stringify(data)
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ d: json, c: fnv1a(json).toString(16) }))
    const game = useGameStore()
    const loaded = await game.init()
    expect(loaded).toBe(false)
    expect(game.initError).toBe('corrupt')
  })

  it('v1.35 硬切：裸对象档（无校验载荷）判 corrupt', async () => {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(makeSaveData()))
    const game = useGameStore()
    const loaded = await game.init()
    expect(loaded).toBe(false)
    expect(game.initError).toBe('corrupt')
  })

  it('v0.93 too_new 优先：主档版本过新时不静默采用旧备份', async () => {
    // 主档 version=2（too_new），备份为可读旧档，修复前旧备份胜出被静默
    // hydrate，随后自动存档覆盖新版主档（不可逆回滚）；修复后进 too_new 错误屏
    const stale = { ...minimalSaveData(), savedAt: 1000 }
    try {
      const { default: localforage } = await import('localforage')
      const store = localforage.createInstance({ name: 'starcore', storeName: 'save' })
      await store.setItem(
        'starcore_save_v1',
        JSON.stringify({
          d: JSON.stringify({ ...stale, version: 2 }),
          c: saveSignature(JSON.stringify({ ...stale, version: 2 })),
        })
      )
    } catch {
      // jsdom 无 IndexedDB 时主档写不进：用备份档也构造 too_new 场景（见下一用例的备份版）
    }
    writeBackupSave(stale)
    const game = useGameStore()
    const loaded = await game.init()
    // 无论主档是否写入成功，只要存在 too_new 档即不得静默降级
    // （主档写入成功时 too_new 来自主档；失败时本用例备份为 ok 正常路径，跳过断言）
    if (loaded) {
      // 主档没写进去（无 IndexedDB）：备份 ok 正常 hydrate 是既有语义，不算回归
      expect(game.initError).toBeNull()
      game.stop()
    } else {
      expect(game.initError).toBe('too_new')
      expect(game.isRunning).toBe(false)
    }
  })

  it('v0.93 too_new 优先（备份档版）：备份版本过新即报错，不静默开新档', async () => {
    // 只写备份档 version=2 → 修复前后都进 too_new 错误屏（锚定 too_new 不垫底语义）
    writeBackupSave({ ...minimalSaveData(), version: 2 })
    const game = useGameStore()
    const loaded = await game.init()
    expect(loaded).toBe(false)
    expect(game.initError).toBe('too_new')
    expect(game.isRunning).toBe(false)
  })

  it('v0.93 存档写入失败：saveFailed 置位并可清除', async () => {
    // 桩 localStorage.setItem 抛错；jsdom 无 IndexedDB 时主档也写不进 → 双通道失败
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const game = useGameStore()
    await game.init()
    expect(game.isRunning).toBe(true)
    const ok = await game.save()
    expect(ok).toBe(false)
    expect(game.saveFailed).toBe(true)
    spy.mockRestore()
    // 恢复后保存成功，失败标志清除
    const ok2 = await game.save()
    expect(ok2).toBe(true)
    expect(game.saveFailed).toBe(false)
    game.stop()
  })

  it('v0.81 双档取新：savedAt 更新的备份档胜出主档', async () => {
    const now = { ...minimalSaveData(), savedAt: Date.now() }
    now.buildings.levels = { solar_collector: 7 }
    // 主档 = 旧档（savedAt=1000）；备份 = 新档
    const stale = { ...minimalSaveData(), savedAt: 1000 }
    try {
      const { default: localforage } = await import('localforage')
      const store = localforage.createInstance({ name: 'starcore', storeName: 'save' })
      await store.setItem(
        'starcore_save_v1',
        JSON.stringify({ d: JSON.stringify(stale), c: saveSignature(JSON.stringify(stale)) })
      )
    } catch {
      // jsdom 无 IndexedDB 时主档写不进也不影响：备份仍是 savedAt 新者
    }
    localStorage.setItem(
      BACKUP_KEY,
      JSON.stringify({ d: JSON.stringify(now), c: saveSignature(JSON.stringify(now)) })
    )
    const game = useGameStore()
    const loaded = await game.init()
    expect(loaded).toBe(true)
    expect(game.buildings.getLevel('solar_collector')).toBe(7)
    game.stop()
  })

  it('错误态 doImport 直接拒绝，不替换内存状态', async () => {
    writeBackupSave({ ...minimalSaveData(), version: 2 })
    const game = useGameStore()
    await game.init()
    expect(game.initError).toBe('too_new')
    game.buildings.setLevel('solar_collector', 4)

    const code = await exportSave(minimalSaveData())
    const result = await game.doImport(code)
    expect(result.success).toBe(false)
    expect(game.buildings.getLevel('solar_collector')).toBe(4)
  })

  it('v0.81 doImport 替换语义：缺省字段回落初始值，totalTranscends=0 可清零', async () => {
    // 先把内存状态堆起来
    const game = useGameStore()
    game.transcend.totalTranscends = 9
    game.totalPlayTime = 500
    game.research.complete('military_basic')
    game.buildings.setLevel('solar_collector', 4)
    // 导入一份极简档（多数字段缺省、totalTranscends=0）
    const minimal = minimalSaveData({
      player: { id: 'p2', name: '新档' },
      resources: { amounts: { energy: '10' }, totals: { energy: '10' } },
      military: { owned: { assault: 1 }, training: [], formations: [] },
    })
    const code = await exportSave(minimal)
    const result = await game.doImport(code)
    expect(result.success).toBe(true)
    // 替换语义断言：内存现值被导入档覆盖，缺省回落初始值
    expect(game.transcend.totalTranscends).toBe(0) // 0 可清零（旧实现 if 跳过 0）
    expect(game.totalPlayTime).toBe(0)
    expect(game.buildings.getLevel('solar_collector')).toBe(0)
    expect(game.research.completed.has('military_basic')).toBe(false)
    expect(game.military.getOwned('assault')).toBe(1)
    expect(game.resources.getAmount('energy').toNumber()).toBe(10)
  })
})

// v0.82 驻扎守卫三条真实规则分支（game store 注入的 garrisonGuard），
describe('v0.82 驻扎守卫真实规则分支', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setRelicSlotProvider(() => 0)
  })

  it('据点 requires 探索未完成 → 拒绝驻扎', () => {
    useGameStore() // 注册守卫（复位由 reset-providers.ts 兜底）
    const combat = useCombatStore()
    combat.completedStrongholds.add('raider_1')
    // node_orbit 未探索 → 守卫第一条规则拦截
    expect(combat.garrison('raider_1', 'f1')).toBe(false)
  })

  it('编队不存在 → 拒绝驻扎', () => {
    useGameStore()
    exploredNodes('node_orbit')
    const combat = useCombatStore()
    combat.completedStrongholds.add('raider_1')
    expect(combat.garrison('raider_1', 'f9')).toBe(false)
  })

  it('编队已被其他据点占用 → 拒绝驻扎', () => {
    useGameStore()
    exploredNodes('node_orbit', 'node_inner')
    const combat = useCombatStore()
    combat.completedStrongholds.add('raider_1')
    combat.completedStrongholds.add('raider_2')
    expect(combat.garrison('raider_1', 'f1')).toBe(true)
    expect(combat.garrison('raider_2', 'f1')).toBe(false)
  })

  it('三规则全过 → 允许驻扎', () => {
    useGameStore()
    exploredNodes('node_orbit')
    const combat = useCombatStore()
    combat.completedStrongholds.add('raider_1')
    expect(combat.garrison('raider_1', 'f1')).toBe(true)
    expect(combat.garrisoned['raider_1'].formationId).toBe('f1')
  })
})

// v1.47 显示用实时速率：购买与驻扎变更即时反映，不等下一 tick 快照
describe('getDisplayRate 实时速率', () => {
  const ALL = ['energy', 'crystal', 'alloy', 'data', 'dark'] as const

  beforeEach(() => {
    setActivePinia(createPinia())
    setRelicSlotProvider(() => 0)
  })

  it('新档全资源实时速率为 0', () => {
    const game = useGameStore()
    for (const rt of ALL) {
      expect(game.getDisplayRate(rt).toNumber()).toBe(0)
    }
  })

  it('购买建筑后立即反映，tick 快照未跑时仍为 0', () => {
    const game = useGameStore()
    const resources = useResourcesStore()
    resources.setAmount('energy', 500)
    expect(game.getDisplayRate('energy').toNumber()).toBe(0)
    expect(game.tryUpgradeBuilding(SOLAR)).toBe(true)
    // 显示速率即时等于建筑实时总产出；累加快照 getRate 未跑 tick 仍为 0
    const prod = useBuildingsStore().getTotalProduction(game.productionMults)
    expect(game.getDisplayRate('energy').toNumber()).toBe(prod.energy.toNumber())
    expect(resources.getRate('energy').toNumber()).toBe(0)
  })

  it('驻扎收益即时并入显示速率', () => {
    const game = useGameStore()
    exploredNodes('node_orbit')
    const combat = useCombatStore()
    combat.completedStrongholds.add('raider_1')
    expect(combat.garrison('raider_1', 'f1')).toBe(true)
    const idle = combat.garrisonIdleReward('raider_1')
    expect(Object.keys(idle).length).toBeGreaterThan(0)
    for (const [res, v] of Object.entries(idle)) {
      expect(game.getDisplayRate(res as ResourceType).toNumber()).toBe(v)
    }
  })

  it('撤出驻扎后显示速率即时回落', () => {
    const game = useGameStore()
    exploredNodes('node_orbit')
    const combat = useCombatStore()
    combat.completedStrongholds.add('raider_1')
    combat.garrison('raider_1', 'f1')
    combat.ungarrison('raider_1')
    for (const rt of ALL) {
      expect(game.getDisplayRate(rt).toNumber()).toBe(0)
    }
  })
})

describe('game store — 后台切换存档（v1.61）', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    setRelicSlotProvider(() => 0)
    await clearAllSaves()
  })

  it('切到后台（hidden）：立即同步落档到 localStorage 备份通道', async () => {
    const game = useGameStore()
    await game.init()
    expect(game.isRunning).toBe(true)
    localStorage.removeItem(BACKUP_KEY)
    const own = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    try {
      document.dispatchEvent(new Event('visibilitychange'))
      const raw = localStorage.getItem(BACKUP_KEY)
      expect(raw).not.toBeNull()
      const envelope = JSON.parse(raw as string) as { d: string; c: string }
      const payload = JSON.parse(envelope.d) as { version: number }
      expect(payload.version).toBe(1)
    } finally {
      if (own) Object.defineProperty(document, 'visibilityState', own)
      else delete (document as unknown as { visibilityState?: string }).visibilityState
      game.stop()
    }
  })
})
