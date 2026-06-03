const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_PATH = path.join(DB_DIR, 'xtech_ke.json');

let data = null;

/**
 * Default settings values
 */
const DEFAULT_SETTINGS = {
  'prefix': '.',
  'mode': 'public',
  'owner': '255712345678',
  'owner_name': 'XTECH_KE',
  'bot_name': 'XTECH_KE',
  'timezone': 'Africa/Nairobi',
  'sticker_author': 'XTECH_KE',
  'sticker_packname': 'XTECH_KE',
  'menu_image': '',
  'menu_style': 'normal',
  'font': 'default',
  'warn_limit': '3',
  'autobio': 'false',
  'autoread': 'false',
  'alwaysonline': 'false',
  'autotype': 'false',
  'autorecord': 'false',
  'autoreact': 'false',
  'anticall': 'false',
  'antidelete': 'false',
  'antiedit': 'false',
  'antiviewonce': 'false',
  'antibug': 'false',
  'autoblock': 'false',
  'chatbot': 'false',
  'autorecordtyping': 'false',
  'autoread_status': 'false',
  'autoreact_status': 'false',
  'autosave_status': 'false',
  'anticall_msg': 'Calls are not allowed by the bot owner!',
  'welcome': 'Welcome @user to @group!',
  'goodbye': 'Goodbye @user from @group!',
  'watermark': 'XTECH_KE',
  'context_link': '',
  'status_emoji': '🔥',
  'status_delay': '0',
  'country_codes': '255,254,256',
  'version': '1.9.4'
};

/**
 * Create the default data structure
 * @returns {object}
 */
function createDefaultData() {
  return {
    settings: { ...DEFAULT_SETTINGS },
    sudo: [],
    banned: [],
    warnings: {},
    group_settings: {},
    chats: {}
  };
}

/**
 * Atomic write - write to temp file then rename
 * @param {string} filePath - Target file path
 * @param {string} content - Content to write
 */
function atomicWrite(filePath, content) {
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/**
 * Save data to disk (atomic write)
 */
function saveData() {
  if (!data) return;
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  try {
    atomicWrite(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[DB] Failed to save data:', err.message);
  }
}

/**
 * Initialize the database - load from JSON file or create default
 * @returns {object} The data object
 */
function initDB() {
  if (data) return data;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      data = JSON.parse(raw);
      // Ensure all sections exist
      if (!data.settings) data.settings = {};
      if (!data.sudo) data.sudo = [];
      if (!data.banned) data.banned = [];
      if (!data.warnings) data.warnings = {};
      if (!data.group_settings) data.group_settings = {};
      if (!data.chats) data.chats = {};
    } catch (err) {
      console.error('[DB] Failed to parse database, creating new one:', err.message);
      data = createDefaultData();
      saveData();
    }
  } else {
    data = createDefaultData();
    saveData();
  }

  // Insert default settings if they don't exist
  let needsSave = false;
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (data.settings[key] === undefined) {
      data.settings[key] = value;
      needsSave = true;
    }
  }
  if (needsSave) saveData();

  return data;
}

/**
 * Get the data instance (initialize if needed)
 * @returns {object}
 */
function getDB() {
  if (!data) return initDB();
  return data;
}

// ========================
// Settings Functions
// ========================

/**
 * Get a setting value
 * @param {string} key - Setting key
 * @param {string} [defaultValue] - Default value if not found
 * @returns {string|null}
 */
function getSetting(key, defaultValue = null) {
  const db = getDB();
  return db.settings[key] !== undefined ? db.settings[key] : defaultValue;
}

/**
 * Set a setting value
 * @param {string} key - Setting key
 * @param {string} value - Setting value
 */
function setSetting(key, value) {
  const db = getDB();
  db.settings[key] = value;
  saveData();
}

/**
 * Delete a setting
 * @param {string} key - Setting key
 */
function delSetting(key) {
  const db = getDB();
  delete db.settings[key];
  saveData();
}

/**
 * Get all settings
 * @returns {object}
 */
function getAllSettings() {
  const db = getDB();
  return { ...db.settings };
}

// ========================
// Sudo Functions
// ========================

/**
 * Get all sudo users
 * @returns {string[]}
 */
function getSudo() {
  const db = getDB();
  return [...db.sudo];
}

/**
 * Add a sudo user
 * @param {string} jid - User JID
 */
function addSudo(jid) {
  const db = getDB();
  if (!db.sudo.includes(jid)) {
    db.sudo.push(jid);
    saveData();
  }
}

