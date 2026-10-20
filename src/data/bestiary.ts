/**
 * bestiary.ts：异星巨兽生态志数据（vn 异星巨兽生态志）
 *
 * 异星巨兽敌方档案卡生态注：迁徙 / 食性 / 栖地三维，十种配注。
 * 键 = 语言无关稳定键（代表条目的据点 id#序号，与敌方档案收录键
 * 同形式）：语言切换为整页刷新，数据表按新语言重新求值，静态显示
 * 名作键在非基线语言下会失效；展示名由 UI 侧从聚合桶运行时取。
 * 取词沿数据实体字段口径：模块加载时逐键字面量取词，UI 读字段
 * 不做动态键拼接。
 */

import { t } from '@/i18n'

/** 生态注条目（mig = 迁徙，feed = 食性，hab = 栖地） */
export interface BestiaryNote {
  /** 代表条目稳定键（据点 id#序号；同显示名的全部条目共享此注） */
  key: string
  mig: string
  feed: string
  hab: string
}

/** 生态注（十种；幼兽类免注，选面 = 叙事价值优先） */
export const BESTIARY_NOTES: readonly BestiaryNote[] = [
  {
    key: 'beast_7#4', // 噬星鲲王
    mig: t('content.bestiary.kun_king.mig'),
    feed: t('content.bestiary.kun_king.feed'),
    hab: t('content.bestiary.kun_king.hab'),
  },
  {
    key: 'beast_5#0', // 晶云母兽
    mig: t('content.bestiary.cloud_matriarch.mig'),
    feed: t('content.bestiary.cloud_matriarch.feed'),
    hab: t('content.bestiary.cloud_matriarch.hab'),
  },
  {
    key: 'beast_6#3', // 噬星利维坦
    mig: t('content.bestiary.star_leviathan.mig'),
    feed: t('content.bestiary.star_leviathan.feed'),
    hab: t('content.bestiary.star_leviathan.hab'),
  },
  {
    key: 'beast_3#0', // 晶背巨兽
    mig: t('content.bestiary.crystalback.mig'),
    feed: t('content.bestiary.crystalback.feed'),
    hab: t('content.bestiary.crystalback.hab'),
  },
  {
    key: 'beast_1#0', // 晶体蛛
    mig: t('content.bestiary.crystal_spider.mig'),
    feed: t('content.bestiary.crystal_spider.feed'),
    hab: t('content.bestiary.crystal_spider.hab'),
  },
  {
    key: 'beast_2#0', // 虚空巨兽
    mig: t('content.bestiary.void_behemoth.mig'),
    feed: t('content.bestiary.void_behemoth.feed'),
    hab: t('content.bestiary.void_behemoth.hab'),
  },
  {
    key: 'beast_4#0', // 虚空巨兽母体
    mig: t('content.bestiary.void_matriarch.mig'),
    feed: t('content.bestiary.void_matriarch.feed'),
    hab: t('content.bestiary.void_matriarch.hab'),
  },
  {
    key: 'beast_8#0', // 虚空白鲸母兽
    mig: t('content.bestiary.white_matriarch.mig'),
    feed: t('content.bestiary.white_matriarch.feed'),
    hab: t('content.bestiary.white_matriarch.hab'),
  },
  {
    key: 'beast_8#4', // 虚空白鲸王
    mig: t('content.bestiary.white_king.mig'),
    feed: t('content.bestiary.white_king.feed'),
    hab: t('content.bestiary.white_king.hab'),
  },
  {
    key: 'beast_8#2', // 虚空白鲸（成鲸；幼鲸免注）
    mig: t('content.bestiary.white_whale.mig'),
    feed: t('content.bestiary.white_whale.feed'),
    hab: t('content.bestiary.white_whale.hab'),
  },
]

/** 按代表条目稳定键取注（未知键返回 undefined，调用方自行兜底） */
export function getBestiaryNote(key: string): BestiaryNote | undefined {
  return BESTIARY_NOTES.find((n) => n.key === key)
}
