// 星核纪元 v1.74 专项回归：档案馆七门分组（星臂尽头巨门回望）
// A. 锁定态：缺省档七门分组标题可见、留白提示、条目零渲染不剧透
// B. 穿门前悬念：门扉回廊完成（未到银河之门）仍锁定
// C. 解锁态：银河之门完成档 21 条留档按七门小节渲染、计数 7/7、磨痕门压轴
import { launch, check, finish, newSeededPage } from './starcore-pwlib.mjs';

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

/** 单节点完成进度（解锁判读只看完成态） */
function doneNode(id) {
  return { nodeId: id, startTime: 1, endTime: 2, completed: true };
}

const browser = await launch();

// A. 锁定态
console.log('== A. 七门锁定态：留白提示、条目零渲染 ==');
{
  const page = await newSeededPage(browser, makeSave(), '/archive');
  await page.locator('[data-testid="archive-gate-group"]').waitFor({ state: 'visible', timeout: 9000 });
  const text = await page.locator('[data-testid="archive-gate-group"]').textContent();
  check('分组标题可见且无计数', text.includes('七门') && !text.includes('已回望'));
  check('留白提示可见', text.includes('还没有穿过应答的门扉'));
  check('条目零渲染不剧透', (await page.locator('[data-testid="archive-gate-card"]').count()) === 0);
  check('首门名不泄漏', !text.includes('轮纹门') && !text.includes('磨痕门'));
  await page.context().close();
}

// B. 穿门前悬念：门扉回廊完成仍锁定（解锁挂银河之门）
console.log('== B. 门扉回廊完成仍锁定（保穿门前悬念） ==');
{
  const progress = { node_arm_threshold: doneNode('node_arm_threshold') };
  const page = await newSeededPage(browser, makeSave({ progress }), '/archive');
  await page.locator('[data-testid="archive-gate-group"]').waitFor({ state: 'visible', timeout: 9000 });
  const text = await page.locator('[data-testid="archive-gate-group"]').textContent();
  check('仍处锁定态', text.includes('还没有穿过应答的门扉'));
  check('条目零渲染', (await page.locator('[data-testid="archive-gate-card"]').count()) === 0);
  await page.context().close();
}

// C. 解锁态：银河之门完成（单点解锁）
console.log('== C. 七门解锁态：21 条留档七门小节、计数 7/7 ==');
{
  const progress = { node_galaxy_gate: doneNode('node_galaxy_gate') };
  const page = await newSeededPage(browser, makeSave({ progress }), '/archive');
  const group = page.locator('[data-testid="archive-gate-group"]');
  await group.waitFor({ state: 'visible', timeout: 9000 });
  await page
    .locator('[data-testid="archive-gate-card"]')
    .first()
    .waitFor({ state: 'visible', timeout: 9000 });
  const text = await group.textContent();
  check('计数 7/7', text.includes('已回望 7 / 7 门'));
  check('七门门名段头齐备', ['轮纹门', '鳞面门', '釉面门', '悬索门', '拱梁门', '钟腔门', '磨痕门'].every((n) => text.includes(n)));
  check('21 条卡片渲染', (await page.locator('[data-testid="archive-gate-card"]').count()) === 21);
  check('首门首条与应答门末条可见', text.includes('纹环记年') && text.includes('仍在工作的应答源'));
  check('中继链侧注可见', text.includes('链读数'));
  check('留白提示不再出现', !text.includes('还没有穿过应答的门扉'));
  await page.context().close();
}

await finish(browser);
