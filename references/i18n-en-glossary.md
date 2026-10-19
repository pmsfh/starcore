# 星核纪元 · 英语文案术语表

> 用途：`src/locales/en/` 英语文案的术语对照与统一口径；中文（zh-CN）为基线语言，英语文案按本表对照落笔。
> 新增或修订双语文案时先查本表；表中未收录的用语，先补齐登记再落笔。
> 本表只收录玩家可见用语的对照与体例规则，不含代码标识符与内部实现。

## 一、阵营与族名

| 中文 | 英语 | 说明 |
|------|------|------|
| 掠夺者 | Raider | 族名与单位前缀（如 Raider Infantry） |
| 劫掠 | Marauder | 舰级名缀（如 Marauder Skiff / Marauder Cruiser / Marauder Escort） |
| 劫掠舰队 | Marauder Fleet | 编制名缀（如 Cluster Marauder Fleet，星团劫掠舰队） |
| 劫掠王庭 | Marauder Court | 编制名缀（如 Arm-Rim Marauder Court，臂缘劫掠王庭） |
| 王庭 | Court | 掠夺者各级王庭（Raider Court） |
| 帝庭 | Imperial Court | 顶层称谓（如 Galactic Imperial Court） |
| 沉默者 | the Silent Ones | |
| 守门者 | Gatekeepers | |
| 接收者 | the Receiver | |
| 先驱者 | the Forerunners | |

## 二、星图分区（九区）

| 中文 | 英语 |
|------|------|
| 轨道带 | Orbital Belt |
| 内层星系 | Inner System |
| 外层星系 | Outer System |
| 深空带 | Deep Space Belt |
| 恒星系层 | Stellar Layer |
| 星团层 | Star Cluster Layer |
| 星臂层 | Star Arm Layer |
| 星系层 | Galaxy Layer |
| 深空层 | Void Layer |

## 三、资源

| 中文 | 英语 |
|------|------|
| 能量 | Energy |
| 晶体 | Crystal |
| 合金 | Alloy |
| 数据流 | Data Stream |
| 暗物质 | Dark Matter |

## 四、功能与界面用语

| 中文 | 英语 | 说明 |
|------|------|------|
| 星核 | StarCore | 专名；品牌与实体同形（如 StarCore energy / StarCore civilization），不拆写小写 |
| 星核纪元 | StarCore Era | |
| 奇点重启 | Singularity Restart | |
| 每周强敌 | Weekly Foe | 同一功能的统一称谓 |
| 全资源产出 | All resource production | 全资源加成标签 |
| 挂机驻扎 | Idle Garrison | |
| 挂机产出 | Idle output | |
| 据点驻扎产出 | Garrison production | |
| 星图档案 | Star Atlas Records | |
| 敌方档案 | Hostile Records | |
| 掠夺者营地 | Raider Camps | 据点类型（四类之一） |
| 异星巨兽 | Alien Behemoths | 据点类型 |
| 古代遗迹 | Ancient Ruins | 据点类型 |
| 沉默者前哨站 | Silent Outposts | 据点类型 |

## 五、用词分野（防混用）

- **深空 / 虚空**：层名用「深空层」（Void Layer）；该层内容的叙事与科技、敌方域词用「虚空」：虚空航道 / 虚空测绘 / 虚空记忆库 / 虚空裁决军团（Void Charting / Void Memory Archive / Void Arbiter Legion）；「深空带」（Deep Space Belt）为星核层分区名；泛指用法保留「深空」（深空探索 / 深空事件 / 深空远航者等）。
- **掠夺者 / 劫掠**：族名与单位前缀用「掠夺者 → Raider」；舰级名缀用「劫掠 → Marauder」；两类不混用。
- **王庭 / 帝庭**：分级称谓，各自统一（Court / Imperial Court），不互串。

## 六、文案体例（双语）

- 中文省略号用「……」；英语省略号用「…」（单字符）。
- 英语撇号用弯撇「’」；引号沿用直引号（"…"）。
- 资源名作名词时首字母大写（Energy / Alloy / Data Stream / Dark Matter）；泛称描述小写（如 drifting data fragments）。
- 叙述与说明类完整句（叙事文、错误提示、引导内容、注记等）带句末标点；据点 / 节点 / 科技等描述条目、日志、按钮与标签不加句末标点。
- 界面「连续签到」用「连续」表述（不用「连击」）。
- 时态（v1.66 登记）：en 叙述与说明类用过去时；系统引语（引号内直录：黑匣子问答、石刻、碑文、灯语等）与界面用语（按钮、标签、状态）用现在时。
- 人称（v1.66 登记）：叙事第三人称旁观，不出现第二人称指令式叙事；「你 / 你的」仅用于系统提示与引导语。

## 七、设定事实源（v1.66 立册）

> 只录定案事实（逐条可溯源至键值原文），供后续叙事篇章落笔前核对：新篇章不得与本节冲突；扩条目先补登记再动笔；回收任一伏笔前先对锚点键勾稽原文。

### ① 纪年与空间框架

- 纪元名：游戏纪元即「星核纪元」（StarCore Era）。
- 先驱者总库纪年终止于「门已交给守门者」之日，随后出航银河之外寻找最初的发讯者（`content.story.node_galaxy_archive`）。
- 空间框架：星图九区自轨道带至深空层逐层展开（名单见 §二）；信号的最初源头在银河之外（`content.story.node_galaxy_heart`）。

