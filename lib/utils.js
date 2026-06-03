const axios = require('axios');
const crypto = require('crypto');
const { generateWAMessageFromContent } = require('../mrxd-baileys');

/**
 * Parse a message to extract command and arguments
 * @param {string} text - Message text
 * @param {string} prefix - Bot command prefix
 * @returns {object|null} { command, args, text: remainingText } or null if not a command
 */
function parseMessage(text, prefix) {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();
  if (!trimmed.startsWith(prefix)) return null;

  const withoutPrefix = trimmed.slice(prefix.length).trim();
  if (!withoutPrefix) return null;

  const parts = withoutPrefix.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  const remainingText = args.join(' ');

  return { command, args, text: remainingText };
}

/**
 * Check if text contains a URL
 * @param {string} text - Text to check
 * @returns {boolean}
 */
function isUrl(text) {
  if (!text) return false;
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  return urlRegex.test(text);
}

/**
 * Extract URLs from text
 * @param {string} text - Text to extract URLs from
 * @returns {string[]}
 */
function extractUrls(text) {
  if (!text) return [];
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  return text.match(urlRegex) || [];
}

/**
 * Fetch URL and return buffer
 * @param {string} url - URL to fetch
 * @param {object} [options={}] - Axios request options
 * @returns {Promise<Buffer>}
 */
async function getBuffer(url, options = {}) {
  try {
    const response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers
      },
      ...options
    });
    return Buffer.from(response.data);
  } catch (err) {
    throw new Error(`Failed to fetch buffer from ${url}: ${err.message}`);
  }
}

/**
 * Get group admins from participants list
 * @param {object[]} participants - Group participants array
 * @returns {string[]} Array of admin JIDs
 */
function getGroupAdmins(participants) {
  if (!participants || !Array.isArray(participants)) return [];
  return participants
    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    .map(p => p.id);
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Bytes to format
 * @param {number} [decimals=2] - Decimal places
 * @returns {string}
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format seconds to human readable time string
 * @param {number} seconds - Seconds to format
 * @returns {string}
 */
function runtime(seconds) {
  seconds = Number(seconds);
  if (isNaN(seconds) || seconds < 0) return '0s';

  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);

  return parts.join(' ');
}

/**
 * Generate a session ID with prefix
 * @param {string} [prefix='XTECH-KE'] - Prefix for session ID
 * @returns {string}
 */
function generateSessionId(prefix = 'XTECH-KE') {
  const id = crypto.randomBytes(16).toString('hex');
  return `${prefix}:${id}`;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random filename with optional extension
 * @param {string} [ext=''] - File extension
 * @returns {string}
 */
function getRandom(ext = '') {
  const id = crypto.randomBytes(8).toString('hex');
  return ext ? `${id}.${ext}` : id;
}

/**
 * Check if a user is an admin in a group
 * @param {string} jid - User JID
 * @param {object} groupMetadata - Group metadata object
 * @returns {boolean}
 */
function isAdmin(jid, groupMetadata) {
  if (!groupMetadata || !groupMetadata.participants) return false;
  const participant = groupMetadata.participants.find(
    p => p.id === jid || p.id === jid.replace(/:\d+/, '')
  );
  return participant ? (participant.admin === 'admin' || participant.admin === 'superadmin') : false;
}

/**
 * Check if the bot is an admin in the group
 * @param {object} groupMetadata - Group metadata object
 * @param {string} botJid - Bot's JID
 * @returns {boolean}
 */
function isBotAdmin(groupMetadata, botJid) {
  if (!groupMetadata || !groupMetadata.participants || !botJid) return false;
  return isAdmin(botJid, groupMetadata);
}

/**
 * Parse JID to get the phone number
 * @param {string} jid - WhatsApp JID
 * @returns {string}
 */
function jidToNumber(jid) {
  if (!jid) return '';
  return jid.split('@')[0].split(':')[0];
}

/**
 * Check if JID is a group
 * @param {string} jid - JID to check
 * @returns {boolean}
 */
function isGroup(jid) {
  return jid ? jid.endsWith('@g.us') : false;
}

/**
 * Check if JID is a broadcast
 * @param {string} jid - JID to check
 * @returns {boolean}
 */
function isBroadcast(jid) {
  return jid ? jid.endsWith('@broadcast') : false;
}

/**
 * Get the JID for a phone number
 * @param {string} number - Phone number
 * @returns {string}
 */
function numberToJid(number) {
  if (!number) return '';
  const cleaned = number.replace(/[^0-9]/g, '');
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Convert text to small caps (for styling)
 * @param {string} text - Text to convert
 * @returns {string}
 */
function smallCaps(text) {
  const smallCapsMap = {
    'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ',
    'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ',
    'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ',
    's': 'ꜱ', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x',
    'y': 'ʏ', 'z': 'ᴢ'
  };
  return text.split('').map(c => smallCapsMap[c.toLowerCase()] || c).join('');
}

/**
 * Generate a progress bar
 * @param {number} percentage - Percentage (0-100)
 * @param {number} [length=10] - Bar length in characters
 * @returns {string}
 */
function progressBar(percentage, length = 10) {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Get file extension from MIME type
 * @param {string} mime - MIME type
 * @returns {string}
 */
function mimeToExt(mime) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'application/octet-stream': 'bin'
  };
  return map[mime] || 'bin';
}

/**
 * Escape regex special characters
 * @param {string} str - String to escape
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} [maxLen=500] - Maximum length
 * @returns {string}
 */
function truncate(text, maxLen = 500) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

/**
 * Pick a random element from an array
 * @param {Array} arr - Array to pick from
 * @returns {*}
 */
function randomPick(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Measure execution time of a function
 * @param {Function} fn - Async function to measure
 * @returns {Promise<{result: *, time: number}>}
 */
async function measureTime(fn) {
  const start = performance.now();
  const result = await fn();
  const time = performance.now() - start;
  return { result, time };
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string}
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get system uptime in a formatted string
 * @returns {string}
 */
function getUptime() {
  return runtime(process.uptime());
}

/**
 * Get memory usage information
 * @returns {object}
 */
function getMemoryInfo() {
  const used = process.memoryUsage();
  return {
    rss: formatBytes(used.rss),
    heapTotal: formatBytes(used.heapTotal),
    heapUsed: formatBytes(used.heapUsed),
    external: formatBytes(used.external),
    arrayBuffers: formatBytes(used.arrayBuffers),
    rssBytes: used.rss,
    heapTotalBytes: used.heapTotal,
    heapUsedBytes: used.heapUsed
  };
}

module.exports = {
  parseMessage,
  isUrl,
  extractUrls,
  getBuffer,
  getGroupAdmins,
  formatBytes,
  runtime,
  generateSessionId,
  sleep,
  getRandom,
  isAdmin,
  isBotAdmin,
  jidToNumber,
  isGroup,
  isBroadcast,
  numberToJid,
  smallCaps,
  progressBar,
  mimeToExt,
  escapeRegex,
  truncate,
  randomPick,
  measureTime,
  formatNumber,
  getUptime,
  getMemoryInfo
};
