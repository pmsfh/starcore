// 星核纪元星图分层专项回归：恒星系层 v0.59 / 星团层 v0.71 / 星臂层 v0.90 / 星系层 v0.91 / 深空层 v0.92
// A. 全新档：九层分区渲染，五个新层各 6 节点全部锁定态
// B. 旧档兼容：只完成上一层节点时，新层入口可用、双分支锁定（零迁移无缝续玩）
// C. 解锁链：星团 / 星臂 / 星系 / 深空各层 gate → 双分支 → 汇合 → 尾链逐级解锁
// D. 据点与空态按完成度分档：9/34 解锁 14、16/34 解锁 21、15/34 解锁 20、27/34 解锁 30、
//    33/34 解锁 35 且不出空态；34/34 全解锁 36、出空态且据点区块保留
// E. 自动化不误开新层：穷档加探索协议时，五层边界均无进行中探索
// F. 配套面：五层 20 项科技渲染、科技 59 卡、成就 57 卡 10 区、四项巡礼成就与智慧之巅描述
import { launch, check, finish, newSeededPage } from './starcore-pwlib.mjs';

// 节点链：基础 4 + 五个新层各 6，层内顺序即解锁顺序（末位为终章）
const BASE_4 = ['node_orbit', 'node_inner', 'node_outer', 'node_deep'];
const STELLAR_NODES = [
  'node_stellar_gate',
  'node_stellar_mine',
  'node_stellar_forge',
  'node_stellar_dead',
  'node_stellar_core',
  'node_stellar_edge',
];
const CLUSTER_NODES = [
  'node_cluster_gate',
  'node_cluster_swarm',
  'node_cluster_ruin',
  'node_cluster_heart',
  'node_cluster_hollow',
  'node_cluster_silence',
];
const ARM_NODES = [
  'node_arm_gate',
  'node_arm_cradle',
  'node_arm_grave',
  'node_arm_spine',
  'node_arm_abyss',
  'node_arm_threshold',
];
const GALAXY_NODES = [
  'node_galaxy_gate',
  'node_galaxy_range',
  'node_galaxy_archive',
  'node_galaxy_hub',
  'node_galaxy_halo',
  'node_galaxy_heart',
];
const VOID_NODES = [
  'node_void_gate',
  'node_void_beacon',
  'node_void_watch',
  'node_void_hub',
  'node_void_veil',
  'node_void_origin',
];
const OLD_10 = [...BASE_4, ...STELLAR_NODES];
const OLD_16 = [...OLD_10, ...CLUSTER_NODES];
const OLD_22 = [...OLD_16, ...ARM_NODES];
const OLD_28 = [...OLD_22, ...GALAXY_NODES];
const ALL_34 = [...OLD_28, ...VOID_NODES];

const LAYERS = [
  { name: '恒星系层', gate: 'node_stellar_gate' },
  { name: '星团层', gate: 'node_cluster_gate' },
  { name: '星臂层', gate: 'node_arm_gate' },
  { name: '星系层', gate: 'node_galaxy_gate' },
  { name: '深空层', gate: 'node_void_gate' },
];

// 五层配套科技（每层 4 项，共 20 项）
const LAYER_TECHS = [
  '恒星系测绘', '虫洞稳定理论', '舰队后勤学', '暗物质共振',
  '星团测绘', '旗舰协同', '暗物质增敏器', '先驱者存储器',
  '臂区导航', '联合舰队战术', '暗物质采集阵列', '神经网络档案馆',
  '星系测绘', '星河统帅', '暗物质星网', '银河记忆库',
  '虚空测绘', '虚空统帅', '暗幕收集网', '虚空记忆库',
];

// 各层新增据点中文名（恒星系 6 座在 9/34 即解锁，其余各层 5 座）
const STELLAR_STRONGHOLDS = [
  '掠夺者星际舰队', '晶背巨兽群', '先驱星系档案馆', '沉默者殖民舰', '掠夺者母巢', '虚空巨兽母体',
];
const CLUSTER_STRONGHOLDS = ['星团劫掠舰队', '晶云织网兽', '先驱者信标', '母巢星团舰群', '沉默者母港'];
const ARM_STRONGHOLDS = ['臂缘劫掠王庭', '摇篮噬星兽', '先驱者长堤', '王庭舰队本队', '沉默者王座'];
const GALAXY_STRONGHOLDS = ['银河帝庭', '噬星鲲群', '先驱者万神殿', '帝庭裁决舰队', '沉默者主脑'];
const VOID_STRONGHOLDS = ['虚空掠夺者旗舰', '虚空白鲸群', '先驱者归航港', '虚空裁决军团', '沉默者回响'];

