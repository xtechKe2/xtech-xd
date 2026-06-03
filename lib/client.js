const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, Browsers } = require('../mrxd-baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const { sessionExists, saveSession, readSession, encodeSession, decodeSession, getAuthPath, SESSION_PREFIX } = require('./session');
const { initDB, getSetting, setSetting } = require('./database');
const store = require('./store');
const { parseMessage } = require('./utils');

const OLD_SESSION_PREFIX = 'XTECH-KE';

// Silent logger - no file destination, no sonic-boom issues
const logger = P({ level: 'silent' });

// Browser fingerprints for rotation
const BROWSER_FINGERPRINTS = [
  Browsers.ubuntu('Chrome'),
  ['Chrome Linux', 'Chrome', '120.0.0.0'],
  ['MacOS', 'Safari', '17.2.1'],
  ['Windows', 'Edge', '121.0.0.0'],
  ['Windows', 'Firefox', '122.0+']
];

class WhatsAppClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sock = null;
    this.state = null;
    this.saveCreds = null;
    this.authPath = options.authPath || path.join(__dirname, '..', 'auth', 'default');
    this.prefix = options.prefix || '.';
    this.pairingCode = null;
    this.qrCode = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 50;
    this.reconnectDelay = 5000;
    this.connectionStartTime = null;
    this.isConnected = false;
    this.isShuttingDown = false;
    this.browserIndex = 0;
  }

  async connect(options = {}) {
    try {
      // Ensure auth directory exists
      if (!fs.existsSync(this.authPath)) {
        fs.mkdirSync(this.authPath, { recursive: true });
      }

      // Initialize database
      initDB();

      // Load prefix from settings
      this.prefix = getSetting('prefix', '.');

      console.log('[CLIENT] Connecting to WhatsApp...');

      // Use multi-file auth state
      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
      this.state = state;
      this.saveCreds = saveCreds;

      const isRegistered = state.creds && state.creds.registered;
      console.log(`[CLIENT] Credentials registered: ${isRegistered}`);
      if (isRegistered) {
        console.log('[CLIENT] Restoring session from saved credentials...');
      } else {
        console.log('[CLIENT] No credentials found. Waiting for pairing...');
      }

      // Get browser fingerprint
      const browser = BROWSER_FINGERPRINTS[this.browserIndex % BROWSER_FINGERPRINTS.length];
      console.log('[CLIENT] Using browser:', browser.join(' '));

      // Create the socket
      this.sock = makeWASocket({
        logger,
        printQRInTerminal: options.useQR || false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        msgRetryCounterCache: store.msgRetryCounterCache,
        browser,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        retryRequestDelayMs: 500,
        maxMsgRetryCount: 5,
        fireInitQueries: true,
        shouldIgnoreJid: (jid) => {
          return jid.includes('@broadcast');
        },
        ...options.socketOptions
      });

      // Bind store
      store.bind(this.sock);

      // Connection events
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = qr;
          this.emit('qr', qr);
          console.log('[CLIENT] QR Code received - scan or use pairing code');
        }

        if (connection === 'close') {
          this.isConnected = false;
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[CLIENT] Connection closed. Status: ${statusCode}, Reconnecting: ${shouldReconnect}`);

          if (statusCode === DisconnectReason.badSession) {
            console.log('[CLIENT] Bad session - clearing auth and reconnecting...');
            // Don't delete auth files, just reconnect
          } else if (statusCode === DisconnectReason.connectionClosed) {
            console.log('[CLIENT] Connection closed - reconnecting...');
          } else if (statusCode === DisconnectReason.connectionLost) {
            console.log('[CLIENT] Connection lost - reconnecting...');
          } else if (statusCode === DisconnectReason.connectionReplaced) {
            console.log('[CLIENT] Connection replaced - another session opened');
            this.emit('replaced');
            return; // Don't reconnect
          } else if (statusCode === DisconnectReason.loggedOut) {
            console.log('[CLIENT] Logged out - need new session');
            this.emit('logout');
            return; // Don't reconnect
          } else if (statusCode === DisconnectReason.restartRequired) {
            console.log('[CLIENT] Restart required - reconnecting...');
          } else if (statusCode === 405) {
            // Code 405 - rotate browser fingerprint
            console.log('[CLIENT] Code 405 - rotating browser fingerprint...');
            this.browserIndex++;
          }

          if (shouldReconnect && !this.isShuttingDown) {
            this.reconnectAttempts++;
            if (this.reconnectAttempts <= this.maxReconnectAttempts) {
              const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000);
              console.log(`[CLIENT] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
              setTimeout(() => this.connect(options), delay);
            } else {
              console.log('[CLIENT] Max reconnect attempts reached. Giving up.');
              this.emit('maxReconnect');
            }
          }
        } else if (connection === 'open') {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.connectionStartTime = Date.now();
          const botJid = this.sock.user?.id;
          console.log('[CLIENT] Connected! Bot JID:', botJid);
          this.emit('open', { jid: botJid });
        }
      });

      // Save credentials on update
      this.sock.ev.on('creds.update', () => {
        if (this.saveCreds) {
          this.saveCreds();
        }
      });

      // Handle incoming messages
      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          try {
            // Skip messages from self
            if (msg.key.fromMe) continue;

            // Skip status messages
            if (msg.key.remoteJid === 'status@broadcast') continue;

            this.emit('message', msg);
          } catch (err) {
            console.error('[CLIENT] Error processing message:', err.message);
          }
        }
      });

      // Group updates
      this.sock.ev.on('groups.update', (updates) => {
        this.emit('groups.update', updates);
      });

      // Presence updates
      this.sock.ev.on('presence.update', (update) => {
        this.emit('presence.update', update);
      });

      return this.sock;
    } catch (err) {
      console.error('[CLIENT] Failed to create connection:', err.message);
      this.emit('error', err);
      return null;
    }
  }

  /**
   * Request pairing code
   * @param {string} phoneNumber - Phone number without +
   * @returns {Promise<string|null>}
   */
  async requestPairingCode(phoneNumber) {
    if (!this.sock) return null;
    try {
      const code = await this.sock.requestPairingCode(phoneNumber);
      this.pairingCode = code;
      console.log(`[CLIENT] Pairing code: ${code}`);
      return code;
    } catch (err) {
      console.error('[CLIENT] Failed to request pairing code:', err.message);
      return null;
    }
  }

  /**
   * Get the bot's JID
   * @returns {string|null}
   */
  getBotJid() {
    return this.sock?.user?.id || null;
  }

  /**
   * Get the bot's phone number
   * @returns {string}
   */
  getBotNumber() {
    const jid = this.getBotJid();
    return jid ? jid.split('@')[0].split(':')[0] : '';
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isActive() {
    return this.isConnected && this.sock !== null;
  }

  /**
   * Disconnect and clean up
   */
  async disconnect() {
    this.isShuttingDown = true;
    if (this.sock) {
      try {
        await this.sock.end(new Boom('Shutdown', { statusCode: DisconnectReason.loggedOut }));
      } catch {}
      this.sock = null;
    }
    this.isConnected = false;
  }

  /**
   * Restart connection
   */
  async restart() {
    await this.disconnect();
    this.isShuttingDown = false;
    return this.connect();
  }
}

/**
 * Create a new WhatsApp client and connect
 * @param {object} options - Connection options
 * @returns {Promise<WhatsAppClient>}
 */
async function createClient(options = {}) {
  const client = new WhatsAppClient(options);
  await client.connect(options);
  return client;
}

module.exports = { WhatsAppClient, createClient, BROWSER_FINGERPRINTS };
