#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
starcore-v126-encounter-ev.py — 随机遭遇事件 EV 核验表

对 49 个事件模板做程序化断言：
  1. 每事件两选项 EV 差 <= 15%（以 max(EV_A, EV_B) 为基）
  2. 能量当量落 [4.4e3, 1.2e5] 量级带（「顺路的糖」口径，对照签到 2e4-1e5）
  3. 每选项概率分布归一（Σp = 1）
  4. 资源数值非负整数、暗物质个位数（损失类结果允许负合金，至多扣空）
  5. 赌注类方差显著大于资源类（结果跨度 / EV >= 1.0，资源类 < 1.0）
  6. 数据源对账：模板、风味与数值全部经 balance-data.json（encounters.ts 快照），
     选项标签取导出时基线语言解析值，脚本不内嵌可能漂移的数值

折算率（设计声明，非市场价）：
  1 合金   = 1 能量   ；依据：重装兵训练成本 120 能量 + 60 合金 + 10 数据
  1 数据   = 6 能量   ；依据：同上，60 合金 : 10 数据 比价
  1 暗物质 = 8000 能量；依据：据点奖励带 energy/dark = 1e4/5e3/6.7e3/1e4 中值
  1 突击兵 = 60 能量当量；依据：训练成本 50 能量 + 10 合金
  1 晶体   = 55 能量  ；依据：据点奖励表 energy:crystal 实值中值（与 v1.27 派遣核验同源）
  1 护卫兵 = 60 能量当量；依据：训练成本 40 能量 + 20 合金
  1 重装兵 = 240 能量当量；依据：训练成本 120 能量 + 60 合金 + 10 数据

演进记录：
  - 2026-09-24 v1：初版 10 模板定稿核验。
  - 2026-10-12 v1.58：扩容 15 模板（10 → 25）；新增晶体、护卫兵、重装兵折算口径。
  - vn：势力叙事扩容 22 模板（25 → 47）；王庭商队 / 帝庭巡检 / 先驱遗存 / 白鲸灯语。
  - 2026-10-22 v1.75：帝庭档案入口扩容 2 模板（47 → 49）；留档巡访 / 炉边传闻，资源类 15 → 17。
  - 2026-10-18：改读活数据——数值与概率改从 src/data/encounters.ts 提取，
    收编兵员 units + unitKind 并入折算键，选项标签取 zh-CN 语言包。
  - 2026-10-26：数据源换为 balance-data.json 快照，数值与标签语义不变。
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import balance_data as bd

# 折算率（能量当量）
RATE = {"energy": 1, "crystal": 55, "alloy": 1, "data": 6, "dark": 8000, "unit_assault": 60, "unit_guard": 60, "unit_heavy": 240}

# 收编兵员字段映射：encounters.ts 的 units + unitKind → 折算键（缺省突击兵）
UNIT_KIND_KEYS = {"assault": "unit_assault", "guard": "unit_guard", "heavy": "unit_heavy"}

# 量级带（能量当量）
BAND_MIN = 4.4e3
BAND_MAX = 1.2e5

# EV 差上限
EV_GAP_MAX = 0.15

# 赌注类方差门槛：结果跨度（max-min）/ EV
GAMBLE_SPREAD_MIN = 1.0
RESOURCE_SPREAD_MAX = 1.0


# ---- 仓库真值：经 balance-data.json（encounters.ts 快照，选项标签为导出时基线语言解析值） ----

def load_encounters() -> list:
    """事件表（id/flavor/两选项标签与结果分布）；units + unitKind 并入折算键。"""
    events = []
    for e in bd.table('encounters'):
        enc = {"id": e["id"], "flavor": e["flavor"]}
        for opt in ("optA", "optB"):
            o = e[opt]
            outcomes = []
            for c in o["chances"]:
                rew = {}
                for k, v in c["rewards"].items():
                    if k == "units":
                        kind = c["rewards"].get("unitKind", "assault")
                        assert kind in UNIT_KIND_KEYS, f"未知 unitKind: {kind}"
                        k = UNIT_KIND_KEYS[kind]
                    elif k == "unitKind":
                        continue
                    rew[k] = v
                outcomes.append((c["p"], rew))
            enc[opt] = {"label": o["label"], "outcomes": outcomes}
        events.append(enc)
    return events


ENCOUNTERS = load_encounters()


def ev(outcomes):
    return sum(p * sum(RATE[k] * v for k, v in rew.items()) for p, rew in outcomes)


def spread(outcomes):
    vals = [sum(RATE[k] * v for k, v in rew.items()) for _, rew in outcomes]
    return max(vals) - min(vals)


