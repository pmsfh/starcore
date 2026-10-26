#!/usr/bin/env node
/**
 * export-data.mjs：数值数据快照导出器
 *
 * 用仓库既有 Vite 的 SSR 模块加载（createServer appType custom + middlewareMode
 * + ssrLoadModule）直接载入 src/data 数据表，解决 @/ 别名与 TS 语法，零新增依赖。
 * 六枚核验脚本统一改读导出的 JSON，不再各自正则解析 TS 源码；
 * 快照由本导出器生成，新鲜度由 check 链尾的校验把关。
 *
 * 载入顺序（src/i18n/index.ts 头注约束）：先 await loadLocaleBundles()，
 * 再动态 import 数据模块——语言包未就绪时 t() 在开发/测试态抛错，
 * 而数据表在模块级取词。Node 环境下 locale 守卫回退基线语言 zh-CN，
 * 因此 JSON 中的文案（遭遇选项标签等）即 zh-CN 解析值。
 *
 * 输出：tools/balance/data/balance-data.json（schema:1，无时间戳——
 * 确定性输出保证基线对照稳定与新鲜度校验可复现）。
 *
 * 私有常量说明（src/ 零改动边界内的两处最小提取）：
 *  - offline 的 OFFLINE_CAP（src/lib/offline-gains.ts 模块私有，非导出值），
 *    文本提取集中在导出器一处，脚本侧不再各自提取；
 *  - endless 的 TEMPLATE_IDS / TEMPLATE_NORMALIZE 同为模块私有，但可由公开
 *    API 推导（endlessEnemies 深度轮换编成 + STRONGHOLDS 等比匹配 + 强度
 *    公式重算），并经逐值 round 校验兜底，故不做文本提取。
 *
 * 用法：
 *   node tools/balance/export-data.mjs          # 生成（写 data/balance-data.json）
 *   node tools/balance/export-data.mjs --check  # 新鲜度校验：临时文件逐字节比对
 */

import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = resolve(REPO, 'tools/balance/data')
const OUT_FILE = resolve(OUT_DIR, 'balance-data.json')
const CHECK = process.argv.includes('--check')

// ---------- 输出确定性守卫：非 JSON 值 / 非有限数直接报错 ----------
// Decimal / BigInt / Map / Set 等被静默序列化成字符串或丢结构是基线对照的假绿来源。
function assertJsonSafe(value, path) {
  if (value === null || value === undefined) return
  const t = typeof value
  if (t === 'number') {
    if (!Number.isFinite(value)) throw new Error(`非有限数 @ ${path}`)
    return
  }
  if (t === 'string' || t === 'boolean') return
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertJsonSafe(v, `${path}[${i}]`))
    return
  }
  if (t === 'object') {
    const proto = Object.getPrototypeOf(value)
    if (proto !== Object.prototype && proto !== null) {
      throw new Error(`非 JSON 值 @ ${path}（${value.constructor?.name ?? '未知类'}）`)
    }
    for (const k of Object.keys(value)) assertJsonSafe(value[k], `${path}.${k}`)
    return
  }
  throw new Error(`非 JSON 值 @ ${path}（${t}）`)
}

// ---------- 通用文案剥离（relics / achievements / buildings 数值快照） ----------
const STRIP_KEYS = new Set(['name', 'desc', 'icon', 'label', 'short', 'color', 'aria'])
function stripText(value, path) {
  if (Array.isArray(value)) return value.map((v, i) => stripText(v, `${path}[${i}]`))
  if (value !== null && typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) {
      if (STRIP_KEYS.has(k)) continue
      out[k] = stripText(value[k], `${path}.${k}`)
    }
    return out
  }
  if (value === undefined) return undefined
  assertJsonSafe(value, path)
  return value
}