/**
 * Remove a sudo user
 * @param {string} jid - User JID
 */
function delSudo(jid) {
  const db = getDB();
  db.sudo = db.sudo.filter(j => j !== jid);
  saveData();
}

/**
 * Check if user is sudo
 * @param {string} jid - User JID
 * @returns {boolean}
 */
function isSudo(jid) {
  const db = getDB();
  return db.sudo.includes(jid);
}

// ========================
// Banned Functions
// ========================

/**
 * Get all banned users
 * @returns {string[]}
 */
function getBanned() {
  const db = getDB();
  return [...db.banned];
}

/**
 * Add a banned user
 * @param {string} jid - User JID
 */
function addBanned(jid) {
  const db = getDB();
  if (!db.banned.includes(jid)) {
    db.banned.push(jid);
    saveData();
  }
}

/**
 * Remove a banned user
 * @param {string} jid - User JID
 */
function delBanned(jid) {
  const db = getDB();
  db.banned = db.banned.filter(j => j !== jid);
  saveData();
}

/**
 * Check if user is banned
 * @param {string} jid - User JID
 * @returns {boolean}
 */
function isBanned(jid) {
  const db = getDB();
  return db.banned.includes(jid);
}

// ========================
// Warning Functions
// ========================

/**
 * Get warning count for a user
 * @param {string} jid - User JID
 * @returns {number}
 */
function getWarning(jid) {
  const db = getDB();
  return db.warnings[jid] || 0;
}

/**
 * Add a warning to a user
 * @param {string} jid - User JID
 * @returns {number} New warning count
 */
function addWarning(jid) {
  const db = getDB();
  const newCount = (db.warnings[jid] || 0) + 1;
  db.warnings[jid] = newCount;
  saveData();
  return newCount;
}

/**
 * Reset warnings for a user
 * @param {string} jid - User JID
 */
function resetWarning(jid) {
  const db = getDB();
  delete db.warnings[jid];
  saveData();
}

/**
 * Get all warnings
 * @returns {object[]}
 */
function getAllWarnings() {
  const db = getDB();
  return Object.entries(db.warnings).map(([jid, count]) => ({ jid, count }));
}

// ========================
// Group Settings Functions
// ========================

/**
 * Get a group setting
 * @param {string} jid - Group JID
 * @param {string} key - Setting key
 * @param {string} [defaultValue] - Default value
 * @returns {string|null}
 */
function getGroupSetting(jid, key, defaultValue = null) {
  const db = getDB();
  const groupKey = `${jid}::${key}`;
  return db.group_settings[groupKey] !== undefined ? db.group_settings[groupKey] : defaultValue;
}

/**
 * Set a group setting
 * @param {string} jid - Group JID
 * @param {string} key - Setting key
 * @param {string} value - Setting value
 */
function setGroupSetting(jid, key, value) {
  const db = getDB();
  const groupKey = `${jid}::${key}`;
  db.group_settings[groupKey] = value;
  saveData();
}

/**
 * Delete a group setting
 * @param {string} jid - Group JID
 * @param {string} key - Setting key
 */
function delGroupSetting(jid, key) {
  const db = getDB();
  const groupKey = `${jid}::${key}`;
  delete db.group_settings[groupKey];
  saveData();
}

/**
 * Get all settings for a group
 * @param {string} jid - Group JID
 * @returns {object}
 */
function getAllGroupSettings(jid) {
  const db = getDB();
  const settings = {};
  const prefix = `${jid}::`;
  for (const [key, value] of Object.entries(db.group_settings)) {
    if (key.startsWith(prefix)) {
      const settingKey = key.slice(prefix.length);
      settings[settingKey] = value;
    }
  }
  return settings;
}

// ========================
// Chat Functions
// ========================

/**
 * Save a chat entry
 * @param {string} jid - Chat JID
 * @param {string} name - Chat name
 * @param {string} lastMessage - Last message text
 */
function saveChat(jid, name, lastMessage) {
  const db = getDB();
  db.chats[jid] = { jid, name, last_message: lastMessage };
  saveData();
}

/**
 * Get a chat entry
 * @param {string} jid - Chat JID
 * @returns {object|null}
 */
function getChat(jid) {
  const db = getDB();
  return db.chats[jid] || null;
}

/**
 * Get all chats
 * @returns {object[]}
 */
