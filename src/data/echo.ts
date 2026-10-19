/**
 * echo.ts：门后回响条目数据（门后回响·终局后日谈）
 *
 * 30 条门侧见闻，按三段分组（迎接 / 见闻 / 余韵）；档案馆回响分组
 * 在全宇宙探索完毕（当前轮）后解锁展示，转生后随本轮重新上锁
 * （判读即算，无持久化字段）。取词沿数据实体字段口径：模块加载时
 * 逐键字面量取词，UI 读字段不做动态键拼接（语言切换为整页刷新，
 * 既有先例成立）。
 */

import { t } from '@/i18n'

/** 回响条目（name = 条目名，text = 见闻正文，note = 接收侧附注） */
export interface EchoEntry {
  id: string
  name: string
  text: string
  note: string
}

/** 回响分段（含头不含尾，覆盖全部条目且不重叠） */
export interface EchoSegment {
  id: string
  name: string
  start: number
  end: number
}

/** 回响条目（有序，echo_01 至 echo_30） */
export const ECHO_ENTRIES: readonly EchoEntry[] = [
  {
    id: 'echo_01',
    name: t('content.echo.echo_01.name'),
    text: t('content.echo.echo_01.text'),
    note: t('content.echo.echo_01.note'),
  },
  {
    id: 'echo_02',
    name: t('content.echo.echo_02.name'),
    text: t('content.echo.echo_02.text'),
    note: t('content.echo.echo_02.note'),
  },
  {
    id: 'echo_03',
    name: t('content.echo.echo_03.name'),
    text: t('content.echo.echo_03.text'),
    note: t('content.echo.echo_03.note'),
  },
  {
    id: 'echo_04',
    name: t('content.echo.echo_04.name'),
    text: t('content.echo.echo_04.text'),
    note: t('content.echo.echo_04.note'),
  },
  {
    id: 'echo_05',
    name: t('content.echo.echo_05.name'),
    text: t('content.echo.echo_05.text'),
    note: t('content.echo.echo_05.note'),
  },
  {
    id: 'echo_06',
    name: t('content.echo.echo_06.name'),
    text: t('content.echo.echo_06.text'),
    note: t('content.echo.echo_06.note'),
  },
  {
    id: 'echo_07',
    name: t('content.echo.echo_07.name'),
    text: t('content.echo.echo_07.text'),
    note: t('content.echo.echo_07.note'),
  },
  {
    id: 'echo_08',
    name: t('content.echo.echo_08.name'),
    text: t('content.echo.echo_08.text'),
    note: t('content.echo.echo_08.note'),
  },
  {
    id: 'echo_09',
    name: t('content.echo.echo_09.name'),
    text: t('content.echo.echo_09.text'),
    note: t('content.echo.echo_09.note'),
  },
  {
    id: 'echo_10',
    name: t('content.echo.echo_10.name'),
    text: t('content.echo.echo_10.text'),
    note: t('content.echo.echo_10.note'),
  },
  {
    id: 'echo_11',
    name: t('content.echo.echo_11.name'),
    text: t('content.echo.echo_11.text'),
    note: t('content.echo.echo_11.note'),
  },
  {
    id: 'echo_12',
    name: t('content.echo.echo_12.name'),
    text: t('content.echo.echo_12.text'),
    note: t('content.echo.echo_12.note'),
  },
  {
    id: 'echo_13',
    name: t('content.echo.echo_13.name'),
    text: t('content.echo.echo_13.text'),
    note: t('content.echo.echo_13.note'),
  },
  {
    id: 'echo_14',
    name: t('content.echo.echo_14.name'),
    text: t('content.echo.echo_14.text'),
    note: t('content.echo.echo_14.note'),
  },
  {
    id: 'echo_15',
    name: t('content.echo.echo_15.name'),
    text: t('content.echo.echo_15.text'),
    note: t('content.echo.echo_15.note'),
  },
  {
    id: 'echo_16',
    name: t('content.echo.echo_16.name'),
    text: t('content.echo.echo_16.text'),
    note: t('content.echo.echo_16.note'),
  },
  {
    id: 'echo_17',
    name: t('content.echo.echo_17.name'),
    text: t('content.echo.echo_17.text'),
    note: t('content.echo.echo_17.note'),
  },
  {
    id: 'echo_18',
    name: t('content.echo.echo_18.name'),
    text: t('content.echo.echo_18.text'),
    note: t('content.echo.echo_18.note'),
  },
  {
    id: 'echo_19',
    name: t('content.echo.echo_19.name'),
    text: t('content.echo.echo_19.text'),
    note: t('content.echo.echo_19.note'),
  },
  {
    id: 'echo_20',
    name: t('content.echo.echo_20.name'),
    text: t('content.echo.echo_20.text'),
    note: t('content.echo.echo_20.note'),
  },
  {
    id: 'echo_21',
    name: t('content.echo.echo_21.name'),
    text: t('content.echo.echo_21.text'),
    note: t('content.echo.echo_21.note'),
  },
  {
    id: 'echo_22',
    name: t('content.echo.echo_22.name'),
    text: t('content.echo.echo_22.text'),
    note: t('content.echo.echo_22.note'),
  },
  {
    id: 'echo_23',
    name: t('content.echo.echo_23.name'),
    text: t('content.echo.echo_23.text'),
    note: t('content.echo.echo_23.note'),
  },
  {
    id: 'echo_24',
    name: t('content.echo.echo_24.name'),
    text: t('content.echo.echo_24.text'),
    note: t('content.echo.echo_24.note'),
  },
  {
    id: 'echo_25',
    name: t('content.echo.echo_25.name'),
    text: t('content.echo.echo_25.text'),
    note: t('content.echo.echo_25.note'),
  },
  {
    id: 'echo_26',
    name: t('content.echo.echo_26.name'),
    text: t('content.echo.echo_26.text'),
    note: t('content.echo.echo_26.note'),
  },
  {
    id: 'echo_27',
    name: t('content.echo.echo_27.name'),
    text: t('content.echo.echo_27.text'),
    note: t('content.echo.echo_27.note'),
  },
  {
    id: 'echo_28',
    name: t('content.echo.echo_28.name'),
    text: t('content.echo.echo_28.text'),
    note: t('content.echo.echo_28.note'),
  },
  {
    id: 'echo_29',
    name: t('content.echo.echo_29.name'),
    text: t('content.echo.echo_29.text'),
    note: t('content.echo.echo_29.note'),
  },
  {
    id: 'echo_30',
    name: t('content.echo.echo_30.name'),
    text: t('content.echo.echo_30.text'),
    note: t('content.echo.echo_30.note'),
  },
]

/** 回响分段：迎接 / 见闻 / 余韵（三段各十条，按序覆盖全部条目） */
export const ECHO_SEGMENTS: readonly EchoSegment[] = [
  { id: 'welcome', name: t('archive.echoSegmentWelcome'), start: 0, end: 10 },
  { id: 'sights', name: t('archive.echoSegmentSights'), start: 10, end: 20 },
  { id: 'afterglow', name: t('archive.echoSegmentAfterglow'), start: 20, end: 30 },
]