function makeSave({ completedNodes = [], withAutoExplore = false, rich = true } = {}) {
  const progress = {};
  for (const id of completedNodes) {
    progress[id] = { nodeId: id, startTime: 1, endTime: 2, completed: true };
  }
  return {
    version: 1,
    savedAt: Date.now(),
    player: { id: 'test', name: '测试' },
    totalPlayTime: 0,
    resources: {
      amounts: rich
        ? { energy: '1000000000000', crystal: '1000000000', alloy: '1000000000', data: '1000000000', dark: '100000' }
        : { energy: '0', crystal: '0', alloy: '0', data: '0', dark: '0' },
      totals: rich
        ? { energy: '1000000000000', crystal: '1000000000', alloy: '1000000000', data: '1000000000', dark: '100000' }
        : { energy: '0', crystal: '0', alloy: '0', data: '0', dark: '0' },
    },
    buildings: { levels: {} },
    research: { completed: [] },
    military: { owned: {}, training: [], formations: [] },
    combat: { garrisoned: {}, completed: [] },
    exploration: { progress },
    relics: { owned: [], equipped: [null, null, null, null] },
    transcend: {
      negativeEntropy: '0',
      totalTranscends: 1,
      tree: withAutoExplore ? [{ id: 't_auto_explore', level: 1 }] : [],
    },
    achievements: {
      lifetime: { energy: '0', dark: '0', upgrades: 0, maxBuildingLevel: 0, researches: 0, explores: 0, battles: 0 },
      unlocked: {},
    },
  };
}

const browser = await launch();

// 按节点名精确匹配卡片（避免锁定提示「需先完成：X」造成的 hasText 误命中）
const nodeCard = (page, name) =>
  page.locator('.node-card', { has: page.locator(`.n-name:text-is("${name}")`) });
const isLocked = (card) => card.evaluate((el) => el.classList.contains('locked'));
const layerSection = (page, name) =>
  page.locator('.layer-section', { has: page.locator(`.layer-name:text-is("${name}")`) });

// A. 全新档：九层分区 + 五个新层全锁定
console.log('== A. 全新档：九层分区 + 五层全锁定 ==');
{
  const page = await newSeededPage(browser, makeSave({ rich: false }), '/map');
  check('九层分区渲染', (await page.locator('.layer-section').count()) === 9);
  for (const { name } of LAYERS) {
    const section = layerSection(page, name);
    check(`${name}分区渲染`, (await section.count()) === 1);
    check(`${name} 6 节点`, (await section.locator('.node-card').count()) === 6);
    check(`${name} 6 节点全部锁定态`, (await section.locator('.node-card.locked').count()) === 6);
    check(`${name}层名可见`, (await section.locator('.layer-name').textContent()) === name);
  }
  await page.context().close();
}

