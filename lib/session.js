const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SESSION_PREFIX = 'xtech-md2026';
const OLD_SESSION_PREFIX = 'XTECH-KE';
const AUTH_DIR = path.join(__dirname, '..', 'auth');

/**
 * Detect which session format is being used
 * @param {string} sessionId - The session ID
 * @returns {'new'|'old'|null} Format type or null if invalid
 */
function detectFormat(sessionId) {
  if (!sessionId) return null;
  if (sessionId.startsWith(SESSION_PREFIX + ';')) return 'new';
  if (sessionId.startsWith(OLD_SESSION_PREFIX + ':')) return 'old';
  return null;
}

/**
 * Create a new session entry
 * @param {string} sessionId - The session ID
 * @param {object} sock - The WhatsApp socket instance
 * @returns {object} Session info
 */
function createSession(sessionId, sock) {
  const format = detectFormat(sessionId);
  if (!format) {
    throw new Error(`Invalid session ID. Must start with "${SESSION_PREFIX};" or "${OLD_SESSION_PREFIX}:"`);
  }
  
  let sessionName;
  if (format === 'new') {
    sessionName = sessionId.slice(SESSION_PREFIX.length + 1); // after semicolon
  } else {
    sessionName = sessionId.slice(OLD_SESSION_PREFIX.length + 1); // after colon
  }
  
  // Use a fixed 'default' directory for the main session
  const sessionDir = path.join(AUTH_DIR, 'default');
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  return {
    id: sessionId,
    dir: sessionDir,
    sock: sock,
    createdAt: Date.now()
  };
}

/**
 * Check if a session exists (creds.json must be present)
 * @param {string} sessionId - The session ID
 * @returns {boolean}
 */
function sessionExists(sessionId) {
  if (!sessionId) return false;
  const authPath = getAuthPath(sessionId);
  const credsPath = path.join(authPath, 'creds.json');
  return fs.existsSync(credsPath);
}

/**
 * Save session data to disk
 * @param {string} sessionId - The session ID
 * @param {object} data - Session data to save
 */
