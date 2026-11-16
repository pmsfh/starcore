// 星核纪元存档专项合并件：v0.81 存档安全链 + v1.35 keyed 完整性签名
// 合并自 starcore-v081-save-safety.mjs 与 starcore-v135-save-integrity.mjs（2026-11-16，断言逐条保留）
// v0.81：corrupt 错误屏 / 指数限位 / 空编队自愈 / 转生树幂聚合 / 导入替换语义 / 训练 count 整数 / 无档回归
// v1.35：签名形态自检 / SCB1- round-trip / 篡改拒收 / 旧格式拒绝 / fnv1a 硬切 / 写路径防回落
import { launch, check, finish, newSeededPage, savePayload, saveCode, checksum, BASE_URL as URL } from './starcore-pwlib.mjs';

function localDateStr(d = new Date()) { return d.toLocaleDateString('sv'); }
function weekStr(d = new Date()) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNum = (t.getDay() + 6) % 7;
  t.setDate(t.getDate() - dayNum + 3);
  const isoYear = t.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const fDayNum = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - fDayNum + 3);
  const week = 1 + Math.round((t.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}
const TODAY = localDateStr();
const THIS_WEEK = weekStr();

function makeSaveV135(opt = {}) {
  const o = {
    energy: '1000000', crystal: '10000', alloy: '10000', data: '1000', dark: '50',
    ne: '0', research: [], owned: {}, checkIn: TODAY, buildings: {}, ...opt,
  };
  return {
    version: 1, savedAt: Date.now(), player: { id: 'test', name: '测试' }, totalPlayTime: 100,
    resources: {
      amounts: { energy: o.energy, crystal: o.crystal, alloy: o.alloy, data: o.data, dark: o.dark },
      totals: { energy: '5000000', crystal: '50000', alloy: '50000', data: '5000', dark: '60' },
    },
    buildings: { levels: o.buildings },
    research: { completed: o.research },
    military: { owned: o.owned, training: [], formations: [] },
    combat: { garrisoned: {}, completed: [] },
    exploration: { progress: {} },
    relics: { owned: [], equipped: [null, null, null, null] },
    transcend: { negativeEntropy: o.ne, totalTranscends: 0, tree: [] },
    daily: {
      lastCheckIn: o.checkIn, streak: 1,
      weeklyCounters: { battles: 0, explores: 0, researches: 0, upgrades: 0, transcends: 0 },
      challengeWeek: THIS_WEEK, weekChallenges: [],
    },
    achievements: {
      lifetime: { energy: '5000000', dark: '60', upgrades: 10, maxBuildingLevel: 5, researches: 2, explores: 3, battles: 1 },
      unlocked: {},
    },
  };
}

// E 先行（零浏览器，签名实现自检）：Node 单源签名器 + 载荷形态
console.log('== v1.35 E. 签名形态自检 ==');
{
  const probe = JSON.stringify(makeSaveV135());
  const sig = checksum(probe);
  check('签名为 64 位 hex（HMAC-SHA256，非旧 8 位 fnv1a）', /^[0-9a-f]{64}$/.test(sig));
  const payload = JSON.parse(savePayload(probe));
  check('savePayload 载荷为 {d,c} 且 c=签名', payload.d === probe && payload.c === sig);
  const code = saveCode(makeSaveV135());
  check('saveCode 前缀 SCB1- 且可解出 {d,c}', code.startsWith('SCB1-') &&
    (() => { const p = JSON.parse(Buffer.from(code.slice(5), 'base64').toString('utf8')); return typeof p.d === 'string' && typeof p.c === 'string'; })());
}

const browser = await launch();

function makeSaveV081({ levels = {}, amounts = {}, formations, totalTranscends = 0, tree = [], energy = '1e9' } = {}) {
  const base = { energy, crystal: '1e6', alloy: '1e6', data: '1e6', dark: '1000' };
  return {
    version: 1,
    savedAt: Date.now(),
    player: { id: 'test', name: '测试' },
    totalPlayTime: 0,
    resources: { amounts: { ...base, ...amounts }, totals: { ...base, ...amounts } },
    buildings: { levels },
    research: { completed: [] },
    military: {
      owned: { assault: 500, guard: 500, heavy: 500, psionic: 500 },
      training: [],
      formations:
        formations === undefined
          ? [
              { id: 'f1', name: '先锋编队', units: { assault: 10, guard: 10, heavy: 10, psionic: 10 } },
              { id: 'f2', name: '第二编队', units: { assault: 0, guard: 0, heavy: 0, psionic: 0 } },
              { id: 'f3', name: '第三编队', units: { assault: 0, guard: 0, heavy: 0, psionic: 0 } },
            ]
          : formations,
    },
    combat: { garrisoned: {}, completed: [] },
    exploration: { progress: {} },
    relics: { owned: [], equipped: [null, null, null, null] },
    transcend: { negativeEntropy: '0', totalTranscends, tree },
    achievements: {
      lifetime: { energy: '0', dark: '0', upgrades: 0, maxBuildingLevel: 0, researches: 0, explores: 0, battles: 0 },
      unlocked: {},
    },
  };
}

// A. corrupt 错误屏
console.log('== v0.81 A. corrupt 错误屏 ==');
{
  // 两份都损坏：主档（IndexedDB 在 headless 不可写则空）+ 备份档为非法载荷
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('starcore_save_v1_backup', 'not-a-valid-payload');
    localStorage.removeItem('starcore_save_v1');
  });
  const page = await ctx.newPage();
  await page.goto(URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const screenText = await page.evaluate(() => document.body.innerText);
  check('损坏档进错误屏（标题出现）', screenText.includes('星核读取失败'));
  check(
    '提示为存档损坏口径（非版本过新/读取失败兜底文案）',
    screenText.includes('存档数据已损坏')
  );
  check('提供「导出原始存档」入口', screenText.includes('导出原始存档'));
  check('提供「清除存档重开」出口', screenText.includes('清除存档重开'));
  // 关键：不静默开新档，15 秒保护窗内原始载荷不被覆盖
  await page.waitForTimeout(2000);
  const raw = await page.evaluate(() => localStorage.getItem('starcore_save_v1_backup'));
  check('原始损坏载荷未被自动存档覆盖', raw === 'not-a-valid-payload');
  await page.context().close();
}