def fmt_res(rew):
    order = ["energy", "crystal", "alloy", "data", "dark", "unit_assault", "unit_guard", "unit_heavy"]
    zh = {"energy": "能量", "crystal": "晶体", "alloy": "合金", "data": "数据", "dark": "暗物质", "unit_assault": "突击兵", "unit_guard": "护卫兵", "unit_heavy": "重装兵"}
    parts = []
    for k in order:
        if k in rew:
            parts.append(f"{rew[k]:+d} {zh[k]}" if rew[k] < 0 else f"+{rew[k]} {zh[k]}")
    return " ".join(parts) if parts else "无收获"


def main():
    failures = []
    rows = []
    flavor_count = {}
    for enc in ENCOUNTERS:
        eid, flavor = enc["id"], enc["flavor"]
        flavor_count[flavor] = flavor_count.get(flavor, 0) + 1
        ev_a, ev_b = ev(enc["optA"]["outcomes"]), ev(enc["optB"]["outcomes"])
        gap = abs(ev_a - ev_b) / max(ev_a, ev_b)
        # 断言 1：EV 差
        if gap > EV_GAP_MAX:
            failures.append(f"{eid}: EV 差 {gap:.1%} > {EV_GAP_MAX:.0%}（A={ev_a:.0f} B={ev_b:.0f}）")
        # 断言 2：量级带（两选项 EV 均入带）
        for name, v in (("A", ev_a), ("B", ev_b)):
            if not (BAND_MIN <= v <= BAND_MAX):
                failures.append(f"{eid} 选项{name}: 当量 {v:.0f} 出带 [{BAND_MIN:.0f}, {BAND_MAX:.0f}]")
        # 断言 3：概率归一
        for name, opt in (("A", enc["optA"]), ("B", enc["optB"])):
            s = sum(p for p, _ in opt["outcomes"])
            if abs(s - 1.0) > 1e-9:
                failures.append(f"{eid} 选项{name}: 概率和 {s} != 1")
        # 断言 4：数值形态（非负整数；负合金仅限损失结果且暗物质恒非负个位）
        for name, opt in (("A", enc["optA"]), ("B", enc["optB"])):
            for p, rew in opt["outcomes"]:
                for k, v in rew.items():
                    if not isinstance(v, int):
                        failures.append(f"{eid} 选项{name}: {k} 非整数 {v}")
                    if k == "dark" and not (0 <= v <= 9):
                        failures.append(f"{eid} 选项{name}: 暗物质 {v} 超个位带")
                    if k.startswith("unit_") and v <= 0:
                        failures.append(f"{eid} 选项{name}: 发兵量 {v} 非正")
                    if v < 0 and k != "alloy":
                        failures.append(f"{eid} 选项{name}: {k} 负值仅允许合金（损失类）")
        # 断言 5：方差特征
        sp_a, sp_b = spread(enc["optA"]["outcomes"]), spread(enc["optB"]["outcomes"])
        ratio_b = sp_b / ev_b if ev_b else 0
        if flavor == "gamble" and ratio_b < GAMBLE_SPREAD_MIN:
            failures.append(f"{eid}: 赌注类方差不足，跨度/EV {ratio_b:.2f} < {GAMBLE_SPREAD_MIN}")
        if flavor in ("resource", "explore") and ratio_b >= RESOURCE_SPREAD_MAX:
            failures.append(f"{eid}: 资源类方差过大，跨度/EV {ratio_b:.2f} >= {RESOURCE_SPREAD_MAX}")
        rows.append((eid, flavor, enc["optA"]["label"], ev_a, enc["optB"]["label"], ev_b, gap, ratio_b))

    # 风味分布
    expect = {"resource": 17, "military": 8, "explore": 11, "gamble": 13}
    if flavor_count != expect:
        failures.append(f"风味分布 {flavor_count} != 预期 {expect}")
    if len(ENCOUNTERS) != 49:
        failures.append(f"模板数 {len(ENCOUNTERS)} != 49")
    ids = [e["id"] for e in ENCOUNTERS]
    if len(set(ids)) != 49:
        failures.append("模板 id 有重复")

    # ---- 核验表输出 ----
    print(f"{'事件':<10}{'风味':<9}{'选项A':<8}{'EV_A':>7}  {'选项B':<10}{'EV_B':>7}  {'EV差':>6}  {'跨度/EV_B':>8}")
    print("-" * 78)
    for eid, flavor, la, eva, lb, evb, gap, rb in rows:
        print(f"{eid:<10}{flavor:<9}{la:<8}{eva:>7.0f}  {lb:<10}{evb:>7.0f}  {gap:>5.1%}  {rb:>8.2f}")
    print("-" * 78)
    print(f"模板数 49（{flavor_count}）；折算率 {RATE}")
    print(f"量级带 [{BAND_MIN:.0f}, {BAND_MAX:.0f}]；EV 差上限 {EV_GAP_MAX:.0%}")
    if failures:
        print(f"\nFAIL {len(failures)} 项：")
        for f in failures:
            print("  -", f)
        raise SystemExit(1)
    print("\nPASS：全部断言通过")


if __name__ == "__main__":
    main()
