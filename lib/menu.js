const os = require('os');
const { smallCaps, progressBar, formatBytes, runtime, getMemoryInfo } = require('./utils');

/**
 * Complete command list organized by category
 */
const COMMAND_CATEGORIES = {
  SECURITY: [
    'antidelete', 'antiedit', 'anticall', 'antibot', 'antilink',
    'antitag', 'antimention', 'antiforward'
  ],
  OWNER: [
    'restart', 'update', 'redeploy', 'broadcast', 'addsudo', 'remsudo',
    'block', 'unblock', 'setbio', 'setprofilepic', 'join', 'leave',
    'delete', 'deljunk', 'vv', 'vv2', 'toviewonce', 'tostatus',
    'autosavestatus', 'dlvo', 'forward', 'warn', 'online', 'groupid',
    'hostip', 'disk', 'owner', 'mode', 'aza', 'setaza', 'resetaza',
    'listsudo', 'listblocked', 'ppprivacy', 'gcaddprivacy', 'readreceipts',
    'react', 'delstickercmd', 'setstickercmd', 'lastseen', 'unblockall'
  ],
  AI: [
    'ai', 'gpt', 'gemini', 'google', 'define', 'vision', 'chatbot',
    'blackbox', 'code', 'dalle', 'deepseek', 'doppleai', 'generate',
    'programming', 'recipe', 'story', 'summarize', 'teach', 'translate2',
    'analyze'
  ],
  DOWNLOAD: [
    'ytmp3', 'ytmp4', 'spotify', 'tiktok', 'instagram', 'facebook',
    'twitter', 'song', 'song2', 'video', 'videodoc', 'apk', 'download',
    'gdrive', 'gitclone', 'image', 'itunes', 'mediafire', 'pin',
    'savestatus', 'telesticker', 'tiktokaudio', 'xvideo'
  ],
  GROUPS: [
    'promote', 'demote', 'remove', 'tagall', 'hidetag', 'mute', 'unmute',
    'add', 'kick', 'link', 'resetlink', 'setdesc', 'setgroupname',
    'setppgroup', 'delppgroup', 'tagadmin', 'tag', 'invite', 'welcome',
    'poll', 'open', 'close', 'opentime', 'closetime', 'announcements',
    'antibadword', 'antibot', 'antilink', 'antilinkgc', 'antiforeign',
    'antiforward', 'antimessage', 'antisticker', 'antitag', 'antitagadmin',
    'approve', 'approveall', 'cancelkick', 'delcode', 'disapproveall',
    'editsettings', 'getgrouppp', 'kickall', 'kickinactive', 'listactive',
    'listallowed', 'listcode', 'listinactive', 'listrequests', 'mediatag',
    'reject', 'totalmembers', 'userid', 'vcf', 'addcode', 'allow',
    'delallowed', 'addgcstatus'
  ],
  EPHOTO360: [
    '1917style', 'advancedglow', 'blackpinklogo', 'blackpinkstyle',
    'cartoonstyle', 'deletingtext', 'dragonball', 'effectclouds',
    'flag3dtext', 'flagtext', 'freecreate', 'galaxystyle',
    'galaxywallpaper', 'glitchtext', 'glowingtext', 'gradienttext',
    'graffiti', 'incandescent', 'lighteffects', 'logomaker',
    'luxurygold', 'makingneon', 'matrix', 'multicoloredneon',
    'neonglitch', 'papercutstyle', 'pixelglitch', 'royaltext',
    'sand', 'summerbeach', 'topography', 'typography', 'watercolortext',
    'writetext'
  ],
  FUN: [
    'fact', 'jokes', 'memes', 'quotes', 'trivia', 'truthdetector', 'xxqc'
  ],
  GAMES: [
    'dare', 'truth', 'truthordare'
  ],
  IMAGE: [
    'remini', 'wallpaper'
  ],
  AUDIO: [
    'bass', 'blown', 'deep', 'earrape', 'reverse', 'robot',
    'tomp3', 'toptt', 'volaudio'
  ],
  VIDEO: [
    'toaudio', 'tovideo', 'volvideo'
  ],
  SEARCH: [
    'define', 'define2', 'imdb', 'lyrics', 'shazam', 'weather', 'yts'
  ],
  TOOLS: [
    'browse', 'calculate', 'device', 'emojimix', 'fancy', 'filtervcf',
    'fliptext', 'genpass', 'getabout', 'getpp', 'gsmarena', 'obfuscate',
    'qrcode', 'runeval', 'say', 'ssweb', 'sswebpc', 'sswebtab', 'sticker',
    'take', 'texttopdf', 'tinyurl', 'toimage', 'tourl', 'vcc'
  ],
  SETTINGS: [
    'addbadword', 'addcountrycode', 'addignorelist', 'addsudo', 'alwaysonline',
    'antibug', 'anticall', 'antidelete', 'antideletestatus', 'antiedit',
    'antiviewonce', 'autobio', 'autoblock', 'autoreact', 'autoreactstatus',
    'autoread', 'autorecord', 'autorecordtyping', 'autotype', 'autoviewstatus',
    'chatbot', 'delanticallmsg', 'delcountrycode', 'deletebadword',
    'delgoodbye', 'delignorelist', 'delsudo', 'delwelcome', 'getsettings',
    'listcountrycode', 'listwarn', 'mode', 'resetsetting', 'resetwarn',
    'setanticallmsg', 'setbotname', 'setcontextlink', 'setfont', 'setgoodbye',
    'setmenu', 'setmenuimage', 'setownername', 'setownernumber', 'setprefix',
    'setstatusemoji', 'setstickerauthor', 'setstickerpackname', 'settimezone',
    'setwarn', 'setwatermark', 'setwelcome', 'showanticallmsg', 'showgoodbye',
    'showwelcome', 'statusdelay', 'statussettings', 'testanticallmsg',
    'testgoodbye', 'testwelcome'
  ],
  RELIGION: [
    'bible', 'quran'
  ],
  SPORTS: [
    'bundesligamatches', 'bundesligascorers', 'bundesligastandings',
    'bundesligaupcoming', 'clmatches', 'clscorers', 'clstandings',
    'clupcoming', 'eflmatches', 'eflscorers', 'eflstandings',
    'eflupcoming', 'elmatches', 'elscorers', 'elstandings',
    'elupcoming', 'eplmatches', 'eplscorers', 'eplstandings',
    'eplupcoming', 'laligamatches', 'laligascorers', 'laligastandings',
    'laligaupcoming', 'ligue1matches', 'ligue1scorers', 'ligue1standings',
    'ligue1upcoming', 'serieamatches', 'serieascorers', 'serieastandings',
    'serieaupcoming', 'wcmatches', 'wcscorers', 'wcstandings',
    'wcupcoming', 'wrestlingevents', 'wwenews', 'wweschedule'
  ],
  GROUPSTATUS: [
    'fetchgroups', 'tosgroup'
  ],
  SUPPORT: [
    'feedback', 'helpers'
  ],
  OTHER: [
    'botstatus', 'pair', 'ping', 'ping2', 'repo', 'runtime', 'time', 'vv'
  ]
};