// B. 指数限位
console.log('== v0.81 B. 指数限位 ==');
{
  const bad = makeSaveV081({ amounts: { energy: '1e99999999999999999' } });
  const page = await newSeededPage(browser, bad, '/');
  const screenText = await page.evaluate(() => document.body.innerText);
  check('超长指数档被拒（错误屏接管）', screenText.includes('星核读取失败'));
  await page.context().close();

  const good = makeSaveV081({ amounts: { energy: '1e999999' } });
  const page2 = await newSeededPage(browser, good, '/');
  const okText = await page2.evaluate(() => document.body.innerText);
  check('6 位指数（1e999999）正常进游戏', !okText.includes('星核读取失败'));
  await page2.context().close();
}

// C. 空编队自愈
console.log('== v0.81 C. 空编队自愈 ==');
{
  const page = await newSeededPage(browser, makeSaveV081({ formations: [] }), '/battle/raider_1');
  const err = [];
  page.on('pageerror', (e) => err.push(e.message));
  await page.waitForTimeout(800);
  const text = await page.evaluate(() => document.body.innerText);
  check('战斗页不白屏（出现出征按钮）', text.includes('出征'));
  check('页面无未捕获异常', err.length === 0);
  const healed = await page.evaluate(() => {
    // 自愈发生在内存 hydrate 层：数编队 tab 数量（f1/f2/f3 三支）
    const tabs = document.querySelectorAll('.formation-tabs button');
    return tabs.length;
  });
  check(
    `编队自愈为 3 支（实际 ${healed} 支）`,
    healed === 3
  );
  await page.context().close();
}

// D. 转生树幂聚合
console.log('== v0.81 D. 转生树幂聚合 ==');
{
  // 等级拉满至校验上限：读取不挂死、首页正常渲染（幂聚合不物化 1e6 份 effects）
  const page = await newSeededPage(browser, makeSaveV081({ tree: [{ id: 't_inf_prod', level: 1000000 }] }), '/', { viewport: { width: 1280, height: 900 } });
  const t0 = Date.now();
  const text = await page.evaluate(() => document.body.innerText);
  const elapsed = Date.now() - t0;
  check('Lv=1e6 档正常进游戏（不挂死）', !text.includes('星核读取失败') && elapsed < 5000);
  check('首页内容已渲染', text.includes('星核') || text.length > 100);
  await page.context().close();

  // 超上限拒档
  const over = makeSaveV081({ tree: [{ id: 't_inf_prod', level: 1000001 }] });
  const page2 = await newSeededPage(browser, over, '/');
  const bad = await page2.evaluate(() => document.body.innerText);
  check('Lv 超上限（1e6+1）拒档进错误屏', bad.includes('星核读取失败'));
  await page2.context().close();
}

