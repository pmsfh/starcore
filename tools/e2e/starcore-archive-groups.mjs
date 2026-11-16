// 星核纪元档案馆门控分组专项回归：七门分组 v1.74 与帝庭档案分组 v1.75
// A. 锁定态：缺省档两分组标题可见、留白提示、条目零渲染不剧透
// B. 穿门前悬念：门扉回廊完成（未到银河之门）七门仍锁定
// C. 银河之门完成：七门解锁 21 条留档按七门小节渲染、计数 7/7、磨痕门压轴；
//    帝庭档案仍锁定（解锁挂银盘枢纽，与七门错开）
// D. 银盘枢纽完成：帝庭档案解锁五节 15 条渲染、计数 15/21（v1.81 炉前节与 v1.83 炉域节锁定不计入）
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

// A. 锁定态：两分组同页互验
console.log('== A. 两分组锁定态：留白提示、条目零渲染 ==');
{
  const page = await newSeededPage(browser, makeSave(), '/archive');
  const gateGroup = page.locator('[data-testid="archive-gate-group"]');
  const imperialGroup = page.locator('[data-testid="archive-imperial-group"]');
  await gateGroup.waitFor({ state: 'visible', timeout: 9000 });
  await imperialGroup.waitFor({ state: 'visible', timeout: 9000 });
  const gateText = await gateGroup.textContent();
  const imperialText = await imperialGroup.textContent();
  check('七门分组标题可见且无计数', gateText.includes('七门') && !gateText.includes('已回望'));
  check('七门留白提示可见', gateText.includes('还没有穿过应答的门扉'));
  check('七门条目零渲染不剧透', (await page.locator('[data-testid="archive-gate-card"]').count()) === 0);
  check('首门名不泄漏', !gateText.includes('轮纹门') && !gateText.includes('磨痕门'));
  check('帝庭档案分组标题可见且无计数', imperialText.includes('帝庭档案') && !imperialText.includes('已归档'));
  check('帝庭档案留白提示可见', imperialText.includes('还没走到航道的尽头'));
  check('帝庭档案条目零渲染不剧透', (await page.locator('[data-testid="archive-imperial-card"]').count()) === 0);
  check('炉音节名不泄漏', !imperialText.includes('炉音'));
  await page.context().close();
}

// B. 穿门前悬念：门扉回廊完成仍锁定（七门解锁挂银河之门）
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

// C. 银河之门完成：七门解锁（单点解锁）；帝庭档案仍锁定
console.log('== C. 七门解锁态：21 条留档七门小节、计数 7/7；帝庭档案仍锁定 ==');
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
  const imperialGroup = page.locator('[data-testid="archive-imperial-group"]');
  await imperialGroup.waitFor({ state: 'visible', timeout: 9000 });
  const imperialText = await imperialGroup.textContent();
  check('帝庭档案仍锁定（解锁挂银盘枢纽，与七门错开）', imperialText.includes('还没走到航道的尽头'));
  check('帝庭档案条目零渲染', (await page.locator('[data-testid="archive-imperial-card"]').count()) === 0);
  await page.context().close();
}

// D. 银盘枢纽完成：帝庭档案解锁（单点解锁）
console.log('== D. 帝庭档案解锁态：15 条留档五节、计数 15/21 ==');
{
  const progress = { node_galaxy_hub: doneNode('node_galaxy_hub') };
  const page = await newSeededPage(browser, makeSave({ progress }), '/archive');
  const group = page.locator('[data-testid="archive-imperial-group"]');
  await group.waitFor({ state: 'visible', timeout: 9000 });
  await page
    .locator('[data-testid="archive-imperial-card"]')
    .first()
    .waitFor({ state: 'visible', timeout: 9000 });
  const text = await group.textContent();
  check('计数 15/21', text.includes('已归档 15 / 21 条'));
  check('五节节名段头齐备', ['贡道', '核验', '仪卫', '裁决', '炉音'].every((n) => text.includes(n)));
  check('15 条卡片渲染', (await page.locator('[data-testid="archive-imperial-card"]').count()) === 15);
  check('首节首条与炉音末条可见', text.includes('当柴的航道') && text.includes('不熄的说法'));
  check('帝庭档案批注可见', text.includes('档批'));
  check('留白提示不再出现', !text.includes('还没走到航道的尽头'));
  await page.context().close();
}

await finish(browser);