/**
 * Get total plugin/command count
 */
function getTotalCommands() {
  let total = 0;
  for (const cmds of Object.values(COMMAND_CATEGORIES)) {
    total += cmds.length;
  }
  return total;
}

/**
 * Get all commands organized by category
 */
function getCommandList() {
  return { ...COMMAND_CATEGORIES };
}

/**
 * Category display config - emoji + fancy name
 */
const CATEGORY_DISPLAY = {
  SECURITY:   { emoji: '🛡', name: '𝑺𝑬𝑪𝑼𝑹𝑰𝑻𝒀' },
  OWNER:      { emoji: '👑', name: '𝑶𝑾𝑵𝑬𝑹' },
  AI:         { emoji: '🤖', name: '𝑨𝑰 𝑯𝑼𝑩' },
  DOWNLOAD:   { emoji: '📥', name: '𝑫𝑶𝑾𝑵𝑳𝑶𝑨𝑫' },
  GROUPS:     { emoji: '👥', name: '𝙂𝙍𝙊𝙐𝙋𝙎' },
  EPHOTO360:  { emoji: '🎨', name: '𝑬𝑷𝑯𝑶𝑻𝑶360' },
  FUN:        { emoji: '😂', name: '𝑭𝑼𝑵' },
  GAMES:      { emoji: '🎮', name: '𝑮𝑨𝑴𝑬𝑺' },
  IMAGE:      { emoji: '🖼', name: '𝑰𝑴𝑨𝑮𝑬' },
  AUDIO:      { emoji: '🎵', name: '𝑨𝑼𝑫𝑰𝑶' },
  VIDEO:      { emoji: '🎬', name: '𝑽𝑰𝑫𝑬𝑶' },
  SEARCH:     { emoji: '🔍', name: '𝑺𝑬𝑨𝑹𝑪𝑯' },
  TOOLS:      { emoji: '🔧', name: '𝑻𝑶𝑶𝑳𝑺' },
  SETTINGS:   { emoji: '⚙', name: '𝑺𝑬𝑻𝑻𝑰𝑵𝑮𝑺' },
  RELIGION:   { emoji: '🕊', name: '𝑹𝑬𝑳𝑰𝑮𝑰𝑶𝑵' },
  SPORTS:     { emoji: '⚽', name: '𝑺𝑷𝑶𝑹𝑻𝑺' },
  GROUPSTATUS:{ emoji: '📱', name: '𝑮𝑪 𝑺𝑻𝑨𝑻𝑼𝑺' },
  SUPPORT:    { emoji: '💬', name: '𝑺𝑼𝑷𝑷𝑶𝑹𝑻' },
  OTHER:      { emoji: '📋', name: '𝑶𝑻𝑯𝑬𝑹' }
};