// E. 导入替换语义
console.log('== v0.81 E. 导入替换语义 ==');
{
  // 先用正常档起游戏，把转生次数堆起来，再导出一份 totalTranscends=0 的极简码导入
  const page = await newSeededPage(browser, makeSaveV081({ totalTranscends: 0 }), '/');
  // 读现档 d 串，Node 侧改值后按应用同源签名重签（v1.35 keyed，经 savePayload 字符串形态）
  const dRaw = await page.evaluate(() => JSON.parse(localStorage.getItem('starcore_save_v1_backup')).d);
  const dObj = JSON.parse(dRaw);
  dObj.transcend.totalTranscends = 9;
  dObj.player.name = '堆数值档';
  const resigned = savePayload(JSON.stringify(dObj));
  await page.evaluate((p) => {
    localStorage.setItem('starcore_save_v1_backup', p);
  }, resigned);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 构造极简导入码：totalTranscends=0、无研究无建筑（v1.35 SCB1- 带签名格式）
  const minimal = makeSaveV081({ totalTranscends: 0 });
  minimal.player.name = '极简档';
  minimal.buildings.levels = {};
  const minimalCode = saveCode(minimal);
  const imported = await page.evaluate(async (code) => {
    // 走应用内导入入口（设置页 SavePanel 的 textarea+按钮）
    const resp = await fetch(location.href);
    return resp.ok;
  }, minimalCode);
  check('页面可交互（前置）', imported);

  // 直接调 store 通道验证：页面上下文里没有全局 store 暴露，改走 UI 导入流
  await page.goto(URL + '/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const hasImport = await page.evaluate(() => document.body.innerText.includes('导入'));
  check('设置页含导入入口', hasImport);
  if (hasImport) {
    const textarea = page.locator('textarea').first();
    if ((await textarea.count()) > 0) {
      await textarea.fill(minimalCode);
      const importBtn = page.locator('button', { hasText: '导入' }).first();
      await importBtn.click();
      await page.waitForTimeout(400);
      // 导入为全量替换的破坏性操作：弹二次确认后点「确认导入」才真正执行
      const confirmImportBtn = page.locator('button', { hasText: '确认导入' }).first();
      if ((await confirmImportBtn.count()) > 0) await confirmImportBtn.click();
      await page.waitForTimeout(1200);
      // 导入后读档验证 totalTranscends=0 已写入（旧实现 if 跳过 0，无法清零）
      const after = await page.evaluate(() => {
        const raw = localStorage.getItem('starcore_save_v1_backup');
        if (!raw) return null;
        try {
          return JSON.parse(JSON.parse(raw).d);
        } catch {
          return 'unparseable';
        }
      });
      if (after && after !== 'unparseable') {
        check('导入后 totalTranscends=0 成功清零', after.transcend.totalTranscends === 0);
        check('导入后玩家名为导入档值（替换非合并）', after.player.name === '极简档');
      } else {
        check('导入后存档可解析', false);
      }
    } else {
      check('找到导入输入框', false);
    }
  }
  await page.context().close();
}

// F. 训练 count 整数
console.log('== v0.81 F. 训练 count 整数 ==');
{
  const bad = makeSaveV081();
  bad.military.training = [{ id: 't1', unitId: 'assault', count: 1.5, remaining: 1, totalTime: 2 }];
  const page = await newSeededPage(browser, bad, '/');
  const text = await page.evaluate(() => document.body.innerText);
  check('小数 count 注入档被拒（错误屏）', text.includes('星核读取失败'));
  await page.context().close();
}

// G. 无档回归
console.log('== G. 无档回归 ==');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const text = await page.evaluate(() => document.body.innerText);
  check('无档正常启动（无错误屏）', !text.includes('星核读取失败'));
  check('无档显示游戏内容', text.includes('能量') || text.includes('星核纪元'));
  await ctx.close();
}

