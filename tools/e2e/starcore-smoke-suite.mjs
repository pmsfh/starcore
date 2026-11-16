// 星核纪元 · 首屏 / 冒烟 / 发布校验合并件
// 由 baseline-regress、smoke、v045-release 三件合并：一次浏览器启动，统一断言收集。
// 本地模式跑三节全量；远程模式只跑「发布校验」节（与原 v045 在重跑集的行为一致）。
import { launch, PREVIEW_URL } from './starcore-pwlib.mjs';
import { readFileSync } from 'node:fs';
import fs from 'node:fs';

const OUT = '/tmp/starcore-smoke';
fs.mkdirSync(OUT, { recursive: true });

// 期望版本读自仓库 package.json，避免每次发版改脚本
const EXPECTED_VERSION = `v${JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
).version}`.replace(/\.0$/, '');

// 目标：本地预览始终可测；SC_URL 时追加远程目标；E2E_LOCAL=1 时两者同测
const TARGETS = [];
if (!process.env.SC_URL || process.env.E2E_LOCAL) TARGETS.push(['本地预览', PREVIEW_URL]);
if (process.env.SC_URL) TARGETS.push(['远程目标', process.env.SC_URL]);
// 轻量模式：仅跑「发布校验」节（等价原 v045 在核心 / 远程重跑集的行为），
// 跳过基线与全站冒烟两节本地专属重检查（含等自动存档的 16 秒）。
const LIGHT = process.env.E2E_LIGHT === '1';
const LOCAL_CHECKS = TARGETS.some(([n]) => n === '本地预览') && !LIGHT;