/**
 * Generate the PREMIUM main menu (new ASCII art design)
 */
function generatePremiumMenu(config = {}) {
  const {
    ownerName = 'XTECH_KE',
    prefix = '.',
    mode = 'PUBLIC',
    version = '6.0.0',
    speed = 0,
    ramPercentage = 0
  } = config;

  const totalCmds = getTotalCommands();
  const ramPct = ramPercentage || Math.round((process.memoryUsage().rss / os.totalmem()) * 100);
  const speedMs = speed ? speed.toFixed(4) : '0.0004';

  let menu = '';

  // Header
  menu += '╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n';
  menu += '│                                      │\n';
  menu += '│      ◥█▓▒░ 𝙓𝙩𝙚𝙘𝙝 𝙓𝙙 ∞ 𝙑𝙄𝙋 ░▒▓█◤      │\n';
  menu += '│                                      │\n';
  menu += '│         『 TOXIC-𝑿d 』              │\n';
  menu += '│                                      │\n';
  menu += '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n';
  menu += '\n';

  // Status section
  menu += '┌─〔 ⚡ 𝘾𝙊𝙍𝙀 𝙎𝙏𝘼𝙏𝙐𝙎 ⚡ 〕─┐\n';
  menu += `│ 👑 𝙐𝙨𝙚𝙧     : ${ownerName}\n`;
  menu += `│ 🌐 𝙈𝙤𝙙𝙚     : ${mode}\n`;
  menu += `│ 📡 𝙎𝙚𝙧𝙫𝙚𝙧   : ONLINE\n`;
  menu += `│ ⚙️ 𝙑𝙚𝙧𝙨𝙞𝙤𝙣  : ${version}\n`;
  menu += `│ 🚀 𝙎𝙥𝙚𝙚𝙙    : ${speedMs} ms\n`;
  menu += `│ 💾 𝙍𝘼𝙈      : ${ramPct}%\n`;
  menu += `│ 📊 𝘾𝙢𝙙𝙨     : ${totalCmds}+\n`;
  menu += '└──────────────────────┘\n';
  menu += '\n';

  // Categories
  menu += '░▒▓█ 𝙎𝙔𝙎𝙏𝙀𝙈 𝙈𝙊𝘿𝙐𝙇𝙀𝙎 █▓▒░\n\n';

  for (const [category, commands] of Object.entries(COMMAND_CATEGORIES)) {
    const display = CATEGORY_DISPLAY[category] || { emoji: '📌', name: category };
    menu += '╭─────────────╮\n';
    menu += `│ ${display.emoji} ${display.name} │\n`;
    menu += '╰─────────────╯\n';
    for (const cmd of commands) {
      menu += `➤ ${cmd}\n`;
    }
    menu += '\n';
  }

  // Footer
  menu += '╭━━━━━━━━━━━━━━━━━━━━━━━╮\n';
  menu += '│ 『 𝙋𝙊𝙒𝙀𝙍𝙀𝘿 𝘽𝙔 𝙆𝙄𝙉𝙂 』 │\n';
  menu += '│     ⚡ 𝙉𝙊 𝙇𝙄𝙈𝙄𝙏𝙎 ⚡     │\n';
  menu += '╰━━━━━━━━━━━━━━━━━━━━━━━╯';

  return menu;
}

/**
 * Generate the main info box (original format for compatibility)
 */
