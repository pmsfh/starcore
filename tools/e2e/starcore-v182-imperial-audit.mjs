// 星核纪元 v1.82 专项回归：巡检迎战档位与满池领取
// A. 档位面板：pending 巡检战斗页默认标准 / 切从严 hint 在场 / 敌方深度名随档位 +1
// B. 从严迎战胜利：passed 卡文案 +30%（相对标准 +10%）
// C. 读回保留：胜利后的真实档注入新 context，passed 卡仍 +30%（bonus 1.3 白名单）
// D. 满池警示：池积 12 小时按钮文案「池将满溢」/ 领取后恢复
// E. 成就页：帝庭纪事分区 5 卡渲染（54 卡基线由 v057/v122 覆盖）
// 时间控制：绝对时间戳制（lastClaimAt 拨早，page.clock 禁用惯例）
import { launch, finish, check, savePayload, injectSave, BASE_URL } from './starcore-pwlib.mjs'

const BASE = BASE_URL
const HOUR = 3_600_000
const REQ_NODES = [
  'node_galaxy_hub',
  'node_arm_gate',
  'node_arm_spine',
  'node_arm_cradle',
  'node_galaxy_range',
  'node_galaxy_halo',
]

let pass = 0
let fail = 0
const FAILURES = []
async function v(label, fn) {
  try {
    await fn()
    pass++
    console.log(`  ✓ ${label}`)
  } catch (e) {
    fail++
    FAILURES.push(`${label}: ${e.message}`)
    check(`${label}: ${e.message}`, false)
  }
}

/** 当前 ISO 周标识（YYYY-Www，与应用 getCurrentWeek 同口径）*/
function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  return date.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0')
}

/** 全接管种子档（巡检 pending 指向 imp_pass）*/
function seedImperial({ lastClaimAt = Date.now() } = {}) {
  const now = Date.now()
  const progress = {}
  for (const id of REQ_NODES)
    progress[id] = { nodeId: id, startTime: 0, endTime: 0, completed: true }
  const ids = ['imp_pass', 'imp_audit', 'imp_guard', 'imp_verdict', 'imp_echo', 'imp_court']
  const capturedAt = {}
  for (const id of ids) capturedAt[id] = 0
  return {
    version: 1,
    savedAt: now,
    player: { id: 'p1', name: '指挥官' },
    totalPlayTime: 0,
    resources: {
      amounts: { energy: '1e18', alloy: '1e18', crystal: '1e18', data: '1e18', dark: '1e15' },
      totals: { energy: '1e18', alloy: '1e18', crystal: '1e18', data: '1e18', dark: '1e15' },
    },
    buildings: { levels: {} },
    research: { completed: ['military_basic'] },
    military: {
      owned: { assault: 999_999_999, guard: 999_999_999, heavy: 999_999_999, psionic: 999_999_999 },
      training: [],
      formations: [
        {
          id: 'f1',
          name: '一队',
          units: {
            assault: 999_999_999,
            guard: 999_999_999,
            heavy: 999_999_999,
            psionic: 999_999_999,
          },
        },
      ],
    },
    combat: { garrisoned: {}, completed: ['silencer_3'], expeditionBest: 34 },
    exploration: { progress },
    relics: { owned: [], equipped: [] },
    transcend: { negativeEntropy: '0', totalTranscends: 0, tree: [] },
    daily: {
      lastCheckIn: new Date().toLocaleDateString('sv'),
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
      challengeWeek: '',
      weekChallenges: [],
    },
    imperial: {
      completed: ids,
      everCompleted: ids,
      tiers: {},
      capturedAt,
      lastClaimAt,
      audit: {
        week: '2020-W01',
        targetId: 'imp_pass',
        deadline: Date.now() + 86_400_000,
        status: 'pending',
      },
    },
  }
}

async function newPage(browser, save, path, waitMs = 2000) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('    [console.error] ' + m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => console.log('    [pageerror] ' + String(e).slice(0, 200)))
  await ctx.addInitScript(injectSave, savePayload(save))
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(waitMs)
  return { ctx, page }
}

/** 关掉新手引导弹窗（若在场），避免遮挡与误点 */
async function dismissOnboarding(page) {
  const btn = page.locator('button', { hasText: '知道了' }).first()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(300)
  }
}

const browser = await launch()

// A. 档位面板（切档与深度断言，不打）
console.log('== A. 档位面板 ==')
{
  const { ctx, page } = await newPage(browser, seedImperial(), '/map', 2500)
  await dismissOnboarding(page)
  await v('A1 巡检卡 pending 生成', async () => {
    await page
      .locator('[data-testid="imperial-audit-pending"]')
      .waitFor({ state: 'visible', timeout: 8000 })
  })
  await v('A2 战斗页档位面板默认标准', async () => {
    await page.locator('[data-testid="imperial-audit-fight"]').click()
    await page.waitForURL('**/battle/imperial_audit', { timeout: 5000 })
    await page.waitForTimeout(1000)
    const panel = page.locator('[data-testid="audit-difficulty"]')
    await panel.waitFor({ state: 'visible', timeout: 8000 })
    const active = await panel.locator('.diff-active').textContent()
    if (!active.includes('标准')) throw new Error('默认档非标准: ' + active)
  })
  await v('A3 切从严：hint 与敌方深度名 +1', async () => {
    const enemy = page.locator('.enemy-card .e-name').first()
    const stdName = (await enemy.textContent()) ?? ''
    await page.locator('[data-testid="audit-diff-strict"]').click()
    await page.waitForTimeout(500)
    const strictName = (await enemy.textContent()) ?? ''
    if (strictName === stdName) throw new Error('切从严敌方名未变: ' + strictName)
    const hint = await page.locator('.diff-hint').textContent()
    if (!hint.includes('敌方深度 +1')) throw new Error('从严 hint 缺位: ' + hint)
  })
  await ctx.close()
}