const results = { errors: [], checks: [], nav: {} };
const ok = (name, pass, detail = '') => {
  results.checks.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await launch();

// ===== A. 基线回归（原 starcore-baseline-regress.mjs，仅本地预览）=====
// 三档视口溢出检查 + Hero 五资源节点 + 首页顶栏隐藏 + 首屏正常 + 资源加载无 404
if (LOCAL_CHECKS) {
  for (const vp of [
    { name: 'desktop-1280', width: 1280, height: 800, mobile: false },
    { name: 'mobile-375', width: 375, height: 812, mobile: true },
    { name: 'mobile-360', width: 360, height: 800, mobile: true },
    { name: 'mobile-320', width: 320, height: 700, mobile: true },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.mobile, hasTouch: vp.mobile,
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
    await page.goto(PREVIEW_URL + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const w = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    ok(`基线·${vp.name} 无横向溢出`, w.doc <= w.win, `doc=${w.doc} win=${w.win}`);

    // Hero 五资源节点齐备 + 能量节点显名；首页顶栏资源条隐藏、他页保留
    if (vp.name === 'desktop-1280' || vp.name === 'mobile-375') {
      const hero = await page.evaluate(() => ({
        nodes: document.querySelectorAll('.hero .res-node').length,
        energyName: document.querySelector('.hero .pos-energy .node-name')?.textContent?.trim() || '',
      }));
      ok(`基线·${vp.name} Hero 五资源节点`, hero.nodes === 5 && hero.energyName === '能量', JSON.stringify(hero));
      const pillsHome = await page.evaluate(() => document.querySelectorAll('.top-bar .res-pill').length);
      ok(`基线·${vp.name} 首页顶栏资源隐藏`, pillsHome === 0, `pills=${pillsHome}`);
      await page.goto(PREVIEW_URL + '/build', { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const pillsBuild = await page.evaluate(() => document.querySelectorAll('.top-bar .res-pill').length);
      ok(`基线·${vp.name} 他页顶栏资源保留`, pillsBuild === 5, `pills=${pillsBuild}`);
      await page.goto(PREVIEW_URL + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
    }

    const bodyLen = await page.evaluate(() => document.body.innerText.length);
    ok(`基线·${vp.name} 首屏渲染`, bodyLen > 50 && errs.length === 0, errs.join(';').slice(0, 80));

    if (vp.name === 'mobile-375') await page.screenshot({ path: `${OUT}/batchA-mobile375.png` });
    await ctx.close();
  }

  // 资源加载完整性：favicon 等冗余文件删除后无 404
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const notFound = [];
    page.on('response', (r) => { if (r.status() === 404) notFound.push(r.url()); });
    await page.goto(PREVIEW_URL + '/', { waitUntil: 'networkidle' });
    for (const p of ['/build', '/tech', '/map', '/army', '/relic', '/prestige']) {
      await page.goto(PREVIEW_URL + p, { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(1000);
    ok('基线·删冗余文件后无 404', notFound.length === 0, JSON.stringify(notFound));
    await ctx.close();
  }
}

// ===== B. 全站冒烟（原 starcore-smoke.mjs，仅本地预览）=====
// 桌面+移动视口：加载→控制台错误→导航契约→路由遍历→交互→刷新持久化→截图
if (LOCAL_CHECKS) {
  for (const vp of [
    { name: 'desktop-1280', width: 1280, height: 800, mobile: false },
    { name: 'mobile-375', width: 375, height: 812, mobile: true },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      deviceScaleFactor: vp.mobile ? 2 : 1,
    });
    const page = await ctx.newPage();
    const consoleErrs = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => consoleErrs.push('PAGEERROR: ' + String(e).slice(0, 200)));

    await page.goto(PREVIEW_URL + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500); // 跑 2+ 个 tick

    const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300));
    ok(`冒烟·${vp.name} 首屏渲染`, body.length > 50, body.slice(0, 80));

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    ok(`冒烟·${vp.name} 无横向溢出`, !overflow);

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok(`冒烟·${vp.name} 深色背景`, bg === 'rgb(5, 7, 13)', bg);

    // 导航数量（桌面 9 项侧导航 / 移动 5 主 + 4 次底部导航）
    const navCount = await page.evaluate(() => {
      const sideEl = document.querySelector('.side-nav');
      const bottomEl = document.querySelector('.bottom-nav');
      const side = sideEl ? sideEl.querySelectorAll('a, [class*="item"], button').length : 0;
      const bottom = bottomEl ? bottomEl.querySelectorAll('.tab').length : 0;
      const sideVisible = sideEl ? getComputedStyle(sideEl).display !== 'none' : false;
      const bottomVisible = bottomEl ? getComputedStyle(bottomEl).display !== 'none' : false;
      return { side, bottom, sideVisible, bottomVisible };
    });
    results.nav[vp.name] = navCount;
    if (vp.mobile) {
      ok(`冒烟·${vp.name} 移动端单导航（侧栏隐藏）`, !navCount.sideVisible && navCount.bottomVisible, JSON.stringify(navCount));
    } else {
      ok(`冒烟·${vp.name} 桌面端侧导航显示`, navCount.sideVisible && !navCount.bottomVisible, JSON.stringify(navCount));
    }

    for (const p of ['/build', '/tech', '/map', '/army', '/relic', '/prestige', '/achievements', '/archive', '/settings']) {
      await page.goto(PREVIEW_URL + p, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      const t = await page.evaluate(() => document.body.innerText.length);
      const errs = consoleErrs.length;
      if (t < 30) ok(`冒烟·${vp.name} 路由 ${p}`, false, '内容过短');
      if (errs > 0) ok(`冒烟·${vp.name} 路由 ${p} 控制台`, false, consoleErrs[errs - 1]);
    }
    ok(`冒烟·${vp.name} 路由遍历无错误`, consoleErrs.length === 0, `${consoleErrs.length} 个控制台错误`);

    await page.goto(PREVIEW_URL + '/nonexistent-path', { waitUntil: 'networkidle' });
    const fallback = await page.evaluate(() => document.body.innerText.length);
    ok(`冒烟·${vp.name} SPA fallback`, fallback > 30, `内容长度 ${fallback}`);

    await page.screenshot({ path: `${OUT}/${vp.name}-home.png`, fullPage: false });
    results.errors.push(...consoleErrs.map((e) => `[${vp.name}] ${e}`));
    await ctx.close();
  }

  // 交互与持久化（桌面视口）
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs2 = [];
  page.on('pageerror', (e) => errs2.push(String(e).slice(0, 150)));
  await page.goto(PREVIEW_URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.goto(PREVIEW_URL + '/build', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const buyBtn = page.locator('button:has-text("建造"), button:has-text("升级"), button:has-text("购买")').first();
  const canBuy = await buyBtn.count() > 0 && await buyBtn.isEnabled().catch(() => false);
  if (canBuy) {
    await buyBtn.click();
    await page.waitForTimeout(1500);
    ok('冒烟·交互 建筑升级点击', true);
  } else {
    ok('冒烟·交互 建筑升级点击', false, '无可点击购买按钮');
  }

  // tick 循环运转：主循环存活 + 数值健康（能量 ≥ 2e4，新档首 tick 自动首签已发放）
  await page.goto(PREVIEW_URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const loopOk = await page.evaluate(() => {
    const el = document.querySelector('.pos-energy .node-value');
    const energyText = el ? el.textContent.trim() : '';
    const mult = energyText.includes('K') ? 1000 : energyText.includes('M') ? 1e6 : 1;
    const v = parseFloat(energyText.replace(/,/g, '')) * mult;
    return { energyText, v };
  });
  ok('冒烟·tick 循环运转（首签发放 + 数值健康）', loopOk.v >= 20000, `能量=${loopOk.energyText}`);

  await page.waitForTimeout(16000); // 等一次自动存档（15s 间隔）
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const saved = await page.evaluate(() => ({ backup: !!localStorage.getItem('starcore_save_v1_backup') }));
  ok('冒烟·自动存档写入', saved.backup, JSON.stringify(saved));

  const offlineModal = await page.evaluate(() => !!document.querySelector('.modal-overlay, [class*="offline"]'));
  ok('冒烟·短时离开无误弹离线报告', !offlineModal, offlineModal ? '检测到弹窗（真缺陷：短时离线误弹）' : '无弹窗');

  await page.screenshot({ path: `${OUT}/desktop-after-interact.png` });
  ok('冒烟·交互过程无页面错误', errs2.length === 0, errs2.join('; ').slice(0, 150));
  await ctx.close();
}

// ===== C. 发布校验（原 starcore-v045-release.mjs，本地 + 远程）=====
// 首屏渲染 / 版本号断言 / 十一路由无错误 / 移动端无横向溢出 / 控制台无 error
const ROUTES = ['/', '/build', '/tech', '/map', '/army', '/battle/raider_1', '/relic', '/prestige', '/achievements', '/archive', '/settings'];
for (const [name, base] of TARGETS) {
  console.log(`\n===== 发布校验 · ${name}: ${base} =====`);
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [], consoleErrors = [];
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${m.text()} [loc=${m.location().url}]`); });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const version = await page.evaluate(() => document.body.innerText.match(/v\d+\.\d+(?:\.\d+)?/)?.[0] || '(无版本串)');
    console.log(`  版本号: ${version}（期望 ${EXPECTED_VERSION}）`);
    ok(`发布·${name} 版本号一致`, version === EXPECTED_VERSION, `实际 ${version}`);
    console.log(`  首屏: ${await page.title()}`);
    for (const r of ROUTES) {
      await page.goto(base + r, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
    }
    console.log(`  十一路由遍历: 完成（HTTP≥400: ${errors.length ? JSON.stringify(errors) : '无'}；console error: ${consoleErrors.length ? JSON.stringify(consoleErrors) : '无'}）`);
    ok(`发布·${name} 十一路由无 HTTP/控制台错误`, errors.length === 0 && consoleErrors.length === 0);
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const ov = await page.evaluate(() => ({
      scrollX: window.scrollX,
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
    }));
    const pass = ov.scrollX === 0 && ov.docW <= ov.winW;
    console.log(`  移动375 溢出: scrollX=${ov.scrollX} doc=${ov.docW} win=${ov.winW} → ${pass ? 'OK' : 'FAIL'}`);
    ok(`发布·${name} 移动375 无溢出`, pass, `doc=${ov.docW} win=${ov.winW}`);
    await ctx.close();
  }
}

await browser.close();

console.log('\n===== 汇总 =====');
const fails = results.checks.filter((c) => !c.pass);
console.log(`检查 ${results.checks.length} 项，失败 ${fails.length} 项`);
fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(results, null, 2));
process.exit(fails.length ? 1 : 0);
