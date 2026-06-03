require('dotenv').config();
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const http = require('http');
const chalk = require('chalk');
const os = require('os');
const { WhatsAppClient, createClient } = require('./lib/client');
const { initDB, getSetting, setSetting, getSudo, isBanned } = require('./lib/database');
const { sessionExists, decodeSession, encodeSession, getAuthPath, SESSION_PREFIX } = require('./lib/session');
const store = require('./lib/store');
const { parseMessage, isGroup, jidToNumber, getMemoryInfo, runtime } = require('./lib/utils');
const { generateMainMenu, generateAllMenu, getCommandList, getTotalCommands, generatePremiumMenu } = require('./lib/menu');

let client = null;
let startTime = Date.now();
let isShuttingDown = false;

// Command registry
const commandModules = {};
const commandMap = {};

/**
 * Load all command modules from commands/ directory
 */
function loadCommands() {
  const commandsDir = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsDir)) return;
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    try {
      const mod = require(path.join(commandsDir, file));
      const categoryName = mod.category || file.replace('.js', '').toLowerCase();
      commandModules[categoryName] = mod;

      if (mod.commands) {
        for (const [name, cmd] of Object.entries(mod.commands)) {
          commandMap[name.toLowerCase()] = {
            category: categoryName,
            execute: cmd.execute,
            description: cmd.description || '',
            usage: cmd.usage || ''
          };
        }
      }
    } catch (err) {
      console.error(`[LOAD] Failed to load ${file}: ${err.message}`);
    }
  }
  console.log(`[LOAD] Loaded ${Object.keys(commandMap).length} commands from ${files.length} modules`);
}

loadCommands();

/**
 * Print startup banner
 */
function printBanner() {
  console.log(chalk.cyan(`
  ╔══════════════════════════════════════╗
  ║   X T E C H _ K E   WhatsApp Bot    ║
  ║       Advanced Multi-Device Bot      ║
  ║         Powered by mrxd-baileys      ║
  ╚══════════════════════════════════════╝
  `));
}

/**
 * Print startup sequence
 */
function printStartupSequence() {
  console.log(chalk.yellow('[XTECH_KE]') + ' Starting XTECH_KE Bot...');
  console.log(chalk.green('[✓]') + ' Loading commands');
  initDB();
  console.log(chalk.green('[✓]') + ' Connected to Database');
  console.log(chalk.green('[✓]') + ' Loading session storage');
  console.log(chalk.green('[✓]') + ' Starting WhatsApp connection...');
  console.log();
}

// ============================================================
// SESSION ID INPUT HANDLER
// ============================================================

function promptSessionId() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(chalk.yellow('[SESSION] Enter your session ID (or press Enter to use saved): '), async (input) => {
    rl.close();
    const sessionId = input.trim();

    if (sessionId) {
      try {
        const authPath = getAuthPath(sessionId);
        console.log('[SESSION] Decoding session ID...');
        decodeSession(sessionId, authPath);
        console.log(chalk.green('[SESSION] Session decoded successfully!'));
      } catch (err) {
        console.error(chalk.red('[SESSION] Failed to decode session:'), err.message);
        console.log('[SESSION] Starting without valid session - will need to pair...');
      }
    }

    startBot();
  });
}

// ============================================================
// MAIN BOT START
// ============================================================

async function startBot() {
  printStartupSequence();

  const authPath = path.join(__dirname, 'auth', 'default');

  // Check if session exists
  if (!fs.existsSync(path.join(authPath, 'creds.json'))) {
    console.log(chalk.yellow('[SESSION] No saved session found.'));
    console.log('[SESSION] Enter your session ID in the console to connect.');
    console.log('[SESSION] Or the bot will wait for pairing code input.');
  }

  try {
    client = new WhatsAppClient({ authPath, prefix: getSetting('prefix', '.') });

    // === EVENT: Connected ===
    client.on('open', ({ jid }) => {
      console.log(chalk.green.bold('[✓] Bot connected successfully!'));
      console.log(`[BOT] JID: ${jid}`);
      console.log(`[BOT] Number: ${jidToNumber(jid)}`);
      console.log(`[BOT] Prefix: ${client.prefix}`);
      console.log(`[BOT] Commands: ${Object.keys(commandMap).length}`);
      console.log(chalk.green.bold('[✓] XTECH_KE is now active!'));
    });

    // === EVENT: Message received ===
    client.on('message', async (msg) => {
      try {
        await handleMessage(msg);
      } catch (err) {
        console.error('[MSG] Error handling message:', err.message);
      }
    });

    // === EVENT: Connection replaced ===
    client.on('replaced', () => {
      console.log(chalk.yellow('[CLIENT] Session replaced by another connection'));
    });

    // === EVENT: Logged out ===
    client.on('logout', () => {
      console.log(chalk.red('[CLIENT] Session logged out. Need new session.'));
    });

    // === EVENT: Error ===
    client.on('error', (err) => {
      console.error('[CLIENT] Error:', err.message);
    });

    // Connect
    await client.connect();

  } catch (err) {
    console.error('[START] Failed to start bot:', err.message);
    process.exit(1);
  }
}

