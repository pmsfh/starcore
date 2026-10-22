/**
 * imperial：中文内容文案（帝庭 · 贡道核验仪卫裁决炉音观察留档）
 *
 * 简体中文为基线语言；新增文案直接在此维护，并跑缺键扫描守卫。
 * 帝庭档案分组：5 节 × 节名 1 键 + 每节 3 条观察留档 × 3 键（name / text / note），
 * name = 留档条目名；text = 贡道沿线的观察正文；note = 帝庭档案批注。
 * 五节依次为贡道、核验、仪卫、裁决、炉音；炉音节只收信仰与传闻，
 * 不写炉的实体。
 */
export default {
  // 节一 · 贡道（通往银心的进贡航路）
  'content.imperial.section_01': '贡道',

  'content.imperial.imp_01.name': '当柴的航道',
  'content.imperial.imp_01.text':
    '银河枢纽的星图上，每条通往银心的航道都标着进贡记号。王庭的领航员说，航道不是路，是柴——一船一船的贡物码过去，烧给炉火。',
  'content.imperial.imp_01.note': '档批：贡道记号核验无误，本季航标照旧。',

  'content.imperial.imp_02.name': '让路的贡道',
  'content.imperial.imp_02.text':
    '噬星鲲群随引力潮汐迁徙，所过之处贡道尽数改线。改线的申请总被很快批准——核验舰不愿和鲲群讲道理。',
  'content.imperial.imp_02.note': '档批：本季改线 17 次，皆因兽潮，免误期罚。',

  'content.imperial.imp_03.name': '空着的护卫位',
  'content.imperial.imp_03.text':
    '贡道商队的护卫舰位常常空着。船主不是雇不起护卫，是算过账：核验舰巡得勤，劫贡的买卖早就不做了。',
  'content.imperial.imp_03.note': '档批：护贡位空缺属常态，商册可查。',

  // 节二 · 核验（贡物清点与贡册留档）
  'content.imperial.section_02': '核验',

  'content.imperial.imp_04.name': '清点的灯',
  'content.imperial.imp_04.text':
    '核验舰清点贡物时会亮起一整排灯，贡目过一项，灭一盏。押贡官全程盯着灯——灯灭完，这一年的贡才算交割清楚。',
  'content.imperial.imp_04.note': '档批：核验灯序与贡册页码对应，无跳页。',

  'content.imperial.imp_05.name': '誊本的分量',
  'content.imperial.imp_05.text':
    '贡册誊录员请过往舰队留档，誊本一律誊两遍——一遍给王庭，一遍给帝庭。带密档的贡品两遍都不誊，密档另走封舱。',
  'content.imperial.imp_05.note': '档批：誊录份数核对无误，密档页码不在册。',

  'content.imperial.imp_06.name': '空箱的记性',
  'content.imperial.imp_06.text':
    '核验舰队离港后，泊位上会留下清点用的空箱阵。箱底印着上一批贡物的形状——帝庭的规矩，装过什么，箱子就记什么。',
  'content.imperial.imp_06.note': '档批：空箱回收有期，逾期按弃置论。',

  // 节三 · 仪卫（轮值与仪仗，不参战）
  'content.imperial.section_03': '仪卫',

  'content.imperial.imp_07.name': '轮值的钟点',
  'content.imperial.imp_07.text':
    '帝庭仪卫的轮值舰群按刻抵达，误差不超过一个呼吸。他们不参加巡检，只列队——仪式要的就是不迟到。',
  'content.imperial.imp_07.note': '档批：仪卫轮值表与到港记录合，无迟报。',

  'content.imperial.imp_08.name': '借来的仪仗',
  'content.imperial.imp_08.text':
    '巡检阅舰之前，帝庭会向过往舰队借重装编队充仪仗。借条的归还日期写着阅舰毕，借来的炮衣从未解开过。',
  'content.imperial.imp_08.note': '档批：仪仗借用一律记档，炮衣启封另批。',

  'content.imperial.imp_09.name': '操典的站姿',
  'content.imperial.imp_09.text':
    '仪卫操典里最长的条目是站姿：在何等风里、何等光里、站多久、眨几次眼。真打起来如何，操典没写——仪卫从没真打过。',
  'content.imperial.imp_09.note': '档批：操典条目核验讫，实战条目阙如。',

  // 节四 · 裁决（王庭纠纷的收束执行）
  'content.imperial.section_04': '裁决',

  'content.imperial.imp_10.name': '三行的裁决',
  'content.imperial.imp_10.text':
    '王庭间的贡物纠纷由帝庭裁决舰队收束执行。裁决书从不解释，只有三行：给谁、给多少、何时交。僭礼的王庭读得懂。',
  'content.imperial.imp_10.note': '档批：裁决书三行体例，百年未改。',

  'content.imperial.imp_11.name': '末席的贡单',
  'content.imperial.imp_11.text':
    '威胁名录上排末席的王庭，贡单却排得最满——迟贡的罚比贡重。名录的座次不看贡多，看僭没僭过礼。',
  'content.imperial.imp_11.note': '档批：末席王庭贡单核验讫，无短报。',

  'content.imperial.imp_12.name': '界碑的位置',
  'content.imperial.imp_12.text':
    '护贡编队的护航界线画在贡道两侧，界内的劫掠按裁决办，界外的按巡逻办。劫贡者学会的第一件事，是看界碑立在哪边。',
  'content.imperial.imp_12.note': '档批：界碑巡检按季，碑位漂移即换。',

  // 节五 · 炉音（信仰与传闻，不写炉的实体）
  'content.imperial.section_05': '炉音',

  'content.imperial.imp_13.name': '添柴的信仰',
  'content.imperial.imp_13.text':
    '掠夺者相信银心藏着永不熄灭的炉，把整条银河的航道当柴烧。火工的祷词只有一句：让火烧着。至于烧给什么，各王庭各有说法。',
  'content.imperial.imp_13.note': '档批：祷词条目存档，说法分歧不予裁定。',

  'content.imperial.imp_14.name': '听炉的人',
  'content.imperial.imp_14.text':
    '有押贡官声称核验时听见过炉音——不是声音，是贡物入箱时箱内极轻的回响。核验舰的记录里没有这一项，贡册的备注栏里总有人提起。',
  'content.imperial.imp_14.note': '档批：炉音无凭，备注栏不予采信，亦不删。',

  'content.imperial.imp_15.name': '不熄的说法',
  'content.imperial.imp_15.text':
    '「永不熄灭」四字出自王庭最早的贡册。写册的人没见过炉，只见过航道的火——一条烧了几十亿年的进贡航路，配得上这四个字。',
  'content.imperial.imp_15.note': '档批：出处可考，字面存疑，沿用。',
}