function saveSession(sessionId, data) {
  const sessionDir = path.join(AUTH_DIR, 'default');
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  const dataPath = path.join(sessionDir, 'session_data.json');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

/**
 * Read session data from disk
 * @param {string} sessionId - The session ID
 * @returns {object|null}
 */
function readSession(sessionId) {
  const sessionDir = path.join(AUTH_DIR, 'default');
  const dataPath = path.join(sessionDir, 'session_data.json');
  if (!fs.existsSync(dataPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Delete a session from disk
 * @param {string} sessionId - The session ID
 */
function deleteSession(sessionId) {
  const sessionDir = path.join(AUTH_DIR, 'default');
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }
}

/**
 * Encode auth folder to session ID string
 * Reads all files in the auth directory and encodes with xtech-md2026; prefix
 * Format: xtech-md2026;base64(gzip(JSON of all files))
 * @param {string} sessionPath - Path to the auth/session directory
 * @returns {string} Session ID in format "xtech-md2026;base64data"
 */
function encodeSession(sessionPath) {
  if (!fs.existsSync(sessionPath)) {
    throw new Error('Session path does not exist');
  }

  const files = {};
  const allFiles = fs.readdirSync(sessionPath);
  for (const file of allFiles) {
    const filePath = path.join(sessionPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const content = fs.readFileSync(filePath);
      files[file] = content.toString('base64');
    }
  }

  const jsonStr = JSON.stringify(files);
  const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'));
  const base64 = compressed.toString('base64');
  return `${SESSION_PREFIX};${base64}`;
}

/**
 * Decode session ID to auth folder
 * Supports multiple formats:
 * - "xtech-md2026;base64data" — tries gzip+base64 JSON first, then plain base64 creds.json
 * - "XTECH-KE:base64data" — tries gzip+base64 JSON first, then plain JSON
 *
 * The pair bot (v6.0+) generates gzip+base64 JSON of ALL auth files.
 * Older pair bots may generate plain base64 of creds.json only.
 *
 * @param {string} sessionId - Session ID
 * @param {string} sessionPath - Path to write auth files to
 * @returns {boolean} Success status
 */
function decodeSession(sessionId, sessionPath) {
  if (!sessionId) {
    throw new Error('No session ID provided');
  }

  const format = detectFormat(sessionId);

  if (format === 'new') {
    // xtech-md2026; format
    const base64Data = sessionId.slice(SESSION_PREFIX.length + 1); // skip "xtech-md2026;"
    if (!base64Data) {
      throw new Error('No session data found in session ID');
    }

    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Strategy 1: Try gzip+base64 JSON of all files (pair bot v6.0+ format)
    try {
      const compressed = Buffer.from(base64Data, 'base64');
      const jsonStr = zlib.gunzipSync(compressed).toString('utf-8');
      const files = JSON.parse(jsonStr);

      // Validate: should be an object with filename -> base64 content
      if (typeof files === 'object' && !Buffer.isBuffer(files)) {
        let fileCount = 0;
        for (const [fileName, fileContent] of Object.entries(files)) {
          // Skip non-file entries and validate content
          if (typeof fileContent !== 'string') continue;
          const filePath = path.join(sessionPath, fileName);
          // Security: prevent path traversal
          const resolved = path.resolve(filePath);
          if (!resolved.startsWith(path.resolve(sessionPath))) continue;
          try {
            const content = Buffer.from(fileContent, 'base64');
            fs.writeFileSync(filePath, content);
            fileCount++;
          } catch(e) {
            console.error(`[SESSION] Failed to write ${fileName}:`, e.message);
          }
        }

        if (fileCount > 0) {
          console.log(`[SESSION] Decoded ${fileCount} auth files from gzip+base64 format`);
          // Verify creds.json was written
          if (fs.existsSync(path.join(sessionPath, 'creds.json'))) {
            return true;
          }
        }
      }
    } catch(err) {
      console.log('[SESSION] Gzip decode failed, trying deflate...', err.message);
    }

    // Strategy 1b: Try deflate+base64 of creds.json only (compact format from old pair bot)
    try {
      const compressed = Buffer.from(base64Data, 'base64');
      const jsonStr = zlib.inflateSync(compressed).toString('utf-8');
      const credsJson = JSON.parse(jsonStr);

      if (credsJson && typeof credsJson === 'object') {
        const credsPath = path.join(sessionPath, 'creds.json');
        fs.writeFileSync(credsPath, jsonStr);
        console.log('[SESSION] Decoded creds.json from deflate+base64 (compact) format');
        console.log('[SESSION] WARNING: Only creds.json decoded — signal keys missing');
        console.log('[SESSION] For full functionality, re-pair with updated pairing bot');
        return true;
      }
    } catch(err1b) {
      console.log('[SESSION] Deflate decode failed, trying plain base64...', err1b.message);
    }

    // Strategy 2: Try plain base64 of creds.json only (older pair bot format)
    try {
      const credsContent = Buffer.from(base64Data, 'base64');
      const credsStr = credsContent.toString('utf-8');
      const credsJson = JSON.parse(credsStr);

      // Validate it's actually a creds.json (should have certain fields)
      if (credsJson && typeof credsJson === 'object') {
        const credsPath = path.join(sessionPath, 'creds.json');
        fs.writeFileSync(credsPath, credsStr);
        console.log('[SESSION] Decoded creds.json from plain base64 format');
        return true;
      }
    } catch(err2) {
      // Strategy 3: Maybe it's raw base64 of JSON without creds wrapper
      try {
        const rawContent = Buffer.from(base64Data, 'base64').toString('utf-8');
        const parsed = JSON.parse(rawContent);
        if (typeof parsed === 'object') {
          const credsPath = path.join(sessionPath, 'creds.json');
          fs.writeFileSync(credsPath, JSON.stringify(parsed, null, 2));
          console.log('[SESSION] Decoded raw JSON from base64 format');
          return true;
        }
      } catch(err3) {
        throw new Error(`Failed to decode session (new format): ${err2.message}`);
      }
    }
  }

  if (format === 'old') {
    // XTECH-KE: format: data after colon
    const base64Data = sessionId.slice(OLD_SESSION_PREFIX.length + 1); // skip "XTECH-KE:"
    if (!base64Data) {
      throw new Error('No session data found in session ID');
    }

    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Strategy 1: gzip+base64 JSON of all files
    try {
      const compressed = Buffer.from(base64Data, 'base64');
      const jsonStr = zlib.gunzipSync(compressed).toString('utf-8');
      const files = JSON.parse(jsonStr);

      let fileCount = 0;
      for (const [fileName, fileContent] of Object.entries(files)) {
        if (typeof fileContent !== 'string') continue;
        const filePath = path.join(sessionPath, fileName);
        const resolved = path.resolve(filePath);
        if (!resolved.startsWith(path.resolve(sessionPath))) continue;
        try {
          const content = Buffer.from(fileContent, 'base64');
          fs.writeFileSync(filePath, content);
          fileCount++;
        } catch(e) {}
      }

      if (fileCount > 0) {
        console.log(`[SESSION] Decoded ${fileCount} auth files from old gzip format`);
        return true;
      }
    } catch (err) {
      console.log('[SESSION] Old gzip decode failed, trying alternatives...');
    }

    // Strategy 2: Try without gzip decompression
    try {
      const raw = Buffer.from(base64Data, 'base64').toString('utf-8');
      const files = JSON.parse(raw);

      let fileCount = 0;
      for (const [fileName, fileContent] of Object.entries(files)) {
        if (typeof fileContent !== 'string') continue;
        const filePath = path.join(sessionPath, fileName);
        try {
          const content = Buffer.from(fileContent, 'base64');
          fs.writeFileSync(filePath, content);
          fileCount++;
        } catch(e) {}
      }

      if (fileCount > 0) {
        console.log(`[SESSION] Decoded ${fileCount} auth files from old raw format`);
        return true;
      }
    } catch (err2) {
      throw new Error(`Failed to decode session (old format): ${err2.message}`);
    }
  }

  throw new Error(`Invalid session ID. Must start with "${SESSION_PREFIX};" or "${OLD_SESSION_PREFIX}:"`);
}

/**
 * Generate a new session ID with prefix
 * @param {string} [prefix=SESSION_PREFIX] - The prefix to use
 * @returns {string} Generated session ID
 */
function generateSessionId(prefix = SESSION_PREFIX) {
  const crypto = require('crypto');
  const id = crypto.randomBytes(16).toString('hex');
  return `${prefix};${id}`;
}

/**
 * Get the auth directory path for a session
 * Always returns the 'default' auth directory since we use a single session
 * @param {string} sessionId - The session ID (unused, kept for API compat)
 * @returns {string} Path to auth directory
 */
function getAuthPath(sessionId) {
  return path.join(AUTH_DIR, 'default');
}

/**
 * List all sessions
 * @returns {string[]} Array of session IDs
 */
function listSessions() {
  if (!fs.existsSync(AUTH_DIR)) return [];
  const dirs = fs.readdirSync(AUTH_DIR, { withFileTypes: true });
  return dirs
    .filter(d => d.isDirectory())
    .filter(d => fs.existsSync(path.join(AUTH_DIR, d.name, 'creds.json')))
    .map(d => `${SESSION_PREFIX};${d.name}`);
}

module.exports = {
  createSession,
  sessionExists,
  saveSession,
  readSession,
  deleteSession,
  encodeSession,
  decodeSession,
  generateSessionId,
  getAuthPath,
  listSessions,
  SESSION_PREFIX
};
