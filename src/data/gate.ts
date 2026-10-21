/**
 * gate.ts：七门观察留档数据（七门 · 星臂尽头巨门回望）
 *
 * 7 扇巨门，每门 1 条门名 + 3 条观察留档（name / text / note，
 * note = 中继链侧注）；前六门为静默门，第七门磨痕门为仍在应答的门
 * （玩家穿越的一扇）。档案馆七门分组在完成银河之门探索节点后解锁
 * 展示，转生后随本轮重新上锁（判读即算，无持久化字段）。取词沿
 * 数据实体字段口径：模块加载时逐键字面量取词，UI 读字段不做动态
 * 键拼接（语言切换为整页刷新，既有先例成立）。
 */

import { t } from '@/i18n'

/** 七门留档条目（name = 条目名，text = 观察正文，note = 中继链侧注） */
export interface GateEntry {
  id: string
  name: string
  text: string
  note: string
}

/** 七门之门（门名做段头，每门恰含三条留档） */
export interface GateDoor {
  id: string
  name: string
  entries: readonly GateEntry[]
}

/** 七门（有序：静默门六扇在前，应答的磨痕门压轴） */
export const GATE_DOORS: readonly GateDoor[] = [
  {
    id: 'door_01',
    name: t('content.gate.door_01'),
    entries: [
      {
        id: 'gate_01',
        name: t('content.gate.gate_01.name'),
        text: t('content.gate.gate_01.text'),
        note: t('content.gate.gate_01.note'),
      },
      {
        id: 'gate_02',
        name: t('content.gate.gate_02.name'),
        text: t('content.gate.gate_02.text'),
        note: t('content.gate.gate_02.note'),
      },
      {
        id: 'gate_03',
        name: t('content.gate.gate_03.name'),
        text: t('content.gate.gate_03.text'),
        note: t('content.gate.gate_03.note'),
      },
    ],
  },
  {
    id: 'door_02',
    name: t('content.gate.door_02'),
    entries: [
      {
        id: 'gate_04',
        name: t('content.gate.gate_04.name'),
        text: t('content.gate.gate_04.text'),
        note: t('content.gate.gate_04.note'),
      },
      {
        id: 'gate_05',
        name: t('content.gate.gate_05.name'),
        text: t('content.gate.gate_05.text'),
        note: t('content.gate.gate_05.note'),
      },
      {
        id: 'gate_06',
        name: t('content.gate.gate_06.name'),
        text: t('content.gate.gate_06.text'),
        note: t('content.gate.gate_06.note'),
      },
    ],
  },
  {
    id: 'door_03',
    name: t('content.gate.door_03'),
    entries: [
      {
        id: 'gate_07',
        name: t('content.gate.gate_07.name'),
        text: t('content.gate.gate_07.text'),
        note: t('content.gate.gate_07.note'),
      },
      {
        id: 'gate_08',
        name: t('content.gate.gate_08.name'),
        text: t('content.gate.gate_08.text'),
        note: t('content.gate.gate_08.note'),
      },
      {
        id: 'gate_09',
        name: t('content.gate.gate_09.name'),
        text: t('content.gate.gate_09.text'),
        note: t('content.gate.gate_09.note'),
      },
    ],
  },
  {
    id: 'door_04',
    name: t('content.gate.door_04'),
    entries: [
      {
        id: 'gate_10',
        name: t('content.gate.gate_10.name'),
        text: t('content.gate.gate_10.text'),
        note: t('content.gate.gate_10.note'),
      },
      {
        id: 'gate_11',
        name: t('content.gate.gate_11.name'),
        text: t('content.gate.gate_11.text'),
        note: t('content.gate.gate_11.note'),
      },
      {
        id: 'gate_12',
        name: t('content.gate.gate_12.name'),
        text: t('content.gate.gate_12.text'),
        note: t('content.gate.gate_12.note'),
      },
    ],
  },
  {
    id: 'door_05',
    name: t('content.gate.door_05'),
    entries: [
      {
        id: 'gate_13',
        name: t('content.gate.gate_13.name'),
        text: t('content.gate.gate_13.text'),
        note: t('content.gate.gate_13.note'),
      },
      {
        id: 'gate_14',
        name: t('content.gate.gate_14.name'),
        text: t('content.gate.gate_14.text'),
        note: t('content.gate.gate_14.note'),
      },
      {
        id: 'gate_15',
        name: t('content.gate.gate_15.name'),
        text: t('content.gate.gate_15.text'),
        note: t('content.gate.gate_15.note'),
      },
    ],
  },
  {
    id: 'door_06',
    name: t('content.gate.door_06'),
    entries: [
      {
        id: 'gate_16',
        name: t('content.gate.gate_16.name'),
        text: t('content.gate.gate_16.text'),
        note: t('content.gate.gate_16.note'),
      },
      {
        id: 'gate_17',
        name: t('content.gate.gate_17.name'),
        text: t('content.gate.gate_17.text'),
        note: t('content.gate.gate_17.note'),
      },
      {
        id: 'gate_18',
        name: t('content.gate.gate_18.name'),
        text: t('content.gate.gate_18.text'),
        note: t('content.gate.gate_18.note'),
      },
    ],
  },
  {
    id: 'door_07',
    name: t('content.gate.door_07'),
    entries: [
      {
        id: 'gate_19',
        name: t('content.gate.gate_19.name'),
        text: t('content.gate.gate_19.text'),
        note: t('content.gate.gate_19.note'),
      },
      {
        id: 'gate_20',
        name: t('content.gate.gate_20.name'),
        text: t('content.gate.gate_20.text'),
        note: t('content.gate.gate_20.note'),
      },
      {
        id: 'gate_21',
        name: t('content.gate.gate_21.name'),
        text: t('content.gate.gate_21.text'),
        note: t('content.gate.gate_21.note'),
      },
    ],
  },
]
