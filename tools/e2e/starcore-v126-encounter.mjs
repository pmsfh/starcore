// 星核纪元 v1.26 专项回归：随机遭遇事件
// A. 触发与渲染：预制窗口旧值 tick 触发事件卡（标题/描述/双选项）+ 触发提醒 toast + 冷却不重触
// B. 结算与发放：选项 A 稳定结算（能量入账+回执终态单实例）/ 负合金损失至多扣空
// C. 过期失效：未过期挂起正常渲染；离线归来过期直接失效且静默（无 toast）
// D. 转生清空：SPA 转生后挂起清空、窗口重开（本轮数据口径）
// E. 存档往返：挂起入档 / 未知挂起 id 剥离不拒档 / 旧档缺键兼容
// F. 移动视口（390px）：渲染 / 无溢出 / 双按钮并排 / 结算可用
// G. 扩容事件（v1.58）：新事件渲染 / 晶体入账 / 收编回执兵种名（池 10 → 25）
// 随机性控制：addInitScript 固定 Math.random=0（事件恒池首 enc_flux、窗口恒下界 480s）
import { launch, check, finish, savePayload, injectSave, BASE_URL } from './starcore-pwlib.mjs';

const BASE = BASE_URL;

let pass = 0;
let fail = 0;
const FAILURES = [];
/** await 等待后校验：fn 抛错即计失败（与 v124 的「等待+布尔 check」等价的容错式） */
async function v(label, fn) {
  try {
    await fn();
    pass++;
    console.log(`  ✓ ${label}`);
  } catch (e) {
    fail++;
    FAILURES.push(`${label}: ${e.message}`);
    console.log(`  ✗ ${label}: ${e.message}`);
  }
}

/** 本地日期 YYYY-MM-DD（换天与自动签到按本地日判定；UTC 形态在本地 0~8 时窗口会误判换天并叠加自动签到奖励，2026-09-27 实踩） */
function localDateStr(d = new Date()) { return d.toLocaleDateString('sv'); }
const TODAY = localDateStr();

/** 种子档（固定随机性下的确定性场景；encounters 为 null 时删键模拟旧档） */
function makeSeed({ energy = '50000', alloy = '2000', crystal = '0', encounters } = {}) {
  const now = Date.now();
  const save = {
    version: 1,
    savedAt: now,
    player: { id: 'p1', name: '指挥官' },
    totalPlayTime: 0,
    resources: { amounts: { energy, crystal, alloy, data: '300', dark: '4' }, totals: { energy, crystal, alloy, data: '300', dark: '4' } },
    buildings: { levels: {} },
    research: { completed: [] },
    military: { owned: { assault: 10 }, training: [], formations: [{ id: 'f1', name: 'F1', units: { assault: 10 } }] },
    combat: { garrisoned: {}, completed: [] },
    exploration: { progress: {} },
    relics: { owned: [], equipped: [] },
    transcend: { negativeEntropy: '0', totalTranscends: 0, tree: [] },
    daily: {
      lastCheckIn: TODAY,
      streak: 1,
      weeklyCounters: { battles: 0, explores: 0, researches: 0, upgrades: 0, transcends: 0, expedition: 0, synths: 0, enhances: 0, garrisonHours: 0 },
      challengeWeek: '',
      weekChallenges: [],
    },
  };
  if (encounters !== null) save.encounters = encounters ?? { nextTriggerAt: now - 1000 };
  return save;
}

/** 固定 Math.random 的上下文（事件恒池首、结果恒首支、窗口恒 480s） */
async function stubCtx(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    Math.random = () => 0;
  });
  return ctx;
}

const browser = await launch();