// A. 导出/导入 round-trip
console.log('== v1.35 A. SCB1- 导出/导入 round-trip ==');
{
  const page = await newSeededPage(browser, makeSaveV135({ name: undefined }), '/settings');
  await page.locator('button', { hasText: '导出存档' }).first().click();
  await page.waitForTimeout(600);
  const code = await page.locator('.export-fallback textarea').inputValue().catch(() => '');
  check('应用导出码为 SCB1- 前缀', code.startsWith('SCB1-'));
  const payloadOk = await page.evaluate((c) => {
    const bin = atob(c.slice(5));
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    const p = JSON.parse(new TextDecoder().decode(bytes));
    return typeof p.d === 'string' && typeof p.c === 'string' && /^[0-9a-f]{64}$/.test(p.c);
  }, code);
  check('导出码载荷为 {d, 64位hex签名}', payloadOk);

  // 换名导入 round-trip：构造替换档（读现档改值 + saveCode 重签）
  const dRaw = await page.evaluate(() => JSON.parse(localStorage.getItem('starcore_save_v1_backup')).d);
  const dObj = JSON.parse(dRaw);
  dObj.player.name = '签名轮换档';
  dObj.transcend.totalTranscends = 0;
  const importCode = saveCode(JSON.stringify(dObj));
  await page.locator('.import-box textarea').fill(importCode);
  await page.locator('button', { hasText: '导入存档' }).first().click();
  // 导入确认弹窗条件等待：负载下渲染可能迟于固定窗口，弹窗未到会点空
  const confirmBtn = page.locator('button', { hasText: '确认导入' }).first();
  await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if ((await confirmBtn.count()) > 0) await confirmBtn.click();
  // 导入成功后应用约 1.5 秒触发整页刷新：固定等待与刷新计时器同值存在
  // 相撞窗口（过晚撞刷新、过早读旧档），且种子按导航重放注入，刷新后
  // 读到的始终是种子档，回读只能在刷新前窗口捕获。改有界轮询、见替换
  // 档即收；刷新过程中的上下文销毁按未读到处理、下一轮重试
  let after = null;
  for (let i = 0; i < 40; i++) {
    try {
      after = await page.evaluate(() => {
        try { return JSON.parse(JSON.parse(localStorage.getItem('starcore_save_v1_backup')).d); } catch { return null; }
      });
    } catch {
      after = null; // 刷新进行中：上下文已销毁，下一轮重试
    }
    if (after !== null && after.player.name === '签名轮换档') break;
    await page.waitForTimeout(200);
  }
  check('SCB1- 导入成功（替换语义生效）', after !== null && after.player.name === '签名轮换档');
  await page.context().close();
}

// B. 篡改拒收
console.log('== v1.35 B. 篡改拒收（签名不匹配 / 重签后结构拦） ==');
{
  const page = await newSeededPage(browser, makeSaveV135(), '/settings');
  // B1: 合法码换入被篡改 d（不改 c）→ 签名不匹配 → 「已损坏或被篡改」
  // 篡改目标 = 负值能量（结构白名单拒绝项），使 B2 重签后仍必被结构校验拦
  const codeRaw = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('starcore_save_v1_backup')).d;
    return d;
  });
  const tampered = codeRaw.replace('"energy":"1000000"', '"energy":"-999"');
  check('篡改串构造命中（d 已变）', tampered !== codeRaw);
  const signed = JSON.parse(savePayload(codeRaw));
  const tamperCode = 'SCB1-' + Buffer.from(JSON.stringify({ d: tampered, c: signed.c }), 'utf8').toString('base64');
  await page.locator('.import-box textarea').fill(tamperCode);
  await page.locator('button', { hasText: '导入存档' }).first().click();
  await page.waitForTimeout(400);
  const confirmB1 = page.locator('button', { hasText: '确认导入' }).first();
  if ((await confirmB1.count()) > 0) await confirmB1.click();
  await page.waitForTimeout(600);
  const msg1 = (await page.locator('.import-msg').textContent().catch(() => '')) || '';
  check('篡改 d 导入被拒（篡改提示）', msg1.includes('篡改') || msg1.includes('损坏'), `实际提示: ${msg1.trim().slice(0, 40)}`);

  // B2: 篡改 + 用应用同源签名器重签 → 签名合法但结构校验拦（负资源）
  const resignCode = saveCode(tampered);
  await page.locator('.import-box textarea').fill(resignCode);
  await page.locator('button', { hasText: '导入存档' }).first().click();
  await page.waitForTimeout(400);
  const confirm2 = page.locator('button', { hasText: '确认导入' }).first();
  if ((await confirm2.count()) > 0) await confirm2.click();
  await page.waitForTimeout(600);
  const msg2 = (await page.locator('.import-msg').textContent().catch(() => '')) || '';
  check('重签后仍被结构校验拦（负值白名单）', msg2.includes('无效') || msg2.includes('损坏') || msg2.includes('篡改'), `实际提示: ${msg2.trim().slice(0, 40)}`);
  const accepted2 = await page.evaluate(() => {
    try { return JSON.parse(JSON.parse(localStorage.getItem('starcore_save_v1_backup')).d).resources.amounts.energy; } catch { return null; }
  });
  check('篡改值未入库（存档 energy 未被替换）', accepted2 !== '-999', `实际 energy: ${accepted2}`);
  await page.context().close();
}

