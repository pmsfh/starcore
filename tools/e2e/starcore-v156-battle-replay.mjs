// 星核纪元 v1.56 专项回归：战斗过程演出（战报逐条播出）
// A. 逐条播出：出征后弹窗不即出、战报条目递增、播完弹窗自动出场
// B. 点击战报区跳过：播出中点击立即补全弹窗
// C. Esc 跳过：播出中按键立即补全弹窗
// D. 减动效降级：reduced-motion 下不播出、弹窗结算后即出
// 种子口径：战斗种子 = 编队 id + 据点 id + 当前分钟；冻结 Date.now 后
// 15 突击兵对 raider_2 恒为 6 条战报、胜利（本档实测校准 2026-10-11）。
// 冻结必须在加载前经 addInitScript 注入：加载后冻结会让存档 savedAt
// 落后于真实时钟，离线收益报告弹窗遮挡出征按钮（探针实踩）。
import { launch, check, finish, newSeededPage, savePayload, injectSave, BASE_URL } from './starcore-pwlib.mjs';

const FREEZE_TS = 1760000000000;

// 富档：15 突击兵对 raider_2（node_inner 解锁）
function makeSave(savedAt = FREEZE_TS) {
  const progress = {};
  for (const n of ['node_orbit', 'node_inner']) {
    progress[n] = { nodeId: n, startTime: 0, endTime: 1, completed: true };
  }
  return {
    version: 1,
    savedAt,
    player: { id: 't', name: '测试' },
    totalPlayTime: 0,
    resources: {
      amounts: { energy: '1000000', crystal: '100000', alloy: '10000' },
      totals: { energy: '1000000', crystal: '100000', alloy: '10000' },
    },
    buildings: { levels: {} },
    research: { completed: [] },
    military: {
      owned: { assault: 15 },
      training: [],
      formations: [{ id: 'f1', name: '主力', units: { assault: 15 } }],
    },
    combat: { garrisoned: {}, completed: [], expeditionBest: 0, milestonesClaimed: [] },
    exploration: { progress },
    relics: { owned: [], equipped: [null, null, null, null] },
    transcend: { negativeEntropy: '0', totalTranscends: 0, tree: [] },
    achievements: {
      lifetime: { energy: '0', dark: '0', upgrades: 0, maxBuildingLevel: 0, researches: 0, explores: 0, battles: 0 },
      unlocked: {},
    },
  };
}

// 注档页 + 加载前冻结时钟（定战斗种子，战报条数恒定）
async function seededFrozenPage(browser, path) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((ts) => { Date.now = () => ts; }, FREEZE_TS);
  await ctx.addInitScript(injectSave, savePayload(makeSave()));
  const page = await ctx.newPage();
  await page.goto(BASE_URL + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  return page;
}

const browser = await launch();

// A. 逐条播出 + 播完弹窗
console.log('== A. 战报逐条播出：递增与弹窗延后出场 ==');
{
  const page = await seededFrozenPage(browser, '/battle/raider_2');
  await page.locator('[data-testid="battle-start"]').click();
  await page.waitForTimeout(400);
  const logArea = page.locator('[data-testid="battle-log"]');
  check('A1 播出期弹窗不出现', (await page.locator('.modal').count()) === 0);
  check('A2 战报区出现且已播 1 条以上', (await logArea.locator('.log-entry').count()) >= 1);
  check('A3 跳过提示可见', (await logArea.locator('.log-hint').count()) === 1);
  check('A4 播放期出征按钮禁用', await page.locator('[data-testid="battle-start"]').isDisabled());
  const early = await logArea.locator('.log-entry').count();
  await page.waitForTimeout(500);
  const later = await logArea.locator('.log-entry').count();
  check(`A5 条目逐条递增（${early} → ${later}）`, later > early);
  await page.waitForSelector('.modal', { timeout: 12000 });
  const modal = page.locator('.modal');
  check('A6 播完弹窗自动出场且为胜利', await modal.evaluate((el) => el.classList.contains('victory')));
  const modalLog = await modal.locator('.log-entry').count();
  check(`A7 弹窗战报为完整 6 条（实际 ${modalLog}）`, modalLog === 6);
  check('A8 播完提示撤下', (await page.locator('.log-hint').count()) === 0);
  // 留下清空页内战报区
  await modal.getByRole('button', { name: '留在此据点' }).click();
  await page.waitForTimeout(400);
  check('A9 留下后页内战报区清空', (await page.locator('[data-testid="battle-log"]').count()) === 0);
  await page.context().close();
}

// B. 点击战报区跳过
console.log('== B. 点击战报区跳过 ==');
{
  const page = await seededFrozenPage(browser, '/battle/raider_2');
  await page.locator('[data-testid="battle-start"]').click();
  await page.waitForSelector('[data-testid="battle-log"] .log-entry', { timeout: 8000 });
  await page.locator('[data-testid="battle-log"]').click();
  await page.waitForSelector('.modal', { timeout: 2000 });
  check('B1 点击战报区立即弹出结果弹窗', (await page.locator('.modal').count()) === 1);
  check('B2 弹窗战报已补全 6 条', (await page.locator('.modal .log-entry').count()) === 6);
  await page.context().close();
}

// C. Esc 跳过
console.log('== C. Esc 键跳过 ==');
{
  const page = await seededFrozenPage(browser, '/battle/raider_2');
  await page.locator('[data-testid="battle-start"]').click();
  await page.waitForSelector('[data-testid="battle-log"] .log-entry', { timeout: 8000 });
  await page.keyboard.press('Escape');
  await page.waitForSelector('.modal', { timeout: 2000 });
  check('C1 Esc 立即弹出结果弹窗', (await page.locator('.modal').count()) === 1);
  await page.context().close();
}

// D. 减动效降级
console.log('== D. 减动效：不播出、弹窗结算后即出 ==');
{
  const page = await newSeededPage(browser, makeSave(Date.now()), '/battle/raider_2', {
    extraCtx: { reducedMotion: 'reduce' },
  });
  await page.locator('[data-testid="battle-start"]').click();
  await page.waitForTimeout(900);
  check('D1 减动效下弹窗即出（无播出）', (await page.locator('.modal').count()) === 1);
  check('D2 减动效下无跳过提示', (await page.locator('.log-hint').count()) === 0);
  await page.context().close();
}

await finish(browser);