// B. 从严迎战胜利（战斗页内断言：+30% 提示；回图返回按钮为整页导航，
//    addInitScript 注入模式下重载会打回种子态，故不回图——胜利结算 → bonus 1.3
//    的 store 链路由单测 imperial-game.test 覆盖）
console.log('== B. 从严迎战胜利 ==')
{
  const { ctx, page } = await newPage(browser, seedImperial(), '/map', 2500)
  await dismissOnboarding(page)
  await page.locator('[data-testid="imperial-audit-fight"]').click()
  await page.waitForURL('**/battle/imperial_audit', { timeout: 5000 })
  await page.waitForTimeout(800)
  await page.locator('[data-testid="audit-diff-strict"]').click()
  await page.waitForTimeout(500)
  await v('B1 从严迎战胜利：结算提示 +30%', async () => {
    await page.locator('[data-testid="battle-start"]').first().click()
    await page.waitForSelector('.modal-overlay', { timeout: 20_000 }).catch(() => {})
    let ok = false
    for (let i = 0; i < 15; i++) {
      const txt = await page.locator('body').innerText()
      if (txt.includes('胜 利') || txt.includes('Victory')) {
        if (txt.includes('+30%')) ok = true
        break
      }
      await page.waitForTimeout(1000)
    }
    if (!ok) throw new Error('胜利后未见 +30% 提示')
  })
  await ctx.close()
}

// C. 读回保留：预置从严通过档（passed + bonus 1.3）注入 = hydrate 白名单真实路径
console.log('== C. 读回保留 ==')
{
  const seed = seedImperial()
  seed.imperial.audit.week = isoWeek()
  seed.imperial.audit.status = 'passed'
  seed.imperial.audit.paid = false
  seed.imperial.bonus = 1.3
  const { ctx, page } = await newPage(browser, seed, '/map', 2500)
  await v('C1 读回保留：passed 卡仍 +30%（bonus 1.3 白名单）', async () => {
    const card = page.locator('[data-testid="imperial-audit-passed"]')
    await card.waitFor({ state: 'visible', timeout: 8000 })
    const txt = await card.textContent()
    if (!txt.includes('+30%')) throw new Error('读回后 passed 卡丢 +30%: ' + txt.slice(0, 80))
  })
  await ctx.close()
}

// D. 满池警示
console.log('== D. 满池警示 ==')
{
  const { ctx, page } = await newPage(
    browser,
    seedImperial({ lastClaimAt: Date.now() - 12 * HOUR }),
    '/map',
    2500
  )
  await v('D1 池积 12 小时按钮转「池将满溢」', async () => {
    const claim = page.locator('[data-testid="imperial-pool-claim"]')
    await claim.waitFor({ state: 'visible', timeout: 8000 })
    const txt = await claim.textContent()
    if (!txt.includes('池将满溢')) throw new Error('临满文案缺位: ' + txt)
    if (!(await claim.getAttribute('class')).includes('ip-claim-nearfull'))
      throw new Error('临满警示类缺位')
  })
  await v('D2 领取后恢复常规文案', async () => {
    await page.locator('[data-testid="imperial-pool-claim"]').click()
    await page.waitForTimeout(600)
    const claim = page.locator('[data-testid="imperial-pool-claim"]')
    const txt = await claim.textContent()
    if (txt.includes('池将满溢')) throw new Error('领取后警示未解除: ' + txt)
  })
  await ctx.close()
}

// E. 成就页帝庭纪事分区
console.log('== E. 成就页帝庭纪事 ==')
{
  const { ctx, page } = await newPage(browser, seedImperial(), '/achievements', 2000)
  await v('E1 帝庭纪事分区与 5 卡渲染', async () => {
    const section = page.locator('.ach-section', { hasText: '帝庭纪事' })
    await section.waitFor({ state: 'visible', timeout: 8000 })
    const cards = await section.locator('.ach-card').count()
    if (cards !== 5) throw new Error(`帝庭类卡数 ${cards} ≠ 5`)
    const body = await section.textContent()
    for (const name of ['贡道首驿', '六驿贯通', '仪卫列装', '炉前常客', '帝庭裁决者']) {
      if (!body.includes(name)) throw new Error(`卡缺位: ${name}`)
    }
  })
  await ctx.close()
}

if (FAILURES.length) {
  console.log(`\n失败 ${FAILURES.length} 项:`)
  for (const f of FAILURES) console.log('  ✗ ' + f)
}
await finish(browser)
