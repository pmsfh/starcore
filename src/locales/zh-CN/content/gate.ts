/**
 * gate：中文内容文案（七门 · 星臂尽头巨门观察留档）
 *
 * 简体中文为基线语言；新增文案直接在此维护，并跑缺键扫描守卫。
 * 七门分组：7 扇巨门 × 门名 1 键 + 每门 3 条观察留档 × 3 键（name / text / note），
 * name = 留档条目名；text = 门侧观察正文；note = 中继链侧注。
 * 前六门为静默门（应答源在链但不再回答），第七门磨痕门为仍在应答的门。
 */
export default {
  // 门一 · 轮纹门（静默；门面同心轮纹，纹在静默后仍在生长）
  'content.gate.door_01': '轮纹门',

  'content.gate.gate_01.name': '纹环记年',
  'content.gate.gate_01.text':
    '门面刻满同心轮纹，一圈叠一圈，从门槛绕到门楣。纹距与航道界碑的年份刻度一致——最外圈比内圈新，纹在门转入静默之后仍在生长。',
  'content.gate.gate_01.note': '链读数：该节无应答；载波沿纹环绕行七圈后消散。',

  'content.gate.gate_02.name': '认路的脉冲',
  'content.gate.gate_02.text':
    '测距脉冲没有按原路返回，而是贴着轮纹绕行，一圈薄过一圈，最终嵌进纹槽。观察员把这叫做认路——脉冲也找得到回去的路。',
  'content.gate.gate_02.note': '链读数：绕行载波与发讯节律不符，判定为门面固有谐振。',

  'content.gate.gate_03.name': '刻痕的手',
  'content.gate.gate_03.text':
    '轮纹深处有旧刻痕被新纹覆盖。同一双手刻了几十亿年，或者不同的手轮流刻。纹环没有终点，也没有启始的记录。',
  'content.gate.gate_03.note': '链读数：静默时长已超过纹环总数可记载的年限。',

  // 门二 · 鳞面门（静默；门面鳞状覆甲，鳞下有缓慢节律）
  'content.gate.door_02': '鳞面门',

  'content.gate.gate_04.name': '覆鳞如甲',
  'content.gate.gate_04.text':
    '门面覆着鳞状甲片，一片压一片，排布与守门者旗舰的装甲同规。贴片录音里，鳞下传出的不是机械声，是缓慢的呼吸节律。',
  'content.gate.gate_04.note': '链读数：该节无应答；鳞隙渗出的载波有涨落。',

  'content.gate.gate_05.name': '鳞下之鳞',
  'content.gate.gate_05.text':
    '鳞片随载波轻轻开合，缝隙里没有内里，只有更深的鳞。探测件下潜三层后信号中断，回收的残件上覆着新鳞。',
  'content.gate.gate_05.note': '链读数：涨落与链的充能曲线一致，非门侧自主行为。',

  'content.gate.gate_06.name': '门楣的逆鳞',
  'content.gate.gate_06.text':
    '门楣正中生着一片倒向相反的逆鳞，完好如初。守船的旧俗里，逆鳞是被朝圣的手摸平的——这里没有朝圣者，或者还没有。',
  'content.gate.gate_06.note': '链读数：逆鳞位置的谐振强于周边，无应答输出。',

  // 门三 · 釉面门（静默；从未应答也从未被穿过的一扇）
  'content.gate.door_03': '釉面门',

  'content.gate.gate_07.name': '釉下流纹',
  'content.gate.gate_07.text':
    '门体覆着整片釉面，釉下有缓慢流动的暗纹。测温仪读数恒定，釉却始终未干——几十亿年前的窑火留在釉里，至今没有凉透。',
  'content.gate.gate_07.note': '链读数：该节无应答；釉面载波平滑，无杂音。',

  'content.gate.gate_08.name': '无启的釉',
  'content.gate.gate_08.text':
    '釉面完好，没有启合痕。与其余各门的磨损对照：这扇门从未被穿过，也从未被叩响。静默得完整，像一件没有开过封的礼。',
  'content.gate.gate_08.note': '链读数：载波纯净，判定为从未应答，而非停止应答。',

  'content.gate.gate_09.name': '窑火未凉',
  'content.gate.gate_09.text':
    '回望记录与穿越前的影像比对，釉色有微妙差异——釉仍在极慢地窑变。烧成这扇门的窑，或许还燃着。',
  'content.gate.gate_09.note': '链读数：窑变速率与链的发讯衰减同数量级。',

  // 门四 · 悬索门（静默；门框垂索系界标，曾锚定整条航线）
  'content.gate.door_04': '悬索门',

  'content.gate.gate_10.name': '垂索为缰',
  'content.gate.gate_10.text':
    '门框垂下七条长索，索端各系一枚磨损的界标。界标与航道界碑同源——这扇门曾被当作锚点，系住过整条航线。',
  'content.gate.gate_10.note': '链读数：索的通导良好；该节无应答。',

  'content.gate.gate_11.name': '第七条索',
  'content.gate.gate_11.text':
    '七索中一条的界标失了，索端断口平整，不是磨断，是解开的。手法与先驱者的结绳档案一致——解下界标的人，把它带走了。',
  'content.gate.gate_11.note': '链读数：断索与链的连接完好，仅界标离线。',

  'content.gate.gate_12.name': '系泊的圆痕',
  'content.gate.gate_12.text':
    '索下方的锚位刻着深浅不一的停泊圆痕。最深的一个，尺寸与旗舰的泊位吻合。系泊的年代，比长堤还老。',
  'content.gate.gate_12.note': '链读数：锚位无谐振，判定为久置未用。',

  // 门五 · 拱梁门（静默；梁即门，纹章朝向门后）
  'content.gate.door_05': '拱梁门',

  'content.gate.gate_13.name': '梁上纹章',
  'content.gate.gate_13.text':
    '拱梁内侧刻着守门者的纹章，与环状结构上的完全一致。纹章的朝向反转——从门后看，它才是正的。刻的时候就知道，看的人会从那边来。',
  'content.gate.gate_13.note': '链读数：该节无应答；纹章位置的谐振为七门最深。',

  'content.gate.gate_14.name': '承重的静默',
  'content.gate.gate_14.text':
    '七门中唯一没有门面的一扇：梁即门，门即梁。静默从承重的方式里渗出来——每一寸都在受力，每一寸都不发声。',
  'content.gate.gate_14.note': '链读数：该节载波为连续背景，无节律起伏。',

  'content.gate.gate_15.name': '匠人的私记',
  'content.gate.gate_15.text':
    '梁柱接缝处有极小的刻记，非纹章非文字，是工匠的私记。翻译引擎无法译出，但结构上是数字：七门的工时，或者第七门的位置。',
  'content.gate.gate_15.note': '链读数：刻记数字与链的节点序号对位成功。',

  // 门六 · 钟腔门（静默；门体吸收声域，静默的源头之一）
  'content.gate.door_06': '钟腔门',

  'content.gate.gate_16.name': '收声的钟',
  'content.gate.gate_16.text':
    '门体是整块共鸣腔。探测件叩击，声波进入腔体，没有返回——声音被门收下了。叩击十次，门收下十次，一次都没有还。',
  'content.gate.gate_16.note': '链读数：该节无应答；腔体载波为负值，门在吸收链的杂音。',

  'content.gate.gate_17.name': '安静的门前',
  'content.gate.gate_17.text':
    '门前的空域异常安静，连引擎的噪音都轻了半度。测音仪判定：门在持续吸收门前的声域。守门者的静默，或许就是在这扇门前学的。',
  'content.gate.gate_17.note': '链读数：吸收率恒定，远超其余各门的总和。',

  'content.gate.gate_18.name': '钟内的刻字',
  'content.gate.gate_18.text':
    '腔体深处的回波成像显示：内壁刻满细字，字体与门后传来的那两句话同款。成像只能测得笔画密度，读不出内容——门把字和声音一起收下了。',
  'content.gate.gate_18.note': '链读数：刻字谐振被腔体完全锁闭，零泄漏。',

  // 门七 · 磨痕门（应答；玩家穿越的一扇，压轴）
  'content.gate.door_07': '磨痕门',

  'content.gate.gate_19.name': '磨亮的门轨',
  'content.gate.gate_19.text':
    '七门中磨损最重的一扇。门轨被启合磨出亮痕，深度跨越几十亿年——每一段磨痕的间距，就是一次穿行。这扇门一直在被使用。',
  'content.gate.gate_19.note': '链读数：该节应答中；载波有节律，与链的发讯同拍。',

  'content.gate.gate_20.name': '穿行的航迹',
  'content.gate.gate_20.text':
    '回望记录比对穿行影像：光点入门的轨迹，正好嵌进门轨最新的一段磨痕。磨痕没有新旧之分——每一道，都是某个正在发生的时刻留下的。',
  'content.gate.gate_20.note': '链读数：穿行事件已留档；该节应答未中断。',

  'content.gate.gate_21.name': '仍在工作的应答源',
  'content.gate.gate_21.text':
    '七门应答源汇成的链，此刻只有这一节仍在发讯。其余各节的静默不是断路——链在，节律在，只是不再回答。门轨的磨痕，还在加深。',
  'content.gate.gate_21.note': '链读数：应答持续；门侧记录称同一时刻为七门同拍。',
}