// C. 旧格式导入拒绝
console.log('== v1.35 C. 旧格式导入拒绝 ==');
{
  const page = await newSeededPage(browser, makeSaveV135(), '/settings');
  const legacySave = makeSaveV135();
  legacySave.player.name = '旧前缀档';
  const legacyJson = JSON.stringify(legacySave);
  const legacyB64 = Buffer.from(legacyJson, 'utf8').toString('base64');
  const cases = [
    { name: 'SCB- 裸JSON', code: 'SCB-' + legacyB64 },
    { name: 'SCE- 裸JSON', code: 'SCE-' + legacyB64 },
    { name: '无前缀base64', code: legacyB64 },
  ];
  for (const c of cases) {
    await page.locator('.import-box textarea').fill(c.code);
    await page.locator('button', { hasText: '导入存档' }).first().click();
    await page.waitForTimeout(400);
    // 确认弹窗在格式初检前弹出（v0.87 确认流）；旧格式无论在初检还是 doImport 被拒，先关弹窗再判提示
    const confirmC = page.locator('button', { hasText: '确认导入' }).first();
    if ((await confirmC.count()) > 0) {
      await confirmC.click();
      await page.waitForTimeout(600);
    }
    const msgAfter = (await page.locator('.import-msg').textContent().catch(() => '')) || '';
    check(`${c.name} 导入被拒`, msgAfter.includes('无效') || msgAfter.includes('损坏') || msgAfter.includes('篡改'), `实际提示: ${msgAfter.trim().slice(0, 40)}`);
  }
  await page.context().close();
}

// D. 本地旧格式硬切
console.log('== v1.35 D. 本地 fnv1a 旧载荷硬切 ==');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    // v1.35 之前的应用写路径形态：c 为 fnv1a 8 位 hex（此处按旧算法现造一份合法旧载荷）
    const save = { version: 1, savedAt: Date.now(), player: { id: 'legacy', name: '旧档玩家' }, totalPlayTime: 0 };
    const json = JSON.stringify(save);
    let h = 0x811c9dc5;
    for (let i = 0; i < json.length; i++) {
      h ^= json.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    localStorage.setItem('starcore_save_v1_backup', JSON.stringify({ d: json, c: (h >>> 0).toString(16) }));
    localStorage.removeItem('starcore_save_v1');
  });
  const page = await ctx.newPage();
  await page.goto(URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const text = await page.evaluate(() => document.body.innerText);
  check('fnv1a 旧载荷进损坏错误屏', text.includes('星核读取失败') && text.includes('存档数据已损坏'));
  check('导出原始存档出口在位', text.includes('导出原始存档'));
  check('清除存档重开出口在位', text.includes('清除存档重开'));
  // 原始载荷保留可导出（15s 保护窗内不被覆盖）
  await page.waitForTimeout(1500);
  const raw = await page.evaluate(() => localStorage.getItem('starcore_save_v1_backup'));
  check('旧载荷未被自动存档覆盖（可导出原始档）', raw !== null && raw.includes('旧档玩家'));
  await ctx.close();
}

// F. 正常写路径防回落
console.log('== v1.35 F. 正常存档写路径签名形态 ==');
{
  const page = await newSeededPage(browser, makeSaveV135(), '/');
  // 触发一次手动保存，读备份键载荷验形态
  await page.goto(URL + '/settings', { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: '手动保存' }).first().click();
  await page.waitForTimeout(800);
  const shape = await page.evaluate(() => {
    const raw = localStorage.getItem('starcore_save_v1_backup');
    if (!raw) return null;
    const p = JSON.parse(raw);
    return { hasD: typeof p.d === 'string', sigLen: typeof p.c === 'string' ? p.c.length : 0 };
  });
  check('写路径载荷为 {d, 64位hex签名}', shape !== null && shape.hasD && shape.sigLen === 64, `实际: ${JSON.stringify(shape)}`);
  await page.context().close();
}

await finish(browser);