function generateMainMenu(config = {}) {
  const {
    ownerName = 'XTECH_KE',
    prefix = '.',
    host = 'Panel',
    mode = 'Public',
    version = '6.0.0',
    speed = 0,
    memoryUsed = 0,
    memoryTotal = 0,
    ramPercentage = 0
  } = config;

  const totalPlugins = getTotalCommands();
  const memUsed = formatBytes(memoryUsed || process.memoryUsage().rss);
  const memTotal = formatBytes(memoryTotal || os.totalmem());
  const ramPct = ramPercentage || Math.round((process.memoryUsage().rss / os.totalmem()) * 100);
  const ramBar = progressBar(ramPct);
  const speedMs = speed ? speed.toFixed(4) : '0.0000';

  const menu = [
    '┏▣ ◈ *XTECH_KE* ◈',
    `┃ *${smallCaps('owner')}* : ${ownerName}`,
    `┃ *${smallCaps('prefix')}* : [ ${prefix} ]`,
    `┃ *${smallCaps('host')}* : ${host}`,
    `┃ *${smallCaps('plugins')}* : ${totalPlugins}`,
    `┃ *${smallCaps('mode')}* : ${mode}`,
    `┃ *${smallCaps('version')}* : ${version}`,
    `┃ *${smallCaps('speed')}* : ${speedMs} ms`,
    `┃ *${smallCaps('usage')}* : ${memUsed} of ${memTotal}`,
    `┃ *${smallCaps('ram')}* : [${ramBar}] ${ramPct}%`,
    '┗▣'
  ];

  return menu.join('\n');
}

/**
 * Generate a category menu section
 */
function generateCategoryMenu(category, commands) {
  const lines = [
    `┏▣ ◈ *${category} MENU* ◈`
  ];

  for (const cmd of commands) {
    lines.push(`│➽ ${cmd}`);
  }

  lines.push('┗▣');
  return lines.join('\n');
}

/**
 * Generate all menus combined
 */
function generateAllMenu(config = {}, categories = COMMAND_CATEGORIES) {
  const menuStyle = config.menuStyle || 'premium';

  // If premium style, use the new design
  if (menuStyle === 'premium') {
    return generatePremiumMenu(config);
  }

  // Original style
  const parts = [];
  parts.push(generateMainMenu(config));
  parts.push('');

  for (const [category, commands] of Object.entries(categories)) {
    parts.push(generateCategoryMenu(category, commands));
    parts.push('');
  }

  return parts.join('\n').trim();
}

/**
 * Generate a specific category menu by name
 */
function generateSpecificMenu(categoryName, config = {}) {
  const category = Object.keys(COMMAND_CATEGORIES).find(
    k => k.toLowerCase() === categoryName.toLowerCase()
  );

  if (!category) return null;

  const parts = [];
  parts.push(generateMainMenu(config));
  parts.push('');
  parts.push(generateCategoryMenu(category, COMMAND_CATEGORIES[category]));

  return parts.join('\n').trim();
}

/**
 * Get category names list
 */
function getCategoryNames() {
  return Object.keys(COMMAND_CATEGORIES);
}

/**
 * Find which category a command belongs to
 */
function findCommandCategory(command) {
  const cmd = command.toLowerCase();
  for (const [category, commands] of Object.entries(COMMAND_CATEGORIES)) {
    if (commands.includes(cmd)) return category;
  }
  return null;
}

/**
 * Check if a command exists
 */
function commandExists(command) {
  return findCommandCategory(command) !== null;
}

/**
 * Get commands for a specific category
 */
function getCategoryCommands(category) {
  const cat = Object.keys(COMMAND_CATEGORIES).find(
    k => k.toLowerCase() === category.toLowerCase()
  );
  return cat ? COMMAND_CATEGORIES[cat] : null;
}

/**
 * Generate the compact menu
 */
function generateCompactMenu(config = {}) {
  const parts = [];

  parts.push(generateMainMenu(config));
  parts.push('');
  parts.push('┏▣ ◈ *COMMANDS* ◈');

  for (const [category, commands] of Object.entries(COMMAND_CATEGORIES)) {
    parts.push(`┃ *${category}*: ${commands.length} commands`);
  }

  parts.push('┗▣');
  return parts.join('\n');
}

module.exports = {
  COMMAND_CATEGORIES,
  CATEGORY_DISPLAY,
  getTotalCommands,
  getCommandList,
  generateMainMenu,
  generatePremiumMenu,
  generateCategoryMenu,
  generateAllMenu,
  generateSpecificMenu,
  getCategoryNames,
  findCommandCategory,
  commandExists,
  getCategoryCommands,
  generateCompactMenu
};