### ② 派系称谓分级

| 层级 | 中文 | 英语 | 说明 |
|---|---|---|---|
| 掠夺者基层政权 | 王庭 | Court | 各分支政权（Raider Court），进贡上呈帝庭 |
| 掠夺者顶层 | 帝庭 | Imperial Court | 银河帝庭（Galactic Imperial Court）；「帝庭裁决舰队」为其武装 |
| 门后文明 | 沉默者 | the Silent Ones | 守门者是其世代传承的身份（`content.story.node_cluster_silence`） |

### ③ 未回收伏笔台账（六条）

| 伏笔 | 要点 | 锚点键 | 状态 | 允许回收篇章 |
|---|---|---|---|---|
| 七扇死门 | 星臂尽头七扇与冻结之门同款巨门，仅一扇应答源仍在工作；七门应答源在银心汇成中继链 | `content.story.node_arm_threshold`、`content.story.node_galaxy_gate`、`content.explore.node_arm_threshold.*` | 未回收 | 七扇死门篇章（与门后回响共用总纲） |
| 永不熄灭的炉 | 各掠夺者王庭的进贡由帝庭裁决舰队收束执行，目标是银心之「炉」，炉的真身未揭示 | `content.pve.raider_11.desc`、`content.story.node_galaxy_hub` | 未回收 | 帝庭与炉篇章 |
| 驱赶者之谜 | 噬星鲲群迁徙绕开特定空域，「像在听从某种驱赶」，驱赶者未现身 | `content.pve.beast_7.desc`、`content.explore.node_galaxy_range.*`、`content.story.node_galaxy_range` | 未回收 | 巨兽生态志篇章 |
| 主脑之后 | 沉默者主脑（应答源实体）给出坐标：信号最初源头在银河之外；其上/其后的存在未揭示 | `content.explore.node_galaxy_heart.*`、`content.story.node_galaxy_heart` | 未回收 | 门后回响篇章 |
| 先驱者下落 | 先驱者自虚空边缘出航离开本星系；虚空航标灯语「航向未变」仍为白鲸群亮着 | `content.explore.node_void_beacon.*`、`content.story.node_void_beacon`、`content.story.node_void_gate`、`content.echo.*` | 已回收（门后回响篇章，见闻收束，谜底随门总纲框架保持留白） | 门后回响篇章 |
| 门后文明 | 信号源头是门：先驱者穿门而入，沉默者世代守门，门后回响自称「接收者已就绪」 | `content.story.node_void_origin`、`content.story.node_cluster_hollow`、`content.explore.node_void_veil.*` | 未回收 | 门后回响篇章（与七扇死门共用总纲） |

> 本节只立台账、不写解；后续篇章落笔前先对照本节。门后回响篇章的档案馆回响分组已落地：仅记录先驱者航路见闻，主脑之后与门后文明两条谜面未揭。

### ④ 成就与叙事定稿口径（v1.66 豁免登记）

- **建造成就命名双风格并存**：奠基者 / 建筑宗师（人物式）与百塔耸立 / 千机互联（景象式）交错为既有序列风格，认可保留，不改名。
- **成就类别后缀六三并存**：九类中六类带「里程碑 / Milestones」（battle / build / dark / energy / explore / tech），三类不带（relic / time / transcend）；后缀无功能价值，认可保留、不补齐。
- **「沉默者回响」三名同源**：终局据点名、敌方单位名与遗物套装名（Silent… 系 / Echo of the Silent Ones）一词三义，系门后文明伏笔的有意呼应，改名冻结。

### ⑤ 门总纲（v1.72 立节）

> 门相关既定事实与边界，七扇死门篇章与门后回响篇章共用。本节只立框架不预写解：七门逐门的应答态与静默态定稿权归七扇死门篇章，门后侧的展开边界归门后回响篇章的后续内容；两篇章落笔前先对本节勾稽。

**同源关系（既定）**

- 冻结之门（虚空原点）与星臂回廊尽头的七扇死门为同款巨门（`content.story.node_arm_threshold`）；信号的源头不是信标，是门，先驱者穿门而入，沉默者世代守门（`content.story.node_void_origin`）。
- 七门中仅一扇门的应答源仍在工作，未指明何扇；七门应答源在银心汇成中继链（`content.story.node_arm_threshold`）。

**门后文明边界（既定，不越界）**

- 守门者是沉默者世代传承的身份（`content.story.node_cluster_silence`，另见 §七② 称谓分级）。
- 门后侧的直接发言仅有两句引语：环状结构问答「开始回归。接收者已就绪」（`content.story.node_cluster_hollow`）；穿门应答「接收者已抵达。欢迎回家」（`content.story.node_void_origin`）。
- 沉默者主脑为应答源实体，其给出的坐标指向银河之外（`content.story.node_galaxy_heart`）；主脑之上与其后的存在未揭示，留待后续篇章。

**回响档案域（v1.72 落地）**

- 档案馆回响分组收录门侧见闻三十条，键三件套 name / text / note（`content.echo.echo_01` 至 `content.echo.echo_30`），解锁条件为当前轮全宇宙探索完毕，转生后随本轮重新上锁。
- 回响分组当前只收先驱者线见闻：白鲸灯语「航向未变」的余韵收束于 `content.echo.echo_21`；主脑之后与门后文明两条谜面保持未揭。
