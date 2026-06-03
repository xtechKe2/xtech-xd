const NodeCache = require('node-cache');

// Message cache with 30 minute TTL, check period every 60 seconds
const messageCache = new NodeCache({
  stdTTL: 30 * 60,
  checkperiod: 60,
  useClones: false
});

// Group metadata cache
const groupCache = new NodeCache({
  stdTTL: 10 * 60,
  checkperiod: 120,
  useClones: false
});

// Presence cache
const presenceCache = new NodeCache({
  stdTTL: 5 * 60,
  checkperiod: 60,
  useClones: false
});

let sock = null;

/**
 * Bind the store to a WhatsApp socket
 * @param {object} socket - The Baileys socket instance
 */
function bind(socket) {
  sock = socket;

  // Listen for new messages and cache them
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (msg.key && msg.key.id) {
        storeMessage(msg.key.remoteJid, msg);
      }
    }
  });

  // Listen for message deletions
  sock.ev.on('messages.delete', ({ keys }) => {
    for (const key of keys) {
      if (key.id) {
        deleteMessage(key.remoteJid, key.id);
      }
    }
  });

  // Cache group metadata updates
  sock.ev.on('chats.update', (chats) => {
    for (const chat of chats) {
      if (chat.id && chat.id.endsWith('@g.us')) {
        groupCache.set(chat.id, chat);
      }
    }
  });
}

/**
 * Store a message in the cache
 * @param {string} jid - The chat JID
 * @param {object} message - The message object
 */
function storeMessage(jid, message) {
  if (!message.key || !message.key.id) return;

  const cacheKey = `${jid}:${message.key.id}`;
  messageCache.set(cacheKey, message);

  // Also store by just the message ID for quick lookups
  messageCache.set(message.key.id, message);
}

/**
 * Get a cached message
 * @param {string} jid - The chat JID
 * @param {string} id - The message ID
 * @returns {object|null}
 */
function getMessage(jid, id) {
  // Try with JID prefix first
  let msg = messageCache.get(`${jid}:${id}`);
  if (!msg) {
    // Try without JID prefix
    msg = messageCache.get(id);
  }
  return msg || null;
}

/**
 * Delete a message from the cache
 * @param {string} jid - The chat JID
 * @param {string} id - The message ID
 */
function deleteMessage(jid, id) {
  messageCache.del(`${jid}:${id}`);
  messageCache.del(id);
}

/**
 * Get all cached messages for a JID
 * @param {string} jid - The chat JID
 * @returns {object[]}
 */
function getMessagesByJID(jid) {
  const messages = [];
  const keys = messageCache.keys();
  for (const key of keys) {
    if (key.startsWith(`${jid}:`)) {
      const msg = messageCache.get(key);
      if (msg) messages.push(msg);
    }
  }
  return messages;
}

/**
 * Store group metadata in cache
 * @param {string} jid - Group JID
 * @param {object} metadata - Group metadata
 */
function storeGroupMetadata(jid, metadata) {
  groupCache.set(jid, metadata);
}

/**
 * Get cached group metadata
 * @param {string} jid - Group JID
 * @returns {object|null}
 */
function getGroupMetadata(jid) {
  return groupCache.get(jid) || null;
}

/**
 * Fetch group metadata (from cache or API)
 * @param {string} jid - Group JID
 * @returns {Promise<object|null>}
 */
async function fetchGroupMetadata(jid) {
  const cached = getGroupMetadata(jid);
  if (cached) return cached;

  if (sock) {
    try {
      const metadata = await sock.groupMetadata(jid);
      storeGroupMetadata(jid, metadata);
      return metadata;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Store presence info
 * @param {string} jid - User JID
 * @param {string} presence - Presence type
 */
function storePresence(jid, presence) {
  presenceCache.set(jid, presence);
}

/**
 * Get presence info
 * @param {string} jid - User JID
 * @returns {string|null}
 */
function getPresence(jid) {
  return presenceCache.get(jid) || null;
}

/**
 * Clear all caches
 */
function clearAll() {
  messageCache.flushAll();
  groupCache.flushAll();
  presenceCache.flushAll();
}

/**
 * Get cache statistics
 * @returns {object}
 */
function getStats() {
  return {
    messages: messageCache.getStats(),
    groups: groupCache.getStats(),
    presence: presenceCache.getStats(),
    messageCount: messageCache.keys().length,
    groupCount: groupCache.keys().length
  };
}

module.exports = {
  bind,
  storeMessage,
  getMessage,
  deleteMessage,
  getMessagesByJID,
  storeGroupMetadata,
  getGroupMetadata,
  fetchGroupMetadata,
  storePresence,
  getPresence,
  clearAll,
  getStats
};
