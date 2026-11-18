// English / Simplified Chinese. The language follows the browser's language setting (zh-* → Chinese), a ?lang=zh|en
// link overrides it, and the 中文/EN button switches and remembers the choice. English is the default.
const KEY = 'rummage.lang';
function detect() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'zh' || q === 'en') return q;
  try { const s = localStorage.getItem(KEY); if (s === 'zh' || s === 'en') return s; } catch { /* storage unavailable */ }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  return langs.some((l) => /^zh\b/i.test(l)) ? 'zh' : 'en';
}
export let LANG = detect();
export function setLang(l) {
  LANG = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
  document.body.classList.toggle('zh', l === 'zh');
}

const UI = {
  fullscreen: ['⛶ Play full screen', '⛶ 全屏游玩'],
  musicOn: ['Music: on', '音乐：开'], musicOff: ['Music: off', '音乐：关'],
  sfxOn: ['Sounds: on', '音效：开'], sfxOff: ['Sounds: off', '音效：关'],
  langBtn: ['中文', 'EN'],
  loading: ['Unpacking the furniture…', '正在搬运家具……'],
  loadFail: ['Could not load the room. Please refresh.', '房间加载失败，请刷新页面。'],
  tag: ['The wizard lost his manor keys. <b>Everything opens.</b> Start rummaging.', '巫师弄丢了庄园的钥匙。<b>所有东西都能打开。</b>快来翻找吧！'],
  play: ['Play', '开始游戏'],
  challenge: ['Challenge a friend', '挑战好友'],
  credit: ['Every drawer, door and lid was generated and articulated by Aholo Lux3D.', '每个抽屉、柜门和盖子都由 Aholo Lux3D 生成，并装上了能动的关节。'],
  luxLink: ['See how Lux3D built this room', '看看 Lux3D 是怎么造出这个房间的'],
  manor: ['The Manor', '庄园'],
  day: ['☀ Day', '☀ 白天'], night: ['🌙 Night', '🌙 夜晚'],
  lockedTip: ['Finish the previous room to unlock', '完成上一个房间即可解锁'],
  madeWith: ['Made with Lux3D', 'Lux3D 制作'],
  luxIntro: ['Every piece below was generated from a text prompt by <b>Aholo Lux3D</b>, then split into moving parts and given joints by Lux3D\'s articulation from a one-line motion prompt. Tap a card to watch it move.',
    '下面的每件家具，都是 <b>Aholo Lux3D</b> 根据一段文字提示生成的；再由 Lux3D 的关节功能根据一句动作提示，拆分成可动部件并装上关节。点击卡片，看看它怎么动。'],
  luxPrompt: ['Prompt', '提示词（原文）'], luxMotion: ['Motion prompt', '动作提示（原文）'],
  luxJoints: ['{n} joint{s}: {types}', '{n} 个关节：{types}'],
  luxGen: ['generated in {s}s', '生成用时 {s} 秒'], luxArt: ['articulated in {s}s', '关节用时 {s} 秒'], luxStyle: ['style: {s}', '风格：{s}'],
  room: ['Room {n}', '第 {n} 关'],
  start: ['Start rummaging', '开始翻找'],
  backMap: ['Back to map', '返回地图'],
  rFind: ['Find {n} key{s}', '找到 {n} 把钥匙'], rClock: ['{t} on the clock', '限时 {t}'],
  rHints: ['{n} hint{s} (the ? button)', '{n} 次提示（? 按钮）'], rDecoys: ['{n} decoys', '{n} 个诱饵'],
  rLock: ['1 padlocked piece', '1 件上了锁的家具'], rMimics: ['{n} mimics', '{n} 只宝箱怪'], rRiddle: ['a riddle', '一个谜语'],
  challengeHud: ['Challenge', '挑战'],
  opened: ['Opened {n}', '已打开 {n}'],
  locked: ['Locked!', '上锁了！'], chomp: ['CHOMP! +5s', '咔嚓！+5 秒'],
  brass: ['A little brass key! Something unlocked…', '一把小铜钥匙！有什么东西解锁了……'],
  gotIt: ['GOT IT!', '找到啦！'], keyOf: ['Key {a} of {b}!', '第 {a} 把，共 {b} 把！'],
  hurry: ['HURRY!', '快点！'],
  timesUp: ["Time's up!", '时间到！'],
  revealOne: ['Here is the key you missed.', '这是你错过的钥匙。'], revealMany: ['Here are the {n} keys you missed.', '这是你错过的 {n} 把钥匙。'],
  keyWasHere: ['Key {n} was here: the {name}', '第 {n} 把钥匙在这里：{name}'],
  seeResults: ['See results', '查看结果'],
  luckyTitle: ['Feeling lucky?', '想赌一把吗？'], luckySub: ['The clock keeps running while you choose.', '你在犹豫的时候，时间可不会停。'], notNow: ['Not now', '算了'],
  flipping: ['Flipping…', '抛硬币中……'], rolling: ['Rolling…', '掷骰子中……'],
  heads: ['HEADS! A key jumps out!', '正面！一把钥匙跳了出来！'], jackpot: ['JACKPOT! Every key jumps out!', '大奖！所有钥匙都跳了出来！'],
  tails: ['TAILS! Half your time is gone.', '反面！时间少了一半。'], bust: ['BUST! 15 seconds left!', '输了！只剩 15 秒！'], minus15: ['-15s', '-15 秒'],
  paused: ['Paused', '已暂停'], resume: ['Resume', '继续'],
  hiding: ['Hiding', '藏钥匙'], timeLimit: ['Time limit', '时间限制'], hideHere: ['Hide here', '藏在这里'],
  hideOpen: ['Nice spot. Pick a time limit, then hide the key here.', '好地方！选一个时间限制，然后把钥匙藏在这里。'],
  hideClosed: ['Open a drawer, door or lid to choose a hiding spot.', '打开一个抽屉、柜门或盖子，选一个藏钥匙的地方。'],
  ready: ['Challenge ready', '挑战已就绪'], keyHidden: ['A key is hidden somewhere in this room.', '这个房间的某个地方藏着一把钥匙。'],
  toFind: ['{t} to find it', '限时 {t}'], noTimer: ['No timer', '不限时'], thingsToOpen: ['{n} things to open', '共 {n} 处可以打开'],
  startSearching: ['Start searching', '开始寻找'], copyLink: ['Copy challenge link', '复制挑战链接'], linkCopied: ['Link copied!', '链接已复制！'],
  copyPrompt: ['Copy this challenge link', '复制这个挑战链接'], storyInstead: ['Play the story instead', '改玩故事模式'],
  foundIt: ['Found it!', '找到了！'], time: ['Time', '用时'], thingsOpened: ['Things opened', '打开次数'],
  par: ['Par: {t} and {o} opens', '目标：{t} 以内，打开不超过 {o} 次'],
  nextRoom: ['Next room', '下一关'], share: ['Share this challenge', '分享这个挑战'], tryAgain: ['Try again', '再试一次'], map: ['Map', '地图'],
  hideAgain: ['Hide a key for a friend', '给好友藏一把钥匙'],
  // hint clues
  cDrawer: ['Something that slides out', '一个能拉出来的东西'], cDoor: ['Behind a door', '在一扇门后面'], cLid: ['Under a lid', '在一个盖子下面'],
  cBrass: ['The brass key: ', '铜钥匙：'], cNear: [', near the {name}', '，在{name}附近'],
  wLeft: ['by the left wall', '靠左边的墙'], wBack: ['by the back wall', '靠后面的墙'], wRight: ['on the right side', '在房间右侧'], wMid: ['in the middle of the room', '在房间中间'],
  cWalls: ['Not in the furniture at all. Look at the walls.', '根本不在家具里。看看墙上。'], cFloor: ['Not in the furniture at all. Look at the floor.', '根本不在家具里。看看地板。'],
  itsThe: ["It's the {name}!", '就是{name}！'], itsIn: ["It's in the {name}! (glowing)", '就在{name}里！（正在发光）'],
  // bets
  bPeek: ['Safe trade', '稳妥交易'], bPeekOdds: ['Pay 15 seconds', '花 15 秒'], bPeekText: ['The piece holding a key glows.', '藏着钥匙的家具会发光。'],
  bFlip: ['Coin flip', '抛硬币'], bFlipOdds: ['50 / 50', '五五开'], bFlipText: ['Heads: a key jumps out. Tails: you lose half your remaining time.', '正面：一把钥匙跳出来。反面：剩余时间减半。'],
  bLong: ['Long shot', '孤注一掷'], bLongOdds: ['1 in 4', '四分之一'], bLongText: ['Win: every key jumps out. Lose: the clock drops to 15 seconds.', '赢了：所有钥匙都跳出来。输了：时间只剩 15 秒。'],
  riddleFallback: ['Where things are kept but never read…', '在存放东西、却从没人读过的地方……'],
};
export function t(key, vars = {}) {
  const e = UI[key];
  let s = e ? e[LANG === 'zh' ? 1 : 0] : key;
  if (vars.n !== undefined && vars.s === undefined) vars = { ...vars, s: Number(vars.n) === 1 ? '' : 's' };
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

// level names, blurbs and tips (English lives in levels.js)
const LEVELS_ZH = {
  1: ['巫师的书房', '每个抽屉、柜门和盖子都能打开。找到庄园的钥匙！', '看起来能打开的东西，都点一点。'],
  2: ['船长的船舱', '这次有两把钥匙，而且船长特别爱囤破烂。', '小心诱饵！闪闪发光的不一定是钥匙。'],
  3: ['闹鬼的厨房', '有东西上了锁。先找到那把小铜钥匙。', '上锁的家具，需要藏在别处的小铜钥匙。'],
  4: ['玩具工坊', '有些盖子会咬人！宝箱怪会猛地合上，让你损失 5 秒。', '宝箱怪会猛地合上：每次 +5 秒。'],
  5: ['大图书馆', '三把钥匙、谜语、挂锁和宝箱怪。终极大翻找！', '读一读谜语：它会告诉你其中一把钥匙藏在哪里。'],
  6: ['烛光书房', '灯灭了。你只有一支手电筒，而且不是每把钥匙都藏在家具里。', '夜晚：用手电筒照一照。想冒险？点骰子赌一把。'],
  7: ['午夜叛变', '船舱在黑暗中嘎吱作响。藏钥匙的地方不一定是抽屉。', '夜晚：诱饵在黑暗中也会闪光。'],
  8: ['深夜厨房', '挂锁和宝箱怪。在黑暗中找到那把铜钥匙。', '夜晚：铜钥匙能打开挂锁。'],
  9: ['会咬人的玩具', '三只宝箱怪正在黑漆漆的工坊里等着你。', '夜晚：三只宝箱怪，小心选择。'],
  10: ['最后的钥匙', '最后的翻找：四把钥匙、一个谜语，还有一座被黑暗吞没的图书馆。', '夜晚：靠谜语和手电筒。祝你好运！'],
};
export const levelText = (l) => (LANG === 'zh' && LEVELS_ZH[l.id]
  ? { name: LEVELS_ZH[l.id][0], blurb: LEVELS_ZH[l.id][1], tip: LEVELS_ZH[l.id][2] }
  : { name: l.name, blurb: l.blurb, tip: l.tip });

export const NAMES_ZH = {
  'w-bookcase': '书柜', 'w-cabinet': '高柜', 'w-drawers': '五斗柜', 'w-potion': '药水柜', 'w-desk': '书桌', 'w-chest': '宝箱',
  'w-spellbox': '咒语盒', 'w-nightstand': '床头柜', 'w-hatbox': '帽盒',
  'p-wardrobe': '衣柜', 'p-mapcabinet': '海图柜', 'p-bunk': '双层床', 'p-cupboard': '橱柜', 'p-desk': '船长的书桌', 'p-seachest': '航海箱',
  'p-barrel': '木桶', 'p-crate': '木箱', 'p-strongbox': '小保险箱', 'p-sidecabinet': '边柜', 'p-jewelbox': '珠宝盒',
  'k-fridge': '冰箱', 'k-dresser': '碗柜', 'k-sink': '水槽柜', 'k-pantry': '食品柜', 'k-stove': '炉灶', 'k-table': '厨房餐桌',
  'k-breadbin': '面包箱', 'k-icebox': '冰盒', 'k-spicerack': '调料架', 'k-cookiejar': '饼干罐', 'k-wallcupboard': '吊柜',
  't-toolcabinet': '工具柜', 't-dollhouse': '娃娃屋', 't-workbench': '工作台', 't-cubbies': '储物格', 't-toychest': '玩具箱',
  't-jackbox': '玩偶惊喜盒', 't-trunk': '旅行箱', 't-paintbox': '颜料盒', 't-musicbox': '音乐盒', 't-toolbox': '工具箱', 't-lockers': '储物柜',
  'l-bookcase': '书柜', 'l-clock': '落地钟', 'l-cabinet': '珍奇柜', 'l-catalog': '卡片目录柜', 'l-safe': '保险柜', 'l-lectern': '讲经台',
  'l-desk': '图书管理员的书桌', 'l-globe': '地球仪', 'l-chest': '卷轴箱', 'l-sidetable': '小圆桌', 'l-pianobench': '钢琴凳',
  'l-mapchest': '地图柜', 'l-writingbox': '写字盒',
  'secret-picture': '挂画', 'secret-floorboard': '松动的地板',
};
export const CLUES_ZH = {
  'l-bookcase': '在玻璃后面，藏在千万个故事之间。', 'l-clock': '在时间来回摆动的地方。', 'l-cabinet': '在奇珍异宝之间，高高的玻璃后面。',
  'l-catalog': '归档在一个小小的抽屉里。', 'l-safe': '由一个永不睡觉的转盘守护着。', 'l-lectern': '在那本大书安放之处的下面。',
  'l-desk': '在图书管理员写笔记的地方。', 'l-globe': '就在整个世界里面。', 'l-chest': '和古老的卷轴锁在一起。',
  'l-sidetable': '小小圆圆的，就在阅读椅旁边。', 'l-pianobench': '在乐谱安坐的地方下面。', 'l-mapchest': '又平又宽，地图在里面沉睡。',
  'l-writingbox': '在倾斜的盖子下面，书信在那里诞生。',
  picture: '在墙上那张注视着你的脸后面。', floorboard: '在脚下，那块会吱吱作响的木板里。',
};
export const SECRET_CLUES_EN = { picture: 'Behind a face that watches from the wall.', floorboard: 'Underfoot, where one board creaks.' };
export const DECOY_ZH = {
  coins: '亮闪闪的……可惜只是硬币。', bottle: '一个空瓶子。不是它！', sock: '一只袜子。好恶心。',
  teacup: '一个茶杯。不是钥匙。', spoon: '一把勺子。继续找！', rubberduck: '嘎嘎。不是钥匙。',
};
export const EMPTY = [['Empty!', 'Nothing here.', 'Just dust.', 'Nope!', 'Zilch.', 'Cobwebs…'], ['空的！', '什么都没有。', '只有灰尘。', '不是这里！', '一无所获。', '全是蜘蛛网……']];
export const timeLabel = (label) => (LANG === 'zh' ? label.replace(/^(\d+)s$/, '$1 秒').replace(/^(\d+)m$/, '$1 分钟') : label);