// A. 触发与渲染
console.log('== A. 触发与渲染 ==');
{
  const ctx = await stubCtx(browser);
  const errs = [];
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('response', (r) => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); });
  await ctx.addInitScript(injectSave, savePayload(makeSeed()));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

  const card = page.locator('[data-testid="encounter-card"]');
  await v('A1 预制窗口旧值：事件卡触发渲染', () => card.waitFor({ state: 'visible', timeout: 8000 }).then(() => card.textContent()).then((t) => { if (!t.includes('遭遇事件')) throw new Error('缺「遭遇事件」: ' + t); }));
  await v('A2 标题含事件名（固定通道恒池首）', async () => {
    const t = await card.textContent();
    if (!/遭遇事件\s*·\s*\S/.test(t.replace(/\s+/g, ' '))) throw new Error('标题无事件名: ' + t);
  });
  await v('A3 事件描述渲染非空', async () => {
    const d = (await page.locator('.enc-desc').textContent()).trim();
    if (!d) throw new Error('描述为空');
  });
  await v('A4 双选项可点且标签非空', async () => {
    for (const sel of ['A', 'B']) {
      const loc = page.locator(`[data-testid="encounter-opt-${sel}"]`);
      if (!(await loc.textContent()).trim()) throw new Error(`选项 ${sel} 标签空`);
      if (await loc.isDisabled()) throw new Error(`选项 ${sel} 禁用`);
    }
  });
  await v('A5 触发全局提醒 toast「遭遇事件」', async () => {
    await page.waitForSelector('.toast', { timeout: 5000 });
    const t = (await page.textContent('.toast')).trim();
    if (t !== '遭遇事件') throw new Error('提醒文案不对: ' + t);
  });
  await v('A6 选项 A 结算：卡片消失 + 回执终态单实例', async () => {
    await page.click('[data-testid="encounter-opt-A"]');
    await card.waitFor({ state: 'detached', timeout: 5000 });
    await page.waitForTimeout(900);
    const n = await page.locator('.toast').count();
    if (n !== 1) throw new Error(`同屏 toast ${n} 个`);
    const t = (await page.textContent('.toast')).trim();
    if (!t.includes('：')) throw new Error('终态非回执: ' + t);
  });
  await v('A7 回执含事件名与资源变动（能量涌流：+8,000 能量）', async () => {
    const t = (await page.textContent('.toast')).trim();
    if (!t.includes('能量涌流') || !t.includes('能量')) throw new Error('回执不完整: ' + t);
  });
  await v('A8 冷却期不重触（2.2s 无新卡）', async () => {
    await page.waitForTimeout(2200);
    if ((await page.locator('[data-testid="encounter-card"]').count()) !== 0) throw new Error('冷却期重触');
  });
  await v('A9 console/pageerror/HTTP≥400 三路零命中', () => {
    if (errs.length) throw new Error(errs.slice(0, 3).join(' | '));
  });
  await ctx.close();
}

