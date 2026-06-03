const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { formatBytes, getMemoryInfo, isGroup, jidToNumber, numberToJid } = require('../lib/utils');
const { downloadContentFromMessage } = require('../mrxd-baileys');

module.exports = {
  category: 'OWNER',
  commands: {
    autosavestatus: {
      description: 'Toggle auto-save status',
      usage: '.autosavestatus on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const action = args[0]?.toLowerCase();
          if (!['on', 'off'].includes(action)) {
            const current = db.getSetting('autosave_status', 'false');
            return reply(`*Auto-Save Status:* ${current === 'true' ? 'ON' : 'OFF'}\n\nUsage: *.autosavestatus on/off*`);
          }
          db.setSetting('autosave_status', action === 'on' ? 'true' : 'false');
          await reply(`✅ Auto-save status is now *${action.toUpperCase()}*`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    aza: {
      description: 'Set away/auto-reply message',
      usage: '.aza <message>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const message = args.join(' ');
          if (!message) {
            const current = db.getSetting('aza_message', 'off');
            return reply(`*Current AZA:* ${current}\n\nUsage: *.aza <message>* or *.aza off*`);
          }
          db.setSetting('aza_message', message);
          db.setSetting('aza_enabled', 'true');
          await reply(`✅ AZA message set to: ${message}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    block: {
      description: 'Block user',
      usage: '.block @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const target = mentioned[0] || (args[0] ? numberToJid(args[0]) : null) || msg.message?.extendedTextMessage?.contextInfo?.participant;
          if (!target) return reply('❌ Please mention a user to block.\n\nUsage: *.block @user*');
          await sock.updateBlockStatus(target, 'block');
          db.addBanned(target);
          await reply(`✅ Blocked @${target.split('@')[0]}`, { mentions: [target] });
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    delete: {
      description: 'Delete message',
      usage: '.delete (reply to message)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        try {
          if (!isOwner && !isAdmin) return;
          const ctx = msg.message?.extendedTextMessage?.contextInfo;
          if (ctx?.stanzaId) {
            await sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: ctx.participant === botJid, id: ctx.stanzaId, participant: ctx.participant } });
          } else if (msg.key.fromMe) {
            await sock.sendMessage(jid, { delete: msg.key });
          }
        } catch (err) {}
      }
    },

    deljunk: {
      description: 'Delete junk files',
      usage: '.deljunk',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const tmpDir = path.join(__dirname, '..', 'tmp');
          let deleted = 0;
          if (fs.existsSync(tmpDir)) {
            const files = fs.readdirSync(tmpDir);
            for (const file of files) {
              try {
                fs.unlinkSync(path.join(tmpDir, file));
                deleted++;
              } catch {}
            }
          }
          await reply(`✅ Deleted ${deleted} junk files from tmp directory.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    delstickercmd: {
      description: 'Delete custom sticker command',
      usage: '.delstickercmd <command>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const cmd = args[0]?.toLowerCase();
          if (!cmd) return reply('❌ Please provide a command name.\n\nUsage: *.delstickercmd <command>*');
          db.delStickerCmd(cmd);
          await reply(`✅ Sticker command *${cmd}* deleted.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    disk: {
      description: 'Show disk usage',
      usage: '.disk',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          try {
            const checkDiskSpace = require('check-disk-space');
            const diskSpace = await checkDiskSpace(path.join(__dirname, '..'));
            await reply(`💿 *Disk Space*\n\n📦 Used: ${formatBytes(diskSpace.used)}\n✅ Free: ${formatBytes(diskSpace.free)}\n📊 Total: ${formatBytes(diskSpace.size)}`);
          } catch {
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            await reply(`💿 *Memory Info*\n\n📦 Used: ${formatBytes(totalMem - freeMem)}\n✅ Free: ${formatBytes(freeMem)}\n📊 Total: ${formatBytes(totalMem)}`);
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    dlvo: {
      description: 'Download view-once media',
      usage: '.dlvo (reply to view-once)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          if (!quoted) return reply('❌ Reply to a view-once message.');
          let mediaType = null;
          let mediaObj = null;
          if (quoted.viewOnceMessage?.message?.imageMessage) { mediaType = 'image'; mediaObj = quoted.viewOnceMessage.message.imageMessage; }
          else if (quoted.viewOnceMessage?.message?.videoMessage) { mediaType = 'video'; mediaObj = quoted.viewOnceMessage.message.videoMessage; }
          else if (quoted.imageMessage) { mediaType = 'image'; mediaObj = quoted.imageMessage; }
          else if (quoted.videoMessage) { mediaType = 'video'; mediaObj = quoted.videoMessage; }
          else return reply('❌ No view-once media found.');
          const stream = await downloadContentFromMessage(mediaObj, mediaType);
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const finalBuffer = Buffer.concat(buffer);
          if (mediaType === 'image') {
            await sock.sendMessage(jid, { image: finalBuffer, caption: '📸 *View-once media downloaded*' }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { video: finalBuffer, caption: '📹 *View-once media downloaded*' }, { quoted: msg });
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    forward: {
      description: 'Forward a message',
      usage: '.forward <jid>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const targetJid = args[0];
          if (!targetJid) return reply('❌ Please provide a JID to forward to.\n\nUsage: *.forward <jid>*');
          const ctx = msg.message?.extendedTextMessage?.contextInfo;
          if (ctx?.stanzaId) {
            const fwdMsg = { key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant }, message: ctx.quotedMessage };
            await sock.forwardMessage(targetJid, fwdMsg);
            await reply(`✅ Message forwarded to ${targetJid}`);
          } else {
            await reply('❌ Please reply to a message to forward.');
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    gcaddprivacy: {
      description: 'Set group add privacy',
      usage: '.gcaddprivacy <all/contacts/nobody>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const setting = args[0]?.toLowerCase();
          if (!['all', 'contacts', 'nobody'].includes(setting)) {
            return reply('❌ Options: all, contacts, nobody\n\nUsage: *.gcaddprivacy all*');
          }
          db.setSetting('gcadd_privacy', setting);
          await reply(`✅ Group add privacy set to *${setting}*`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    groupid: {
      description: 'Get group JID',
      usage: '.groupid',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          await reply(`📋 *Group JID:* ${jid}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    hostip: {
      description: 'Get host IP info',
      usage: '.hostip',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const { data } = await axios.get('https://api.ipify.org?format=json', { timeout: 10000 }).catch(() => ({ data: { ip: 'Unknown' } }));
          const hostname = os.hostname();
          const platform = os.platform();
          const arch = os.arch();
          await reply(`🖥️ *Host Info*\n\n🌐 IP: ${data.ip}\n🏷️ Hostname: ${hostname}\n💻 Platform: ${platform}\n🏗️ Arch: ${arch}\n🧮 CPUs: ${os.cpus().length}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    join: {
      description: 'Join group via invite link',
      usage: '.join <invite link>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const url = args[0];
          if (!url || !url.includes('chat.whatsapp.com')) return reply('❌ Please provide a valid invite link.\n\nUsage: *.join https://chat.whatsapp.com/xxxxx*');
          const code = url.split('chat.whatsapp.com/')[1]?.split(/[?\s]/)[0];
          if (!code) return reply('❌ Invalid invite link.');
          await sock.groupAcceptInvite(code);
          await reply('✅ Joined the group successfully!');
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    lastseen: {
      description: 'Toggle last seen privacy',
      usage: '.lastseen <all/contacts/nobody>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const setting = args[0]?.toLowerCase();
          if (!['all', 'contacts', 'nobody'].includes(setting)) {
            const current = db.getSetting('lastseen_privacy', 'all');
            return reply(`*Last Seen Privacy:* ${current}\n\nUsage: *.lastseen all/contacts/nobody*`);
          }
          db.setSetting('lastseen_privacy', setting);
          await reply(`✅ Last seen privacy set to *${setting}*`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    leave: {
      description: 'Leave group',
      usage: '.leave',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          await reply('👋 Leaving group...');
          await sock.groupLeave(jid);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    listbadword: {
      description: 'List bad words',
      usage: '.listbadword',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const words = db.getBadwords();
          if (words.length === 0) return reply('📋 No bad words configured.');
          let list = '📋 *Bad Words List*\n\n';
          words.forEach((w, i) => { list += `${i + 1}. ${w}\n`; });
          await reply(list);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    listblocked: {
      description: 'List blocked users',
      usage: '.listblocked',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const blocked = db.getBanned();
          if (blocked.length === 0) return reply('📋 No blocked users.');
          let list = '📋 *Blocked Users*\n\n';
          blocked.forEach((jid, i) => { list += `${i + 1}. @${jid.split('@')[0]}\n`; });
          await sock.sendMessage(jid, { text: list, mentions: blocked });
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    listignorelist: {
      description: 'List ignored users/chats',
      usage: '.listignorelist',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const ignored = db.getIgnoreList();
          if (ignored.length === 0) return reply('📋 No ignored users.');
          let list = '📋 *Ignored Users*\n\n';
          ignored.forEach((jid, i) => { list += `${i + 1}. ${jid}\n`; });
          await reply(list);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    listsudo: {
      description: 'List sudo users',
      usage: '.listsudo',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const sudoUsers = db.getSudo();
          if (sudoUsers.length === 0) return reply('📋 No sudo users configured.');
          let list = '📋 *Sudo Users*\n\n';
          sudoUsers.forEach((jid, i) => { list += `${i + 1}. @${jid.split('@')[0]}\n`; });
          await sock.sendMessage(jid, { text: list, mentions: sudoUsers });
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    modestatus: {
      description: 'Show current mode',
      usage: '.modestatus',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const mode = db.getSetting('mode', 'public');
          const prefix = db.getSetting('prefix', '.');
          const chatbot = db.getSetting('chatbot', 'false');
          await reply(`📊 *Mode Status*\n\n🔧 Mode: *${mode}*\n📌 Prefix: *${prefix}*\n🤖 Chatbot: *${chatbot === 'true' ? 'ON' : 'OFF'}*`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    online: {
      description: 'Toggle always online presence',
      usage: '.online on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const action = args[0]?.toLowerCase();
          if (!['on', 'off'].includes(action)) {
            const current = db.getSetting('alwaysonline', 'false');
            return reply(`*Always Online:* ${current === 'true' ? 'ON' : 'OFF'}\n\nUsage: *.online on/off*`);
          }
          db.setSetting('alwaysonline', action === 'on' ? 'true' : 'false');
          if (action === 'on') {
            await sock.sendPresenceUpdate('available', jid);
          }
          await reply(`✅ Always online is now *${action.toUpperCase()}*`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    owner: {
      description: 'Show owner info',
      usage: '.owner',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const ownerName = db.getSetting('owner_name', 'XTECH_KE');
          const ownerNum = db.getSetting('owner', '255712345678');
          await reply(`👤 *Owner:* ${ownerName}\n📱 *Number:* ${ownerNum}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    ppprivacy: {
      description: 'Set profile picture privacy',
      usage: '.ppprivacy <all/contacts/nobody>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const setting = args[0]?.toLowerCase();
          if (!['all', 'contacts', 'nobody'].includes(setting)) {
            const current = db.getSetting('pp_privacy', 'all');
            return reply(`*Profile Picture Privacy:* ${current}\n\nUsage: *.ppprivacy all/contacts/nobody*`);
          }
          db.setSetting('pp_privacy', setting);
          await reply(`✅ Profile picture privacy set to *${setting}*`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    react: {
      description: 'React to a message',
      usage: '.react <emoji>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const emoji = args[0] || '👍';
          const ctx = msg.message?.extendedTextMessage?.contextInfo;
          if (ctx?.stanzaId) {
            await sock.sendMessage(jid, { react: { text: emoji, key: { remoteJid: jid, fromMe: false, id: ctx.stanzaId, participant: ctx.participant } } });
          } else {
            await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    readreceipts: {
      description: 'Set read receipts privacy',
      usage: '.readreceipts <all/contacts/nobody>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const setting = args[0]?.toLowerCase();
          if (!['all', 'contacts', 'nobody'].includes(setting)) {
            const current = db.getSetting('readreceipts_privacy', 'all');
            return reply(`*Read Receipts Privacy:* ${current}\n\nUsage: *.readreceipts all/contacts/nobody*`);
          }
          db.setSetting('readreceipts_privacy', setting);
          await reply(`✅ Read receipts privacy set to *${setting}*`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    resetaza: {
      description: 'Reset away/auto-reply',
      usage: '.resetaza',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          db.setSetting('aza_message', 'off');
          db.setSetting('aza_enabled', 'false');
          await reply('✅ AZA message has been reset.');
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    restart: {
      description: 'Restart the bot',
      usage: '.restart',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          await reply('🔄 Restarting bot...');
          process.exit(0);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    setaza: {
      description: 'Set away message',
      usage: '.setaza <message>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const message = args.join(' ');
          if (!message) return reply('❌ Please provide a message.\n\nUsage: *.setaza <message>*');
          db.setSetting('aza_message', message);
          db.setSetting('aza_enabled', 'true');
          await reply(`✅ AZA message set to: ${message}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    setbio: {
      description: 'Set bot bio/status',
      usage: '.setbio <text>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const bio = args.join(' ');
          if (!bio) return reply('❌ Please provide bio text.\n\nUsage: *.setbio <text>*');
          await sock.updateProfileStatus(bio);
          await reply('✅ Bio updated successfully!');
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    setprofilepic: {
      description: 'Set bot profile picture',
      usage: '.setprofilepic (reply to image)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          let imageMsg = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
          if (!imageMsg) return reply('❌ Please reply to an image.');
          const stream = await downloadContentFromMessage(imageMsg, 'image');
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          await sock.updateProfilePicture(botJid, Buffer.concat(buffer));
          await reply('✅ Profile picture updated!');
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    setstickercmd: {
      description: 'Set custom sticker command',
      usage: '.setstickercmd <command> <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const cmd = args[0]?.toLowerCase();
          const url = args[1];
          if (!cmd || !url) return reply('❌ Please provide command name and image URL.\n\nUsage: *.setstickercmd hello https://example.com/image.png*');
          db.setStickerCmd(cmd, url);
          await reply(`✅ Sticker command *${cmd}* set!`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    tostatus: {
      description: 'Post message as status',
      usage: '.tostatus <text>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const text = args.join(' ');
          if (!text) return reply('❌ Please provide text.\n\nUsage: *.tostatus <text>*');
          await sock.sendMessage('status@broadcast', { text });
          await reply('✅ Status updated!');
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    toviewonce: {
      description: 'Send media as view once',
      usage: '.toviewonce (reply to media)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          if (!quoted) return reply('❌ Reply to an image or video message.');
          if (quoted.imageMessage) {
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            const buffer = [];
            for await (const chunk of stream) buffer.push(chunk);
            await sock.sendMessage(jid, { image: Buffer.concat(buffer), viewOnce: true, caption: '👀 View once' });
          } else if (quoted.videoMessage) {
            const stream = await downloadContentFromMessage(quoted.videoMessage, 'video');
            const buffer = [];
            for await (const chunk of stream) buffer.push(chunk);
            await sock.sendMessage(jid, { video: Buffer.concat(buffer), viewOnce: true, caption: '👀 View once' });
          } else {
            await reply('❌ Only images and videos can be sent as view once.');
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    unblock: {
      description: 'Unblock user',
      usage: '.unblock @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const target = mentioned[0] || (args[0] ? numberToJid(args[0]) : null);
          if (!target) return reply('❌ Please mention a user to unblock.\n\nUsage: *.unblock @user*');
          await sock.updateBlockStatus(target, 'unblock');
          db.delBanned(target);
          await reply(`✅ Unblocked @${target.split('@')[0]}`, { mentions: [target] });
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    unblockall: {
      description: 'Unblock all users',
      usage: '.unblockall',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const blocked = db.getBanned();
          if (blocked.length === 0) return reply('📋 No blocked users.');
          for (const target of blocked) {
            try {
              await sock.updateBlockStatus(target, 'unblock');
              db.delBanned(target);
            } catch {}
          }
          await reply(`✅ Unblocked all ${blocked.length} users.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    update: {
      description: 'Check for updates',
      usage: '.update',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          await reply('🔍 Checking for updates...');
          try {
            const { execSync } = require('child_process');
            const result = execSync('git fetch && git log HEAD..origin/main --oneline', { cwd: path.join(__dirname, '..'), timeout: 15000 }).toString().trim();
            if (result) {
              await reply(`📦 *Updates Available*\n\n${result}\n\nRun *.restart* after pulling updates.`);
            } else {
              await reply('✅ Bot is up to date! No updates available.');
            }
          } catch {
            await reply('⚠️ Could not check for updates. You may not be using a git repository.');
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    vv2: {
      description: 'View once media saver v2',
      usage: '.vv2 (reply to view-once)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const dlvoCmd = module.exports.commands.dlvo;
          return dlvoCmd.execute(sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config });
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    warn: {
      description: 'Warn a user',
      usage: '.warn @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner && !isAdmin) return reply('❌ Admin/Owner only.');
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const target = mentioned[0] || (args[0] ? numberToJid(args[0]) : null) || msg.message?.extendedTextMessage?.contextInfo?.participant;
          if (!target) return reply('❌ Please mention a user to warn.');
          const warnLimit = parseInt(db.getSetting('warn_limit', '3'));
          const count = db.addWarning(target);
          if (count >= warnLimit) {
            db.resetWarning(target);
            db.addBanned(target);
            await reply(`⛔ @${target.split('@')[0]} has been banned after ${warnLimit} warnings.`, { mentions: [target] });
          } else {
            await reply(`⚠️ Warning ${count}/${warnLimit} for @${target.split('@')[0]}`, { mentions: [target] });
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    }
  }
};
