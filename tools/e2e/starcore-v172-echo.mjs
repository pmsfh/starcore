// 星核纪元 v1.72 专项回归：档案馆回响分组与终局点题
// A. 锁定态：缺省档回响分组标题可见、留白提示、条目零渲染不剧透
// B. 解锁态：34/34 全完成档 30 条见闻按三段小节渲染、计数 30/30
// C. 终局链路：33 完成 + 末节点进行中（跳变沿）播终局仪式，点题句随贺词呈现
import { launch, check, finish, newSeededPage } from './starcore-pwlib.mjs';

// 34 节点全量（顺序即数据文件声明序）
const ALL_NODES = [
  'node_orbit',
  'node_inner',
  'node_outer',
  'node_deep',
  'node_stellar_gate',
  'node_stellar_mine',
  'node_stellar_forge',
  'node_stellar_dead',
  'node_stellar_core',
  'node_stellar_edge',
  'node_cluster_gate',
  'node_cluster_swarm',
  'node_cluster_ruin',
  'node_cluster_heart',
  'node_cluster_hollow',
  'node_cluster_silence',
  'node_arm_gate',
  'node_arm_cradle',
  'node_arm_grave',
  'node_arm_spine',
  'node_arm_abyss',
  'node_arm_threshold',
  'node_galaxy_gate',
  'node_galaxy_range',
  'node_galaxy_archive',
  'node_galaxy_hub',
  'node_galaxy_halo',
  'node_galaxy_heart',
  'node_void_gate',
  'node_void_beacon',
  'node_void_watch',
  'node_void_hub',
  'node_void_veil',
  'node_void_origin',
];

function makeSave({ progress = {} } = {}) {
  return {
    version: 1,
    savedAt: Date.now(),
    player: { id: 'test', name: '测试' },
    totalPlayTime: 0,
    resources: {
      amounts: { energy: '1000000000', crystal: '1000000', alloy: '1000000', data: '1000000', dark: '1000' },
      totals: { energy: '1000000000', crystal: '1000000', alloy: '1000000', data: '1000000', dark: '1000' },
    },
    buildings: { levels: {} },
    research: { completed: [] },
    military: { owned: {}, training: [], formations: [] },
    combat: { garrisoned: {}, completed: [] },
    exploration: { progress },
    relics: { owned: [], equipped: [null, null, null, null] },
    transcend: { negativeEntropy: '0', totalTranscends: 1, tree: [] },
    achievements: {
      lifetime: { energy: '0', dark: '0', upgrades: 0, maxBuildingLevel: 0, researches: 0, explores: 0, battles: 0 },
      unlocked: {},
    },
  };
}

const browser = await launch();

// A. 锁定态
console.log('== A. 回响锁定态：留白提示、条目零渲染 ==');
{
  const page = await newSeededPage(browser, makeSave(), '/archive');
  await page.locator('[data-testid="archive-echo-group"]').waitFor({ state: 'visible', timeout: 9000 });
  const text = await page.locator('[data-testid="archive-echo-group"]').textContent();
  check('分组标题与锁定态无计数', text.includes('回响') && text.includes('门还很安静') && !text.includes('已回响'));
  check('留白提示可见', text.includes('门还很安静'));
  check('条目零渲染不剧透', (await page.locator('[data-testid="archive-echo-card"]').count()) === 0);
  check('首条名不泄漏', !text.includes('等待的终点'));
  await page.context().close();
}

// B. 解锁态（34/34 全完成：读档静默补层，不播仪式）
console.log('== B. 回响解锁态：30 条见闻三段小节 ==');
{
  const progress = {};
  for (const id of ALL_NODES) {
    progress[id] = { nodeId: id, startTime: 1, endTime: 2, completed: true };
  }
  const page = await newSeededPage(browser, makeSave({ progress }), '/archive');
  const group = page.locator('[data-testid="archive-echo-group"]');
  await group.waitFor({ state: 'visible', timeout: 9000 });
  await page
    .locator('[data-testid="archive-echo-card"]')
    .first()
    .waitFor({ state: 'visible', timeout: 9000 });
  const text = await group.textContent();
  check('计数 30/30', text.includes('已回响 30 / 30'));
  check('三段小节名齐备', text.includes('迎接') && text.includes('见闻') && text.includes('余韵'));
  check('30 条卡片渲染', (await page.locator('[data-testid="archive-echo-card"]').count()) === 30);
  check('首末条目可见', text.includes('等待的终点') && text.includes('抵达之后'));
  check('留白提示不再出现', !text.includes('门还很安静'));
  await page.context().close();
}

// C. 终局链路（33 完成 + 末节点进行中：跳变沿播终局仪式）
console.log('== C. 终局仪式：点题句随贺词呈现 ==');
{
  const progress = {};
  for (const id of ALL_NODES.slice(0, -1)) {
    progress[id] = { nodeId: id, startTime: 1, endTime: 2, completed: true };
  }
  progress['node_void_origin'] = {
    nodeId: 'node_void_origin',
    startTime: Date.now() - 1000,
    endTime: Date.now() + 2000,
    completed: false,
  };
  const page = await newSeededPage(browser, makeSave({ progress }), '/');
  const overlay = page.locator('.ceremony-overlay');
  await overlay.waitFor({ state: 'visible', timeout: 9000 });
  const text = await overlay.textContent();
  check('终局仪式含标题与贺词', text.includes('全宇宙已探索完毕') && text.includes('守门者'));
  check('点题句随贺词呈现', text.includes('门后传来第一声回响'));
  await overlay.click();
  await page.waitForTimeout(400);
  check('点击后终局仪式关闭', (await page.locator('.ceremony-overlay').count()) === 0);
  await page.context().close();
}

await finish(browser);