// ---------- Vite SSR 载入 ----------
const server = await createServer({
  root: REPO,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
})
try {
  // 语言包先就绪，数据模块模块级取词才可用（i18n 头注约束）
  const i18n = await server.ssrLoadModule('/src/i18n/index.ts')
  await i18n.loadLocaleBundles()

  const unitsMod = await server.ssrLoadModule('/src/data/units.ts')
  const traitsMod = await server.ssrLoadModule('/src/data/traits.ts')
  const techMod = await server.ssrLoadModule('/src/data/tech.ts')
  const pveMod = await server.ssrLoadModule('/src/data/pve.ts')
  const endlessMod = await server.ssrLoadModule('/src/data/endless.ts')
  const encountersMod = await server.ssrLoadModule('/src/data/encounters.ts')
  const dispatchMod = await server.ssrLoadModule('/src/data/dispatch.ts')
  const relicsMod = await server.ssrLoadModule('/src/data/relics.ts')
  const achievementsMod = await server.ssrLoadModule('/src/data/achievements.ts')
  const buildingsMod = await server.ssrLoadModule('/src/data/buildings.ts')

  const power = (enemies) =>
    enemies.reduce((a, e) => a + (e.attack + e.defense + e.hp) * e.count, 0)
  const byId = (list, id) => {
    const hit = list.find((s) => s.id === id)
    if (!hit) throw new Error(`据点缺失: ${id}`)
    return hit
  }

  // ---------- endless 模板推导（TEMPLATE_IDS / TEMPLATE_NORMALIZE 为模块私有） ----------
  // 模板顺序 = (深度-1) mod 4 轮换：取 d=1..4 的 endlessEnemies 输出编成，
  // 与 STRONGHOLDS 各据点编成做等比匹配（unitId/count 逐位相等，数值×同一系数、
  // 容忍 round 误差 ±1），要求恰好唯一命中；归一化系数按强度公式重算后
  // 经 endlessEnemies 逐值 round 校验兜底——任一不吻合即抛错。
  const strongholds = pveMod.STRONGHOLDS
  const matchTemplate = (depth) => {
    const out = endlessMod.endlessEnemies(depth)
    // 每敌兵满足 round(e × k) = o ⇔ (o-0.5)/e ≤ k ≤ (o+0.5)/e；
    // 候选成立 ⇔ attack/defense/hp 全部 round 区间交集非空（容 round 误差，
    // 不放大单兵误差——首敌攻击小、后位攻击大时逐位单点换算会假阴性）
    const hits = strongholds.filter((s) => {
      if (s.enemies.length !== out.length) return false
      let low = 0,
        high = Infinity
      for (let i = 0; i < s.enemies.length; i++) {
        const e = s.enemies[i],
          o = out[i]
        if (e.unitId !== o.unitId || e.count !== o.count) return false
        for (const f of ['attack', 'defense', 'hp']) {
          if (e[f] <= 0) return false
          low = Math.max(low, (o[f] - 0.5) / e[f])
          high = Math.min(high, (o[f] + 0.5) / e[f])
        }
      }
      return low <= high
    })
    if (hits.length !== 1) {
      throw new Error(`深度 ${depth} 模板匹配歧义（命中 ${hits.length} 个，需唯一）`)
    }
    return hits[0]
  }
  const templateIds = [1, 2, 3, 4].map(matchTemplate).map((s) => s.id)
  const basePower = power(byId(strongholds, endlessMod.ENDLESS_UNLOCK_STRONGHOLD).enemies)
  const templateNormalize = {}
  for (const id of templateIds) templateNormalize[id] = basePower / power(byId(strongholds, id).enemies)
  // 逐值 round 校验：推导的 normalize 与模块内实现必须逐位一致
  for (let d = 1; d <= 4; d++) {
    const out = endlessMod.endlessEnemies(d)
    const tpl = byId(strongholds, templateIds[d - 1])
    const k = endlessMod.endlessScale(d) * templateNormalize[templateIds[d - 1]]
    tpl.enemies.forEach((e, i) => {
      for (const f of ['attack', 'defense', 'hp']) {
        if (out[i][f] !== Math.round(e[f] * k)) {
          throw new Error(`endless 校验失败: 深度 ${d} 敌方 ${f} 位 ${i}（${out[i][f]} != ${Math.round(e[f] * k)}）`)
        }
      }
    })
  }

  // ---------- dispatch 私有同源值的行为推导 ----------
  // REWARD_GROWTH（dispatch.ts 私有声明、与 endless 同源）：由公开函数
  // dispatchRewardScale 的增比反推，避免两端声明日后漂移时导出错值。
  const dispatchGrowth = dispatchMod.dispatchRewardScale(2) / dispatchMod.dispatchRewardScale(1)
  // 奖励基数：best=1（scale=1）、weight=1、无特性 → round(base)=base
  const dispatchBaseRewards = dispatchMod.dispatchReward(1, 1.0, undefined)

  // ---------- offline 私有常量：唯一文本提取点 ----------
  const offlineSrc = readFileSync(resolve(REPO, 'src/lib/offline-gains.ts'), 'utf8')
  const capMatch = offlineSrc.match(/OFFLINE_CAP\s*=\s*(\d+)\s*\*\s*(\d+)/)
  if (!capMatch) throw new Error('OFFLINE_CAP 提取失败（src/lib/offline-gains.ts）')
  const offlineCap = Number(capMatch[1]) * Number(capMatch[2])

  // ---------- 组装快照（各域显式投影，键序即字段序，保证输出确定性） ----------
  const data = {
    schema: 1,
    units: unitsMod.UNITS.map((u) => ({
      id: u.id,
      attack: u.attack,
      defense: u.defense,
      hp: u.hp,
      counters: [...u.counters],
      counterMult: u.counterMult,
    })),
    traits: traitsMod.TRAITS.map((t) => ({
      id: t.id,
      atkMult: t.atkMult,
      hpMult: t.hpMult,
      counterBonus: t.counterBonus,
      garrisonMult: t.garrisonMult,
    })),
    tech: techMod.TECHS.map((t) => ({
      id: t.id,
      branch: t.branch,
      tier: t.tier,
      cost: { ...t.cost },
      requires: t.requires ? [...t.requires] : undefined,
      effects: t.effects.map((e) => ({ type: e.type, target: e.target, value: e.value })),
    })),
    pve: {
      strongholds: strongholds.map((s) => ({
        id: s.id,
        // 据点显示名：核验表输出列消费（基线语言解析值）
        name: s.name,
        type: s.type,
        tier: s.tier,
        requires: s.requires,
        enemies: s.enemies.map((e) => ({
          unitId: e.unitId,
          attack: e.attack,
          defense: e.defense,
          hp: e.hp,
          count: e.count,
          counteredBy: e.counteredBy ? [...e.counteredBy] : undefined,
        })),
        rewards: { ...s.rewards },
        idle: { ...s.idle },
      })),
    },
    endless: {
      enemyGrowth: endlessMod.ENEMY_GROWTH,
      rewardGrowth: endlessMod.REWARD_GROWTH,
      maxDepth: endlessMod.MAX_ENDLESS_DEPTH,
      milestoneStep: endlessMod.MILESTONE_STEP,
      templateIds,
      templateNormalize,
    },
    encounters: encountersMod.ENCOUNTERS.map((e) => ({
      id: e.id,
      flavor: e.flavor,
      optA: { label: e.optA.label, chances: e.optA.chances.map(({ p, rewards }) => ({ p, rewards: { ...rewards } })) },
      optB: { label: e.optB.label, chances: e.optB.chances.map(({ p, rewards }) => ({ p, rewards: { ...rewards } })) },
    })),
    dispatch: {
      tiers: dispatchMod.DISPATCH_TIERS.map(({ hours, weight }) => ({ hours, weight })),
      rewardGrowth: dispatchGrowth,
      baseRewards: { ...dispatchBaseRewards },
    },
    relics: {
      maxLevel: relicsMod.MAX_RELIC_LEVEL,
      enhanceGain: { ...relicsMod.ENHANCE_GAIN },
      rarityWeights: Object.fromEntries(
        Object.entries(relicsMod.RARITY_INFO).map(([id, info]) => [id, info.weight])
      ),
      pool: relicsMod.RELIC_POOL.map((r) =>
        stripText({ id: r.id, rarity: r.rarity, effects: [...r.effects] }, `relics.pool.${r.id}`)
      ),
      sets: relicsMod.RELIC_SETS.map((s) =>
        stripText({ id: s.id, memberIds: [...s.memberIds], partial: { ...s.partial }, full: { ...s.full } }, `relics.sets.${s.id}`)
      ),
    },
    achievements: achievementsMod.ACHIEVEMENTS.map((a) =>
      stripText(
        { id: a.id, category: a.category, metric: a.metric, threshold: a.threshold, effects: [...a.effects] },
        `achievements.${a.id}`
      )
    ),
    buildings: buildingsMod.BUILDINGS.map((b) =>
      stripText(
        {
          id: b.id,
          sector: b.sector,
          tier: b.tier,
          costGrowth: b.costGrowth,
          baseCost: { ...b.baseCost },
          produces: { ...b.produces },
          requires: b.requires,
          maxLevel: b.maxLevel,
        },
        `buildings.${b.id}`
      )
    ),
    offline: { capSeconds: offlineCap },
  }

  assertJsonSafe(data, '$')
  const json = JSON.stringify(data, null, 2) + '\n'

  if (CHECK) {
    const tmp = mkdtempSync(resolve(tmpdir(), 'balance-export-'))
    try {
      const tmpFile = resolve(tmp, 'balance-data.json')
      writeFileSync(tmpFile, json)
      const current = readFileSync(OUT_FILE, 'utf8')
      if (current !== json) {
        console.error('balance-data.json 与数据源不一致（陈旧），请运行: corepack pnpm balance:export')
        process.exit(1)
      }
      console.log('balance-data.json 新鲜度校验通过')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  } else {
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(OUT_FILE, json)
    console.log(`已生成 ${OUT_FILE}（${(json.length / 1024).toFixed(1)} KiB）`)
  }
} finally {
  await server.close()
}