function getAllChats() {
  const db = getDB();
  return Object.values(db.chats);
}

/**
 * Delete a chat entry
 * @param {string} jid - Chat JID
 */
function deleteChat(jid) {
  const db = getDB();
  delete db.chats[jid];
  saveData();
}

// ========================
// Badword Functions
// ========================

/**
 * Get badwords list
 * @returns {string[]}
 */
function getBadwords() {
  const val = getSetting('badwords', '[]');
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

/**
 * Add a badword
 * @param {string} word - Bad word to add
 * @returns {string[]}
 */
function addBadword(word) {
  const words = getBadwords();
  if (!words.includes(word.toLowerCase())) {
    words.push(word.toLowerCase());
    setSetting('badwords', JSON.stringify(words));
  }
  return words;
}

/**
 * Delete a badword
 * @param {string} word - Bad word to remove
 * @returns {string[]}
 */
function delBadword(word) {
  let words = getBadwords();
  words = words.filter(w => w !== word.toLowerCase());
  setSetting('badwords', JSON.stringify(words));
  return words;
}

// ========================
// Ignore List Functions
// ========================

/**
 * Get ignore list
 * @returns {string[]}
 */
function getIgnoreList() {
  const val = getSetting('ignore_list', '[]');
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

/**
 * Add to ignore list
 * @param {string} jid - JID to ignore
 */
function addIgnoreList(jid) {
  const list = getIgnoreList();
  if (!list.includes(jid)) {
    list.push(jid);
    setSetting('ignore_list', JSON.stringify(list));
  }
}

/**
 * Remove from ignore list
 * @param {string} jid - JID to remove
 */
function delIgnoreList(jid) {
  const list = getIgnoreList().filter(j => j !== jid);
  setSetting('ignore_list', JSON.stringify(list));
}

// ========================
// Country Code Functions
// ========================

/**
 * Get country codes
 * @returns {string[]}
 */
function getCountryCodes() {
  const val = getSetting('country_codes', '255,254,256');
  return val.split(',').map(c => c.trim()).filter(Boolean);
}

/**
 * Add a country code
 * @param {string} code - Country code
 */
function addCountryCode(code) {
  const codes = getCountryCodes();
  if (!codes.includes(code)) {
    codes.push(code);
    setSetting('country_codes', codes.join(','));
  }
}

/**
 * Delete a country code
 * @param {string} code - Country code
 */
function delCountryCode(code) {
  const codes = getCountryCodes().filter(c => c !== code);
  setSetting('country_codes', codes.join(','));
}

// ========================
// Sticker Command Functions
// ========================

/**
 * Get sticker commands
 * @returns {object}
 */
function getStickerCmds() {
  const val = getSetting('sticker_cmds', '{}');
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

/**
 * Set a sticker command
 * @param {string} cmd - Command name
 * @param {string} url - Image/sticker URL
 */
function setStickerCmd(cmd, url) {
  const cmds = getStickerCmds();
  cmds[cmd] = url;
  setSetting('sticker_cmds', JSON.stringify(cmds));
}

/**
 * Delete a sticker command
 * @param {string} cmd - Command name
 */
function delStickerCmd(cmd) {
  const cmds = getStickerCmds();
  delete cmds[cmd];
  setSetting('sticker_cmds', JSON.stringify(cmds));
}

/**
 * Close the database connection (no-op for JSON storage)
 */
function closeDB() {
  if (data) {
    saveData();
    data = null;
  }
}

module.exports = {
  initDB,
  getDB,
  closeDB,
  // Settings
  getSetting,
  setSetting,
  delSetting,
  getAllSettings,
  // Sudo
  getSudo,
  addSudo,
  delSudo,
  isSudo,
  // Banned
  getBanned,
  addBanned,
  delBanned,
  isBanned,
  // Warnings
  getWarning,
  addWarning,
  resetWarning,
  getAllWarnings,
  // Group Settings
  getGroupSetting,
  setGroupSetting,
  delGroupSetting,
  getAllGroupSettings,
  // Chats
  saveChat,
  getChat,
  getAllChats,
  deleteChat,
  // Badwords
  getBadwords,
  addBadword,
  delBadword,
  // Ignore List
  getIgnoreList,
  addIgnoreList,
  delIgnoreList,
  // Country Codes
  getCountryCodes,
  addCountryCode,
  delCountryCode,
  // Sticker Commands
  getStickerCmds,
  setStickerCmd,
  delStickerCmd
};
