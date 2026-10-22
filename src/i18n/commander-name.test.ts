import { describe, expect, it } from 'vitest'
import { displayCommanderName, isDefaultCommanderName } from './commander-name'

describe('commander-name — 存档默认名跟随界面语言', () => {
  it('中文默认名快照在英文界面显示英文默认名', () => {
    expect(displayCommanderName('指挥官', 'Commander')).toBe('Commander')
  })

  it('英文默认名快照在中文界面显示中文默认名', () => {
    expect(displayCommanderName('Commander', '指挥官')).toBe('指挥官')
  })

  it('自定义名不参与取词，原样返回', () => {
    expect(displayCommanderName('缥缈', 'Commander')).toBe('缥缈')
    expect(displayCommanderName('Salted Pork', '指挥官')).toBe('Salted Pork')
  })

  it('默认名判定只命中已登记语言的默认值', () => {
    expect(isDefaultCommanderName('指挥官')).toBe(true)
    expect(isDefaultCommanderName('Commander')).toBe(true)
    expect(isDefaultCommanderName('')).toBe(false)
    expect(isDefaultCommanderName('指挥官员')).toBe(false)
  })
})