// B. 旧档兼容：上一层节点完成时新层入口可用、双分支锁定
console.log('== B. 旧档兼容：新层入口可用（零迁移）==');
{
  // 恒星系层：仅完成 node_deep（入口的直接前置）
  const b1 = await newSeededPage(browser, makeSave({ completedNodes: ['node_deep'] }), '/map');
  check('半人马门户节点存在', (await nodeCard(b1, '半人马门户').count()) === 1);
  check('半人马门户非锁定', !(await isLocked(nodeCard(b1, '半人马门户'))));
  check('碎晶星带可见且锁定', (await nodeCard(b1, '碎晶星带').count()) === 1 && (await isLocked(nodeCard(b1, '碎晶星带'))));
  check('熔炉星系可见且锁定', (await nodeCard(b1, '熔炉星系').count()) === 1 && (await isLocked(nodeCard(b1, '熔炉星系'))));
  await b1.context().close();
  // 恒星系层：基础 4 节点全完成的旧档形态
  const b2 = await newSeededPage(browser, makeSave({ completedNodes: BASE_4 }), '/map');
  check('基础 4 节点旧档半人马门户可用', !(await isLocked(nodeCard(b2, '半人马门户'))));
  check('死寂星系锁定（前置未满足）', (await nodeCard(b2, '死寂星系').count()) === 1 && (await isLocked(nodeCard(b2, '死寂星系'))));
  check('基础 4 节点旧档空态不出现（新层未完）', (await b2.locator('.empty-state, [class*="empty"]').count()) === 0);
  await b2.context().close();
  // 星团 / 星臂 / 星系 / 深空：分别完成前 10 / 16 / 22 / 28 节点
  const compatCases = [
    { done: OLD_10, gate: '星团之眼', branchA: '晶云星团', branchB: '红拱遗迹', deep: '沉默之巢' },
    { done: OLD_16, gate: '臂缘哨站', branchA: '摇篮星区', branchB: '纹章墓场', deep: '门扉回廊' },
    { done: OLD_22, gate: '越门浅滩', branchA: '星尘牧场', branchB: '先驱者总库', deep: '银河之心' },
    { done: OLD_28, gate: '银河彼岸', branchA: '虚空航标', branchB: '虚空望台', deep: '信号源头' },
  ];
  for (const c of compatCases) {
    const page = await newSeededPage(browser, makeSave({ completedNodes: c.done }), '/map');
    check(`${c.gate}节点存在`, (await nodeCard(page, c.gate).count()) === 1);
    check(`${c.gate}非锁定（旧档无缝续玩）`, !(await isLocked(nodeCard(page, c.gate))));
    check(`${c.branchA}可见且锁定`, (await nodeCard(page, c.branchA).count()) === 1 && (await isLocked(nodeCard(page, c.branchA))));
    check(`${c.branchB}可见且锁定`, (await nodeCard(page, c.branchB).count()) === 1 && (await isLocked(nodeCard(page, c.branchB))));
    check(`${c.deep}锁定（深层前置未满足）`, (await nodeCard(page, c.deep).count()) === 1 && (await isLocked(nodeCard(page, c.deep))));
    await page.context().close();
  }
}

// C. 解锁链：gate → 双分支并行 → 汇合点 → 尾链（星团 / 星臂 / 星系 / 深空同构）
console.log('== C. 解锁链：gate → 双分支 → 汇合 → 尾链 ==');
{
  const chains = [
    {
      layer: '星团层',
      prefix: OLD_10,
      gate: 'node_cluster_gate', branchA: 'node_cluster_swarm', branchB: 'node_cluster_ruin',
      hub: 'node_cluster_heart',
      names: { gate: '星团之眼', a: '晶云星团', b: '红拱遗迹', hub: '星团之心', mid: '虚无空洞', tail: '沉默之巢' },
    },
    {
      layer: '星臂层',
      prefix: OLD_16,
      gate: 'node_arm_gate', branchA: 'node_arm_cradle', branchB: 'node_arm_grave',
      hub: 'node_arm_spine',
      names: { gate: '臂缘哨站', a: '摇篮星区', b: '纹章墓场', hub: '臂脊航道', mid: '无声深渊', tail: '门扉回廊' },
    },
    {
      layer: '星系层',
      prefix: OLD_22,
      gate: 'node_galaxy_gate', branchA: 'node_galaxy_range', branchB: 'node_galaxy_archive',
      hub: 'node_galaxy_hub',
      names: { gate: '越门浅滩', a: '星尘牧场', b: '先驱者总库', hub: '银盘枢纽', mid: '静默银晕', tail: '银河之心' },
    },
    {
      layer: '深空层',
      prefix: OLD_28,
      gate: 'node_void_gate', branchA: 'node_void_beacon', branchB: 'node_void_watch',
      hub: 'node_void_hub',
      names: { gate: '银河彼岸', a: '虚空航标', b: '虚空望台', hub: '星幕枢纽', mid: '静默星幕', tail: '信号源头' },
    },
  ];
  for (const ch of chains) {
    const n = ch.names;
    const p1 = await newSeededPage(browser, makeSave({ completedNodes: [...ch.prefix, ch.gate] }), '/map');
    check(`${ch.layer} gate 完成后${n.a}可用`, !(await isLocked(nodeCard(p1, n.a))));
    check(`${ch.layer} gate 完成后${n.b}可用`, !(await isLocked(nodeCard(p1, n.b))));
    check(`${ch.layer} ${n.hub}锁定（需双分支）`, await isLocked(nodeCard(p1, n.hub)));
    await p1.context().close();
    const p2 = await newSeededPage(browser, makeSave({ completedNodes: [...ch.prefix, ch.gate, ch.branchA] }), '/map');
    check(`${ch.layer} 单分支完成 ${n.hub}仍锁定`, await isLocked(nodeCard(p2, n.hub)));
    await p2.context().close();
    const p3 = await newSeededPage(browser, makeSave({ completedNodes: [...ch.prefix, ch.gate, ch.branchA, ch.branchB] }), '/map');
    check(`${ch.layer} 双分支完成 ${n.hub}可用`, !(await isLocked(nodeCard(p3, n.hub))));
    check(`${ch.layer} hub 未完成时${n.mid}锁定`, await isLocked(nodeCard(p3, n.mid)));
    await p3.context().close();
    const p4 = await newSeededPage(browser, makeSave({ completedNodes: [...ch.prefix, ch.gate, ch.branchA, ch.branchB, ch.hub] }), '/map');
    check(`${ch.layer} hub 完成后${n.mid}可用`, !(await isLocked(nodeCard(p4, n.mid))));
    check(`${ch.layer} mid 未完成时${n.tail}锁定`, await isLocked(nodeCard(p4, n.tail)));
    await p4.context().close();
  }
}

