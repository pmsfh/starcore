/**
 * commander-name.ts：存档玩家名的默认值判定（v1.76）
 *
 * 玩家名在开档时把当时的界面语言默认名写入存档（game.commander），
 * 其后的语言切换只影响界面取词，不会改写存档值，英文界面因此仍会
 * 显示中文默认名。显示端据此把默认名视为「未取名」，改用当前语言
 * 取词；其他值视为自定义名，原样显示。
 *
 * 默认名属语言数据，登记在 locales 与 i18n 之外会触发文案守卫的
 * 硬编码中文扫描，故与语言门面同层承载。新增语言时须同步补入该
 * 语言的默认指挥官名。
 */
const DEFAULT_COMMANDER_NAMES: readonly string[] = [
  '指挥官', // zh-CN
  'Commander', // en
]

/** 是否为任一语言的默认指挥官名（即开档时的语言快照） */
export function isDefaultCommanderName(name: string): boolean {
  return DEFAULT_COMMANDER_NAMES.includes(name)
}

/** 显示用玩家名：默认名跟随当前界面语言，自定义名原样返回 */
export function displayCommanderName(storedName: string, currentDefault: string): string {
  return isDefaultCommanderName(storedName) ? currentDefault : storedName
}