// ============================================================
// MESSAGE HANDLER
// ============================================================

async function handleMessage(msg) {
  if (!client || !client.sock) return;

  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const botJid = client.getBotJid();
  const prefix = client.prefix;

  // Extract message text
  const text = msg.message?.conversation
    || msg.message?.extendedTextMessage?.text
    || msg.message?.imageMessage?.caption
    || msg.message?.videoMessage?.caption
    || '';

  // Parse command
  const parsed = parseMessage(text, prefix);
  if (!parsed) return;

  const { command, args } = parsed;

  // Look up command
  const cmdInfo = commandMap[command];
  if (!cmdInfo) return;

  // Get settings
  const db = require('./lib/database');
  const config = {
    owner: db.getSetting('owner', ''),
    ownerName: db.getSetting('owner_name', 'XTECH_KE'),
    botName: db.getSetting('bot_name', 'XTECH_KE'),
    mode: db.getSetting('mode', 'public'),
    prefix: prefix,
    timezone: db.getSetting('timezone', 'Africa/Nairobi'),
    stickerAuthor: db.getSetting('sticker_author', 'XTECH_KE'),
    stickerPackname: db.getSetting('sticker_packname', 'XTECH_KE'),
    menuStyle: db.getSetting('menu_style', 'premium')
  };

  // Determine user roles
  const senderNumber = jidToNumber(sender);
  const botNumber = jidToNumber(botJid);
  const isOwner = senderNumber === config.owner || senderNumber === botNumber || db.isSudo(senderNumber);
  const groupMeta = isGroup(jid) ? await store.fetchGroupMetadata(jid) : null;
  const senderIsAdmin = groupMeta ? require('./lib/utils').isAdmin(sender, groupMeta) : false;
  const botIsAdmin = groupMeta ? require('./lib/utils').isBotAdmin(groupMeta, botJid) : false;

  // Mode check - if private, only owner can use
  if (config.mode === 'private' && !isOwner) return;

  // Banned check
  if (db.isBanned(senderNumber) && !isOwner) return;

  // Reply helper
  const reply = (text) => client.sock.sendMessage(jid, { text }, { quoted: msg });

  // Create context object
  const context = {
    isOwner,
    isAdmin: senderIsAdmin,
    isBotAdmin: botIsAdmin,
    isGroup: isGroup(jid),
    groupMetadata: groupMeta,
    sender,
    senderNumber,
    botJid,
    botNumber,
    db,
    config,
    commandMap,
    client,
    startTime,
    prefix,
    reply
  };

  // Execute command
  try {
    await cmdInfo.execute(client.sock, msg, args, context);
  } catch (err) {
    console.error(`[CMD] Error executing ${command}:`, err.message);
    try {
      await reply(`❌ Error: ${err.message}`);
    } catch {}
  }
}

// ============================================================
// SIMPLE HTTP SERVER (for hosting platforms that require a port)
// ============================================================

const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      bot: 'XTECH_KE',
      connected: client?.isActive() || false,
      commands: Object.keys(commandMap).length,
      uptime: runtime((Date.now() - startTime) / 1000),
      prefix: client?.prefix || '.'
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`[SERVER] HTTP server running on port ${PORT}`);
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on('SIGINT', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[SHUTDOWN] Shutting down gracefully...');
  if (client) await client.disconnect();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[SHUTDOWN] Received SIGTERM, shutting down...');
  if (client) await client.disconnect();
  server.close();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT]', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('[REJECTION]', err);
});

// ============================================================
// START
// ============================================================

printBanner();

// Check if SESSION_ID is provided via environment variable
if (process.env.SESSION_ID) {
  try {
    const authDir = path.join(__dirname, 'auth', 'default');
    decodeSession(process.env.SESSION_ID, authDir);
    console.log(chalk.green('[SESSION] Session from env decoded successfully!'));
  } catch (err) {
    console.error(chalk.red('[SESSION] Failed to decode session from env:'), err.message);
  }
  startBot();
} else {
  promptSessionId();
}