// D. 据点解锁与空态口径（按完成度分档，同一档只开一页）
console.log('== D. 据点解锁与空态（按完成度分档）==');
{
  const strongholdNames = (page) => page.locator('.stronghold-section .s-name').allTextContents();
  let shCount;
  // 9/34：恒星系层完成 5 节点，edge 终章未完成
  const nine = [...BASE_4, ...STELLAR_NODES.slice(0, 5)];
  const d1 = await newSeededPage(browser, makeSave({ completedNodes: nine }), '/map');
  shCount = await d1.locator('.stronghold-card').count();
  check('9/34 银河悬臂边缘可用', !(await isLocked(nodeCard(d1, '银河悬臂边缘'))));
  check(`已解锁据点 14 个（实际 ${shCount}）`, shCount === 14);
  const names1 = await strongholdNames(d1);
  for (const zh of STELLAR_STRONGHOLDS) check(`9/34 据点 ${zh} 已解锁`, names1.includes(zh));
  check('9/34 edge 前置据点未提前解锁', !names1.includes('奇点方舟') && !names1.includes('沉默者旗舰'));
  await d1.context().close();
  // 16/34：星团层全完成，不出空态
  const d2 = await newSeededPage(browser, makeSave({ completedNodes: OLD_16 }), '/map');
  shCount = await d2.locator('.stronghold-card').count();
  check(`已解锁据点 21 个（实际 ${shCount}）`, shCount === 21);
  const names2 = await strongholdNames(d2);
  for (const zh of CLUSTER_STRONGHOLDS) check(`16/34 据点 ${zh} 已解锁`, names2.includes(zh));
  check('16/34 既有旗舰据点仍在（沉默者旗舰）', names2.includes('沉默者旗舰'));
  check('16/34 完成不出空态', (await d2.locator('.empty-state').count()) === 0);
  await d2.context().close();
  // 15/34：缺星团终章
  const d3 = await newSeededPage(browser, makeSave({ completedNodes: [...OLD_10, ...CLUSTER_NODES.slice(0, 5)] }), '/map');
  const names3 = await strongholdNames(d3);
  check('15/34 终章未完成时沉默者母港不解锁', !names3.includes('沉默者母港'));
  check(`15/34 已解锁 20 据点（实际 ${names3.length}）`, names3.length === 20);
  await d3.context().close();
  // 27/34：缺星系终章与深空层，不出空态
  const d4 = await newSeededPage(browser, makeSave({ completedNodes: [...OLD_22, ...GALAXY_NODES.slice(0, 5)] }), '/map');
  const names4 = await strongholdNames(d4);
  check('27/34 终章未完成时沉默者主脑不解锁', !names4.includes('沉默者主脑'));
  check(`27/34 已解锁 30 据点（实际 ${names4.length}）`, names4.length === 30);
  check('27/34 完成不出空态', (await d4.locator('.empty-state').count()) === 0);
  await d4.context().close();
  // 33/34：缺深空终章，不出空态
  const d5 = await newSeededPage(browser, makeSave({ completedNodes: [...OLD_28, ...VOID_NODES.slice(0, 5)] }), '/map');
  const names5 = await strongholdNames(d5);
  check('33/34 终章未完成时沉默者回响不解锁', !names5.includes('沉默者回响'));
  check(`33/34 已解锁 35 据点（实际 ${names5.length}）`, names5.length === 35);
  check('33/34 完成不出空态', (await d5.locator('.empty-state').count()) === 0);
  await d5.context().close();
  // 34/34：全解锁 + 空态出现
  const d6 = await newSeededPage(browser, makeSave({ completedNodes: ALL_34 }), '/map');
  shCount = await d6.locator('.stronghold-card').count();
  check(`已解锁据点 36 个（实际 ${shCount}）`, shCount === 36);
  const names6 = await strongholdNames(d6);
  for (const zh of [...STELLAR_STRONGHOLDS, ...CLUSTER_STRONGHOLDS, ...ARM_STRONGHOLDS, ...GALAXY_STRONGHOLDS, ...VOID_STRONGHOLDS]) {
    check(`34/34 据点 ${zh} 已解锁`, names6.includes(zh));
  }
  check('34/34 既有旗舰据点在（沉默者旗舰/母港/王座/主脑）', ['沉默者旗舰', '沉默者母港', '沉默者王座', '沉默者主脑'].every((s) => names6.includes(s)));
  check('34/34 完成出空态', (await d6.locator('.empty-state').count()) === 1);
  check('34/34 空态文案「全宇宙已探索完毕」', (await d6.textContent('.empty-state')).includes('全宇宙已探索完毕'));
  check('34/34 星图区块隐藏', (await d6.locator('.layer-section').count()) === 0);
  check('34/34 据点区块保留', (await d6.locator('.stronghold-section').count()) === 1);
  await d6.context().close();
}