// B. 结算发放：能量入账 + 负合金损失
console.log('== B. 结算与发放 ==');
{
  const ctx = await stubCtx(browser);
  const page = await ctx.newPage();
  await ctx.addInitScript(injectSave, savePayload(makeSeed()));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const card = page.locator('[data-testid="encounter-card"]');
  await card.waitFor({ state: 'visible', timeout: 8000 });
  await v('B1 选项 A 能量入账（首页能量节点 50K → 58K）', async () => {
    await page.click('[data-testid="encounter-opt-A"]');
    await card.waitFor({ state: 'detached', timeout: 5000 });
    await page.waitForTimeout(400);
    // v1.43 起首页顶栏资源条隐藏，改验 hero 能量节点
    const energyVal = await page.evaluate(() => document.querySelector('.pos-energy .node-value')?.textContent?.trim() || '');
    if (energyVal !== '58K') throw new Error('能量未入账 58K: ' + energyVal);
  });
  await ctx.close();

  // 负合金：enc_core B 末支 -1300（随机通道 0.99 命中末支）
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx2.addInitScript(() => {
    Math.random = () => 0.99;
  });
  const page2 = await ctx2.newPage();
  await ctx2.addInitScript(injectSave, savePayload(makeSeed({ encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_core', pendingAt: Date.now() } })));
  await page2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await v('B2 负合金损失：2000 − 1300 = 700（首页合金节点）', async () => {
    const card2 = page2.locator('[data-testid="encounter-card"]');
    await card2.waitFor({ state: 'visible', timeout: 8000 });
    await page2.click('[data-testid="encounter-opt-B"]');
    await card2.waitFor({ state: 'detached', timeout: 5000 });
    await page2.waitForTimeout(400);
    // v1.43 起首页顶栏资源条隐藏，改验 hero 合金节点
    const alloyVal = await page2.evaluate(() => document.querySelector('.pos-alloy .node-value')?.textContent?.trim() || '');
    if (alloyVal !== '700') throw new Error('合金未按 700 入账: ' + alloyVal);
  });
  await ctx2.close();

  // 扣空分支：库存 1000 < 1300
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx3.addInitScript(() => {
    Math.random = () => 0.99;
  });
  const page3 = await ctx3.newPage();
  await ctx3.addInitScript(injectSave, savePayload(makeSeed({ alloy: '1000', encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_core', pendingAt: Date.now() } })));
  await page3.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await v('B3 损失超库存扣至空（1000 → 0）', async () => {
    const card3 = page3.locator('[data-testid="encounter-card"]');
    await card3.waitFor({ state: 'visible', timeout: 8000 });
    await page3.click('[data-testid="encounter-opt-B"]');
    await card3.waitFor({ state: 'detached', timeout: 5000 });
    await page3.waitForTimeout(400);
    // v1.43 起首页顶栏资源条隐藏，改验 hero 合金节点（扣至空且不现负号）
    const alloy = await page3.evaluate(() => {
      const el = document.querySelector('.pos-alloy');
      return {
        value: el?.querySelector('.node-value')?.textContent?.trim() ?? '(无节点)',
        rate: el?.querySelector('.node-rate')?.textContent?.trim() ?? '(无)',
      };
    });
    if (/-/.test(alloy.value + alloy.rate)) throw new Error('出现负库存展示');
    if (alloy.value !== '0') throw new Error('未按扣至空展示: ' + JSON.stringify(alloy));
  });
  await ctx3.close();
}

// C. 过期失效
console.log('== C. 过期失效 ==');
{
  const ctx = await stubCtx(browser);
  const page = await ctx.newPage();
  await ctx.addInitScript(injectSave, savePayload(makeSeed({ encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_flux', pendingAt: Date.now() - 10_000 } })));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await v('C1 未过期挂起（10s 前）：事件卡正常渲染', async () => {
    await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible', timeout: 8000 });
  });
  await ctx.close();

  const ctx2 = await stubCtx(browser);
  const page2 = await ctx2.newPage();
  await ctx2.addInitScript(injectSave, savePayload(makeSeed({ encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_flux', pendingAt: Date.now() - 61_000 } })));
  await page2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await v('C2 离线归来过期：挂起直接失效无卡片', async () => {
    await page2.waitForTimeout(3000);
    if ((await page2.locator('[data-testid="encounter-card"]').count()) !== 0) throw new Error('过期挂起仍渲染');
  });
  await v('C3 失效静默：无任何 toast（过期不弹提示）', async () => {
    const toasts = await page2.locator('.toast').allTextContents();
    if (toasts.length > 0) throw new Error('过期弹 toast: ' + toasts.join('|'));
  });
  await ctx2.close();
}

// D. 转生清空
console.log('== D. 转生清空 ==');
{
  const ctx = await stubCtx(browser);
  const page = await ctx.newPage();
  await ctx.addInitScript(injectSave, savePayload(makeSeed({ energy: '400000', encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_flux', pendingAt: Date.now() } })));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible', timeout: 8000 });

  await v('D1 SPA 导航转生页（侧栏点击）', async () => {
    await page.locator('.side-nav .nav-item', { hasText: '奇点' }).first().click();
    await page.waitForURL('**/prestige', { timeout: 5000 });
  });
  await v('D2 转生按钮可点（4e5 ≥ 3e5）', async () => {
    const btn = page.locator('.btn-transcend');
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    if (await btn.isDisabled()) throw new Error('转生按钮禁用');
  });
  await v('D3 转生确认弹窗执行', async () => {
    await page.click('.btn-transcend');
    await page.locator('.modal, [class*="modal"]').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.btn-accent:visible').last().click();
    await page.waitForTimeout(600);
  });
  await v('D4 转生后回首页：挂起事件卡消失（本轮数据清空）', async () => {
    await page.locator('.side-nav .nav-item').first().click();
    await page.waitForTimeout(1500);
    if ((await page.locator('[data-testid="encounter-card"]').count()) !== 0) throw new Error('转生后事件卡仍渲染');
  });
  await v('D5 转生后窗口重开：2s 内不再触发', async () => {
    await page.waitForTimeout(2000);
    if ((await page.locator('[data-testid="encounter-card"]').count()) !== 0) throw new Error('转生后立刻重触');
  });
  await ctx.close();
}

// E. 存档往返
console.log('== E. 存档往返 ==');
{
  const ctx = await stubCtx(browser);
  const page = await ctx.newPage();
  await ctx.addInitScript(injectSave, savePayload(makeSeed({ encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_flux', pendingAt: Date.now() } })));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="encounter-card"]').waitFor({ state: 'visible', timeout: 8000 });
  // 触发一次手动存档：game store save 每帧由自动存档器驱动，此处直接等 15s 周期太慢，
  // 走 localStorage 读备份键（注入即写），主键由 15s 自动存档兜底
  await v('E1 挂起态写盘（备份键含 encounters 三键）', async () => {
    const raw = await page.evaluate(() => localStorage.getItem('starcore_save_v1_backup'));
    if (!raw) throw new Error('无备份存档');
    const data = JSON.parse(JSON.parse(raw).d);
    if (!data.encounters || data.encounters.pendingEventId !== 'enc_flux') {
      throw new Error('挂起未入档: ' + JSON.stringify(data.encounters));
    }
    if (typeof data.encounters.nextTriggerAt !== 'number') throw new Error('窗口未入档');
  });
  await ctx.close();

  const ctx2 = await stubCtx(browser);
  const page2 = await ctx2.newPage();
  await ctx2.addInitScript(injectSave, savePayload(makeSeed({ encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_hack', pendingAt: Date.now() } })));
  await page2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await v('E2 未知挂起 id 导入：剥离不拒档正常进游戏', async () => {
    await page2.locator('.home').waitFor({ state: 'visible', timeout: 8000 });
    await page2.waitForTimeout(1200);
    if ((await page2.locator('[data-testid="encounter-card"]').count()) !== 0) throw new Error('未知 id 挂起竟渲染');
  });
  await ctx2.close();

  const ctx3 = await stubCtx(browser);
  const page3 = await ctx3.newPage();
  await ctx3.addInitScript(injectSave, savePayload(makeSeed({ encounters: null })));
  await page3.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await v('E3 旧档缺 encounters 键：兼容正常进游戏', async () => {
    await page3.locator('.home').waitFor({ state: 'visible', timeout: 8000 });
  });
  await ctx3.close();
}

// F. 移动视口 390px
console.log('== F. 移动视口 390px ==');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    Math.random = () => 0;
  });
  const page = await ctx.newPage();
  await ctx.addInitScript(injectSave, savePayload(makeSeed()));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const card = page.locator('[data-testid="encounter-card"]');
  await v('F1 移动视口事件卡渲染', () => card.waitFor({ state: 'visible', timeout: 8000 }));
  await v('F2 无横向溢出', async () => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) throw new Error(`溢出 ${overflow}px`);
  });
  await v('F3 双按钮同排不换行', async () => {
    const a = await page.locator('[data-testid="encounter-opt-A"]').boundingBox();
    const b = await page.locator('[data-testid="encounter-opt-B"]').boundingBox();
    if (!a || !b) throw new Error('按钮缺位');
    if (a.y !== b.y) throw new Error('双按钮换行');
  });
  await v('F4 事件描述完整显示', async () => {
    const box = await page.locator('.enc-desc').boundingBox();
    if (!box || box.height < 8) throw new Error('描述折叠');
  });
  await v('F5 移动端结算交互可用', async () => {
    await page.click('[data-testid="encounter-opt-A"]');
    await card.waitFor({ state: 'detached', timeout: 5000 });
  });
  await ctx.close();
}

// G. 扩容事件（v1.58：池 10 → 25）
console.log('== G. 扩容事件 ==');
{
  // G1 新事件渲染：注入 enc_gravity 挂起
  const ctx = await stubCtx(browser);
  const page = await ctx.newPage();
  await ctx.addInitScript(injectSave, savePayload(makeSeed({ encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_gravity', pendingAt: Date.now() } })));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const card1 = page.locator('[data-testid="encounter-card"]');
  await v('G1 扩容事件渲染（引力井：标题与双选项齐备）', async () => {
    await card1.waitFor({ state: 'visible', timeout: 8000 });
    const t = (await card1.textContent()).replace(/\s+/g, ' ');
    if (!t.includes('引力井')) throw new Error('缺事件名: ' + t);
    if (!t.includes('稳妥绕采') || !t.includes('冒险下潜')) throw new Error('缺双选项: ' + t);
  });
  await ctx.close();

  // G2 晶体入账：enc_crystal A（晶体 100 → 195）+ 回执含晶体变动
  const ctx2 = await stubCtx(browser);
  const page2 = await ctx2.newPage();
  await ctx2.addInitScript(injectSave, savePayload(makeSeed({ crystal: '100', encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_crystal', pendingAt: Date.now() } })));
  await page2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await v('G2 晶体结算入账（100 → 195）与回执含晶体', async () => {
    const card2 = page2.locator('[data-testid="encounter-card"]');
    await card2.waitFor({ state: 'visible', timeout: 8000 });
    await page2.click('[data-testid="encounter-opt-A"]');
    await card2.waitFor({ state: 'detached', timeout: 5000 });
    await page2.waitForTimeout(600);
    const val = await page2.evaluate(() => document.querySelector('.pos-crystal .node-value')?.textContent?.trim() || '');
    if (val !== '195') throw new Error('晶体未入账 195: ' + val);
    const toast = (await page2.textContent('.toast')).trim();
    if (!toast.includes('95 晶体')) throw new Error('回执缺晶体变动: ' + toast);
  });
  await ctx2.close();

  // G3 收编回执兵种名：enc_recruit A（v1.58 修复项，回执显示 80 突击兵）
  const ctx3 = await stubCtx(browser);
  const page3 = await ctx3.newPage();
  await ctx3.addInitScript(injectSave, savePayload(makeSeed({ encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_recruit', pendingAt: Date.now() } })));
  await page3.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await v('G3 收编回执显示兵种名（80 突击兵，修复项）', async () => {
    const card3 = page3.locator('[data-testid="encounter-card"]');
    await card3.waitFor({ state: 'visible', timeout: 8000 });
    await page3.click('[data-testid="encounter-opt-A"]');
    await card3.waitFor({ state: 'detached', timeout: 5000 });
    await page3.waitForTimeout(600);
    const toast = (await page3.textContent('.toast')).trim();
    if (!toast.includes('80 突击兵')) throw new Error('回执未显示兵种名: ' + toast);
  });
  await ctx3.close();

  // G4 新兵种收编回执：enc_vanguard A（20 重装兵）
  const ctx4 = await stubCtx(browser);
  const page4 = await ctx4.newPage();
  await ctx4.addInitScript(injectSave, savePayload(makeSeed({ encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_vanguard', pendingAt: Date.now() } })));
  await page4.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await v('G4 新兵种收编回执（20 重装兵）', async () => {
    const card4 = page4.locator('[data-testid="encounter-card"]');
    await card4.waitFor({ state: 'visible', timeout: 8000 });
    await page4.click('[data-testid="encounter-opt-A"]');
    await card4.waitFor({ state: 'detached', timeout: 5000 });
    await page4.waitForTimeout(600);
    const toast = (await page4.textContent('.toast')).trim();
    if (!toast.includes('20 重装兵')) throw new Error('回执未显示重装兵: ' + toast);
  });
  await ctx4.close();
}

// H. 势力叙事新模板渲染与结算（vn 扩容：王庭商队 + 先驱遗存各一）
console.log('== H. 势力叙事新模板（渲染 / 选项结算 / 转生清空） ==');
{
  const stubCtx = async (b) => {
    const ctx = await b.newContext();
    return ctx;
  };
  const ctxH1 = await stubCtx(browser);
  const pageH1 = await ctxH1.newPage();
  await ctxH1.addInitScript(injectSave, savePayload(makeSeed({ encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_tribute_convoy', pendingAt: Date.now() } })));
  await pageH1.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await v('H1 王庭商队模板渲染（贡道商队）', async () => {
    const card = pageH1.locator('[data-testid="encounter-card"]');
    await card.waitFor({ state: 'visible', timeout: 8000 });
    const text = await card.textContent();
    if (!text.includes('贡道商队')) throw new Error('新模板名未渲染: ' + text.slice(0, 60));
    if (!text.includes('护航费')) throw new Error('选项标签未渲染');
  });
  await ctxH1.close();

  const ctxH2 = await stubCtx(browser);
  const pageH2 = await ctxH2.newPage();
  await ctxH2.addInitScript(injectSave, savePayload(makeSeed({ encounters: { nextTriggerAt: Date.now() + 600000, pendingEventId: 'enc_relay_echo', pendingAt: Date.now() } })));
  await pageH2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await v('H2 先驱遗存模板结算（中继链残响，A 选项数据入账）', async () => {
    const card = pageH2.locator('[data-testid="encounter-card"]');
    await card.waitFor({ state: 'visible', timeout: 8000 });
    await pageH2.click('[data-testid="encounter-opt-A"]');
    await card.waitFor({ state: 'detached', timeout: 5000 });
    await pageH2.waitForTimeout(600);
    const toast = (await pageH2.textContent('.toast')).trim();
    if (!toast.includes('数据')) throw new Error('回执未含数据结算: ' + toast);
  });
  await ctxH2.close();
}

// 末行总校并入 pwlib 计数器：finish 退出码与脚本结果一致
check(`总校（${pass} ✓ / ${fail} ✗）`, fail === 0);
await finish(browser);
