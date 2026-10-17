/**
 * save/io.test.ts：读档双通道优先级测试
 *
 * 锁定「savedAt 相同时后到的 localStorage 备份入选」的行为，
 * 与《存档与数据安全规范》的读取链路口径一致。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { shouldReplaceBackup } from './io'

describe('save/io 双档优先级', () => {
  it('savedAt 相同时备份档入选', () => {
    expect(shouldReplaceBackup(1000, 1000)).toBe(true)
  })

  it('备份档更新时入选', () => {
    expect(shouldReplaceBackup(1000, 2000)).toBe(true)
  })

  it('主档更新时不被备份档覆盖', () => {
    expect(shouldReplaceBackup(2000, 1000)).toBe(false)
  })
})