// E. 自动化不误开新层：穷档加探索协议，五层边界均无进行中探索
console.log('== E. 自动化不误开（穷档 + 探索协议）==');
{
  const autoCases = [
    { done: [...BASE_4, ...STELLAR_NODES.slice(0, 5)], label: '恒星系层 9/34' },
    { done: OLD_10, label: '星团层 10/34' },
    { done: OLD_16, label: '星臂层 16/34' },
    { done: OLD_22, label: '星系层 22/34' },
    { done: OLD_28, label: '深空层 28/34' },
  ];
  for (const c of autoCases) {
    const page = await newSeededPage(browser, makeSave({ completedNodes: c.done, withAutoExplore: true, rich: false }), '/map');
    await page.waitForTimeout(1500);
    check(`${c.label} 穷档无进行中探索`, (await page.locator('.node-card.exploring').count()) === 0);
    await page.context().close();
  }
}

// G. 配套面：科技与成就
console.log('== F. 五层科技渲染 + 成就不回归 ==');
{
  const page = await newSeededPage(browser, makeSave({}), '/tech');
  for (const zh of LAYER_TECHS) {
    const card = page.locator('.tech-card', { has: page.locator(`.t-name:text-is("${zh}")`) });
    check(`科技「${zh}」渲染`, (await card.count()) === 1);
  }
  check('科技卡总数 59', (await page.locator('.tech-card').count()) === 59);
  await page.context().close();
  const page2 = await newSeededPage(browser, makeSave({}), '/achievements');
  check('成就页 57 卡', (await page2.locator('.ach-card').count()) === 57);
  check('成就分区渲染正常', (await page2.locator('.ach-section, section').count()) >= 9);
  const achText = await page2.textContent('body');
  check('星团旅者成就存在（60 次探索）', achText.includes('星团旅者') && achText.includes('60'));
  check('臂航远征成就存在（80 次探索）', achText.includes('臂航远征') && achText.includes('80'));
  check('银河巡礼成就存在（100 次探索）', achText.includes('银河巡礼') && achText.includes('100'));
  check('深空巡礼成就存在（120 次探索）', achText.includes('深空巡礼') && achText.includes('120'));
  check('智慧之巅描述 59 项研究', achText.includes('59 项研究'));
  await page2.context().close();
}

await finish(browser);
