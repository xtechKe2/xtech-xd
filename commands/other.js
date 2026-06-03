const os = require('os');
const fs = require('fs');
const path = require('path');
const { getMemoryInfo, runtime, formatBytes } = require('../lib/utils');
const { getTotalCommands } = require('../lib/menu');
const { downloadContentFromMessage } = require('../mrxd-baileys');

let startTime = Date.now();

module.exports = {
  category: 'OTHER',
  commands: {
    botstatus: {
      description: 'Show bot status info',
      usage: '.botstatus',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const memInfo = getMemoryInfo();
          const uptime = runtime((Date.now() - startTime) / 1000);
          const totalCmds = getTotalCommands();
          const mode = db.getSetting('mode', 'public');
          const prefix = db.getSetting('prefix', '.');
          const platform = os.platform();
          const nodeVersion = process.version;
          const cpuCount = os.cpus().length;
          const freeMem = formatBytes(os.freemem());
          const totalMem = formatBytes(os.totalmem());
          const status = `🟢 *Bot Status*\n\n` +
            `⏱️ *Uptime:* ${uptime}\n` +
            `💾 *Memory:* ${memInfo.rss}\n` +
            `📦 *Heap:* ${memInfo.heapUsed} / ${memInfo.heapTotal}\n` +
            `🖥️ *Platform:* ${platform}\n` +
            `🧮 *CPU Cores:* ${cpuCount}\n` +
            `💿 *Free/Total RAM:* ${freeMem} / ${totalMem}\n` +
            `🟢 *Node.js:* ${nodeVersion}\n` +
            `⚡ *Commands:* ${totalCmds}\n` +
            `🔧 *Mode:* ${mode}\n` +
            `📌 *Prefix:* ${prefix}\n` +
            `📱 *Bot JID:* ${botJid || 'N/A'}`;
          await reply(status);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    pair: {
      description: 'Generate pairing code for this bot',
      usage: '.pair',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Only the owner can use this command.');
          const { encodeSession } = require('../lib/session');
          const authPath = require('../lib/session').getAuthPath?.('default');
          if (!authPath) {
            const sessionId = process.env.SESSION_ID || 'Not available';
            return reply(`🔑 *Current Session ID:*\n\n\`\`\`\n${sessionId}\n\`\`\``);
          }
          try {
            const sessionId = encodeSession('default');
            if (sessionId) {
              await reply(`🔑 *Session ID:*\n\n\`\`\`\n${sessionId}\n\`\`\`\n\n⚠️ Keep this secret!`);
            } else {
              await reply('❌ Could not generate session ID. Session may not exist.');
            }
          } catch {
            await reply('❌ Could not encode session. Make sure a session exists.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    ping: {
      description: 'Check bot response time',
      usage: '.ping',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const start = Date.now();
          await reply('🏓 Pong!');
          const end = Date.now();
          const speed = end - start;
          await sock.sendMessage(jid, { text: `🏓 *Pong!*\n\n⚡ Speed: *${speed}ms*` }, { quoted: msg });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    ping2: {
      description: 'Alternative ping',
      usage: '.ping2',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const start = performance.now();
          const pingMsg = await reply('🏓 Pinging...');
          const end = performance.now();
          const speed = (end - start).toFixed(2);
          await reply(`🏓 *Pong!*\n\n⏱️ Latency: *${speed}ms*\n📡 Status: *Online*`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    repo: {
      description: 'Show bot repository info',
      usage: '.repo',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const totalCmds = getTotalCommands();
          const info = `📦 *XTECH_KE Bot*\n\n` +
            `🔖 *Version:* 1.9.4\n` +
            `🤖 *Total Commands:* ${totalCmds}\n` +
            `💻 *Framework:* Baileys\n` +
            `📝 *Language:* JavaScript (Node.js)\n` +
            `🔗 *Repo:* https://github.com/XTECH-KE/XTECH-KE\n\n` +
            `_Star ⭐ the repo if you like the bot!_`;
          await reply(info);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    runtime: {
      description: 'Show bot runtime',
      usage: '.runtime',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const uptime = runtime(process.uptime());
          await reply(`⏱️ *Runtime:* ${uptime}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    vv: {
      description: 'View and download view-once media (images/videos/audio)',
      usage: '.vv (reply to view-once message)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');

          // Get the quoted message
          const ctx = msg.message?.extendedTextMessage?.contextInfo;
          const quoted = ctx?.quotedMessage;
          if (!quoted) return reply('❌ Please reply to a view-once message.\n\nUsage: *.vv* (reply to view-once media)');

          let mediaType = null;
          let mediaObj = null;
          let caption = '';

          // Check for view-once image
          if (quoted.viewOnceMessage?.message?.imageMessage) {
            mediaType = 'image';
            mediaObj = quoted.viewOnceMessage.message.imageMessage;
            caption = mediaObj.caption || '';
          }
          // Check for view-once video
          else if (quoted.viewOnceMessage?.message?.videoMessage) {
            mediaType = 'video';
            mediaObj = quoted.viewOnceMessage.message.videoMessage;
            caption = mediaObj.caption || '';
          }
          // Check for view-once audio
          else if (quoted.viewOnceMessage?.message?.audioMessage) {
            mediaType = 'audio';
            mediaObj = quoted.viewOnceMessage.message.audioMessage;
          }
          // Check for regular image (maybe not view-once but user wants to download)
          else if (quoted.imageMessage) {
            mediaType = 'image';
            mediaObj = quoted.imageMessage;
            caption = mediaObj.caption || '';
          }
          // Check for regular video
          else if (quoted.videoMessage) {
            mediaType = 'video';
            mediaObj = quoted.videoMessage;
            caption = mediaObj.caption || '';
          }
          // Check for regular audio/ptt
          else if (quoted.audioMessage) {
            mediaType = 'audio';
            mediaObj = quoted.audioMessage;
          }
          // Check for sticker
          else if (quoted.stickerMessage) {
            mediaType = 'sticker';
            mediaObj = quoted.stickerMessage;
          }
          // Check for document
          else if (quoted.documentMessage) {
            mediaType = 'document';
            mediaObj = quoted.documentMessage;
          }
          else {
            return reply('❌ No media found in the replied message.\n\nSupported: Image, Video, Audio, Sticker, Document');
          }

          // Download the media
          const stream = await downloadContentFromMessage(mediaObj, mediaType === 'sticker' ? 'sticker' : mediaType);
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const finalBuffer = Buffer.concat(buffer);

          // Save to tmp
          const tmpDir = path.join(__dirname, '..', 'tmp');
          if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
          const ext = { image: 'jpg', video: 'mp4', audio: 'mp3', sticker: 'webp', document: 'pdf' }[mediaType] || 'bin';
          const filename = `vv_${Date.now()}.${ext}`;
          const filePath = path.join(tmpDir, filename);
          fs.writeFileSync(filePath, finalBuffer);

          // Send the media back
          const vCaption = `👁️ *View-Once Media Downloaded*\n📎 Type: ${mediaType}\n📦 Size: ${formatBytes(finalBuffer.length)}` + (caption ? `\n💬 Caption: ${caption}` : '');

          if (mediaType === 'image') {
            await sock.sendMessage(jid, { image: finalBuffer, caption: vCaption }, { quoted: msg });
          } else if (mediaType === 'video') {
            await sock.sendMessage(jid, { video: finalBuffer, caption: vCaption }, { quoted: msg });
          } else if (mediaType === 'audio') {
            await sock.sendMessage(jid, { audio: finalBuffer, mimetype: 'audio/mp4', ptt: mediaObj.ptt || false }, { quoted: msg });
          } else if (mediaType === 'sticker') {
            await sock.sendMessage(jid, { sticker: finalBuffer }, { quoted: msg });
          } else if (mediaType === 'document') {
            await sock.sendMessage(jid, { document: finalBuffer, fileName: mediaObj.fileName || filename, mimetype: mediaObj.mimetype || 'application/octet-stream' }, { quoted: msg });
          }

          // Cleanup
          try { fs.unlinkSync(filePath); } catch {}

        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    time: {
      description: 'Show current time in bot timezone',
      usage: '.time',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const timezone = db.getSetting('timezone', 'Africa/Nairobi');
          const moment = require('moment-timezone');
          const timeStr = moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss');
          const day = moment().tz(timezone).format('dddd');
          await reply(`🕐 *Time:* ${timeStr}\n📅 *Day:* ${day}\n📍 *Timezone:* ${timezone}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
