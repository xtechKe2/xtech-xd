const { getGroupAdmins, isGroup, jidToNumber, numberToJid } = require('../lib/utils');

function getMentionedJids(msg) {
  try {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    return ctx?.mentionedJid || [];
  } catch { return []; }
}

function getQuotedSender(msg) {
  try {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    return ctx?.participant || null;
  } catch { return null; }
}

function getTargetJid(args, msg) {
  const mentioned = getMentionedJids(msg);
  if (mentioned.length > 0) return mentioned[0];
  if (args[0]) {
    let num = args[0].replace(/[^0-9]/g, '');
    if (num) return `${num}@s.whatsapp.net`;
  }
  const quoted = getQuotedSender(msg);
  if (quoted) return quoted;
  return null;
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return 0;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's': return num;
    case 'm': return num * 60;
    case 'h': return num * 3600;
    case 'd': return num * 86400;
    default: return 0;
  }
}

module.exports = {
  category: 'GROUP',
  commands: {
    add: {
      description: 'Add user to group',
      usage: '.add <number/@user>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin to add users.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can add users.');
          const target = getTargetJid(args, msg);
          if (!target) return reply('❌ Please mention a user or provide a number.\n\nUsage: *.add @user* or *.add 254712345678*');
          await sock.groupParticipantsUpdate(jid, [target], 'add');
          await reply(`✅ Added @${target.split('@')[0]}`, { mentions: [target] });
        } catch (err) {
          if (err.message?.includes('403')) await reply('❌ Failed to add user. They may have restricted who can add them to groups.');
          else await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    allow: {
      description: 'Allow a user in group',
      usage: '.allow <number/@user>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const target = getTargetJid(args, msg);
          if (!target) return reply('❌ Please mention a user or provide a number.');
          const { setGroupSetting } = db;
          let allowed = JSON.parse(db.getGroupSetting(jid, 'allowed_users', '[]'));
          if (!allowed.includes(target)) {
            allowed.push(target);
            setGroupSetting(jid, 'allowed_users', JSON.stringify(allowed));
          }
          await reply(`✅ Allowed @${target.split('@')[0]}`, { mentions: [target] });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    announcements: {
      description: 'Toggle group announcements',
      usage: '.announcements',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const current = groupMetadata?.announce === true;
          await sock.groupSettingUpdate(jid, current ? 'not_announcement' : 'announcement');
          await reply(`✅ Group ${current ? 'opened' : 'closed'}. ${current ? 'Everyone can send messages.' : 'Only admins can send messages.'}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    antibadword: {
      description: 'Toggle anti-badword in group',
      usage: '.antibadword on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!action || !['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antibadword', 'off');
            return reply(`*Anti-Badword:* ${current}\n\nUsage: *.antibadword on/off*`);
          }
          db.setGroupSetting(jid, 'antibadword', action);
          await reply(`✅ Anti-badword is now *${action}*`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    antibot: {
      description: 'Toggle anti-bot in group',
      usage: '.antibot on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!action || !['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antibot', 'off');
            return reply(`*Anti-Bot:* ${current}\n\nUsage: *.antibot on/off*`);
          }
          db.setGroupSetting(jid, 'antibot', action);
          await reply(`✅ Anti-bot is now *${action}*`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    antilink: {
      description: 'Toggle anti-link (delete messages with links)',
      usage: '.antilink on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!action || !['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antilink', 'off');
            return reply(`*Anti-Link:* ${current}\n\nUsage: *.antilink on/off*`);
          }
          db.setGroupSetting(jid, 'antilink', action);
          await reply(`✅ Anti-link is now *${action}*. Messages with links will be ${action === 'on' ? 'deleted' : 'allowed'}.`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    antilinkgc: {
      description: 'Toggle anti-group-link',
      usage: '.antilinkgc on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!action || !['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antilinkgc', 'off');
            return reply(`*Anti-Group-Link:* ${current}\n\nUsage: *.antilinkgc on/off*`);
          }
          db.setGroupSetting(jid, 'antilinkgc', action);
          await reply(`✅ Anti-group-link is now *${action}*. Group links will be ${action === 'on' ? 'deleted' : 'allowed'}.`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    close: {
      description: 'Close group (only admins can send)',
      usage: '.close',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          await sock.groupSettingUpdate(jid, 'announcement');
          await reply('✅ Group closed. Only admins can send messages.');
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    closetime: {
      description: 'Close group for X time',
      usage: '.closetime <time> (e.g. 30m, 1h, 2d)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const timeStr = args[0];
          const seconds = parseTimeToSeconds(timeStr);
          if (!seconds) return reply('❌ Please provide a valid time.\n\nUsage: *.closetime 30m*\nUnits: s (seconds), m (minutes), h (hours), d (days)');
          await sock.groupSettingUpdate(jid, 'announcement');
          await reply(`✅ Group closed for ${timeStr}. Will reopen automatically.`);
          setTimeout(async () => {
            try {
              await sock.groupSettingUpdate(jid, 'not_announcement');
              await sock.sendMessage(jid, { text: '🔓 Group has been reopened!' });
            } catch {}
          }, seconds * 1000);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    demote: {
      description: 'Demote admin to member',
      usage: '.demote @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const target = getTargetJid(args, msg);
          if (!target) return reply('❌ Please mention a user to demote.');
          await sock.groupParticipantsUpdate(jid, [target], 'demote');
          await reply(`✅ Demoted @${target.split('@')[0]} from admin`, { mentions: [target] });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    hidetag: {
      description: 'Tag everyone hidden',
      usage: '.hidetag <message>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const text = args.join(' ') || '📢 Attention everyone!';
          const participants = groupMetadata?.participants || [];
          const mentions = participants.map(p => p.id);
          await sock.sendMessage(jid, { text, mentions });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    invite: {
      description: 'Get group invite link',
      usage: '.invite',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const code = await sock.groupInviteCode(jid);
          await reply(`🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    kick: {
      description: 'Remove user from group',
      usage: '.kick @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can kick users.');
          const target = getTargetJid(args, msg);
          if (!target) return reply('❌ Please mention a user to kick.');
          if (target === botJid) return reply('❌ I cannot kick myself!');
          const admins = getGroupAdmins(groupMetadata?.participants || []);
          if (admins.includes(target) && !isOwner) return reply('❌ Cannot kick an admin.');
          await sock.groupParticipantsUpdate(jid, [target], 'remove');
          await reply(`✅ Kicked @${target.split('@')[0]}`, { mentions: [target] });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    kickall: {
      description: 'Remove all non-admins',
      usage: '.kickall',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isOwner) return reply('❌ Only the owner can use this command.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          const participants = groupMetadata?.participants || [];
          const admins = getGroupAdmins(participants);
          const toKick = participants.filter(p => !admins.includes(p.id) && p.id !== botJid).map(p => p.id);
          if (toKick.length === 0) return reply('❌ No non-admins to kick.');
          await reply(`⚠️ Kicking ${toKick.length} non-admin members...`);
          for (const userId of toKick) {
            try {
              await sock.groupParticipantsUpdate(jid, [userId], 'remove');
              await new Promise(r => setTimeout(r, 1000));
            } catch {}
          }
          await reply(`✅ Kicked ${toKick.length} members.`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    kickinactive: {
      description: 'Kick inactive members',
      usage: '.kickinactive',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isOwner) return reply('❌ Only the owner can use this command.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          const inactiveList = JSON.parse(db.getGroupSetting(jid, 'inactive_list', '[]'));
          if (inactiveList.length === 0) return reply('❌ No inactive members recorded. Use .listinactive to check.');
          const admins = getGroupAdmins(groupMetadata?.participants || []);
          const toKick = inactiveList.filter(id => !admins.includes(id) && id !== botJid);
          if (toKick.length === 0) return reply('❌ No inactive non-admin members to kick.');
          for (const userId of toKick) {
            try {
              await sock.groupParticipantsUpdate(jid, [userId], 'remove');
              await new Promise(r => setTimeout(r, 1000));
            } catch {}
          }
          db.setGroupSetting(jid, 'inactive_list', '[]');
          await reply(`✅ Kicked ${toKick.length} inactive members.`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    link: {
      description: 'Get group invite link',
      usage: '.link',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const code = await sock.groupInviteCode(jid);
          await reply(`🔗 *Group Link*\n\nhttps://chat.whatsapp.com/${code}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    open: {
      description: 'Open group',
      usage: '.open',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          await sock.groupSettingUpdate(jid, 'not_announcement');
          await reply('✅ Group opened. Everyone can send messages.');
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    opentime: {
      description: 'Open group after X time',
      usage: '.opentime <time>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const timeStr = args[0];
          const seconds = parseTimeToSeconds(timeStr);
          if (!seconds) return reply('❌ Please provide a valid time.\n\nUsage: *.opentime 30m*\nUnits: s, m, h, d');
          await reply(`✅ Group will open in ${timeStr}.`);
          setTimeout(async () => {
            try {
              await sock.groupSettingUpdate(jid, 'not_announcement');
              await sock.sendMessage(jid, { text: '🔓 Group has been opened!' });
            } catch {}
          }, seconds * 1000);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    poll: {
      description: 'Create a poll',
      usage: '.poll question|option1|option2|...',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can create polls.');
          const input = args.join(' ');
          if (!input || !input.includes('|')) return reply('❌ Format: *.poll question|option1|option2|option3*');
          const parts = input.split('|').map(p => p.trim()).filter(Boolean);
          if (parts.length < 3) return reply('❌ Need at least a question and 2 options.');
          const question = parts[0];
          const options = parts.slice(1);
          const pollMessage = {
            name: question,
            values: options.map(opt => ({ optionName: opt })),
            selectableCount: 1
          };
          await sock.sendMessage(jid, { poll: pollMessage });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    promote: {
      description: 'Promote member to admin',
      usage: '.promote @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can promote.');
          const target = getTargetJid(args, msg);
          if (!target) return reply('❌ Please mention a user to promote.');
          await sock.groupParticipantsUpdate(jid, [target], 'promote');
          await reply(`✅ Promoted @${target.split('@')[0]} to admin`, { mentions: [target] });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    resetlink: {
      description: 'Reset group invite link',
      usage: '.resetlink',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          await sock.groupRevokeInvite(jid);
          const newCode = await sock.groupInviteCode(jid);
          await reply(`✅ Group link reset.\n\n🔗 New link: https://chat.whatsapp.com/${newCode}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    setdesc: {
      description: 'Set group description',
      usage: '.setdesc <description>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const desc = args.join(' ');
          if (!desc) return reply('❌ Please provide a description.\n\nUsage: *.setdesc <description>*');
          await sock.groupUpdateDescription(jid, desc);
          await reply('✅ Group description updated.');
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    setgroupname: {
      description: 'Set group name',
      usage: '.setgroupname <name>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const name = args.join(' ');
          if (!name) return reply('❌ Please provide a name.\n\nUsage: *.setgroupname <name>*');
          await sock.groupUpdateSubject(jid, name);
          await reply(`✅ Group name changed to *${name}*`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    setppgroup: {
      description: 'Set group profile picture',
      usage: '.setppgroup (reply to image)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const { downloadContentFromMessage } = require('../mrxd-baileys');
          let imageMsg = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
          if (!imageMsg) return reply('❌ Please reply to an image.');
          const stream = await downloadContentFromMessage(imageMsg, 'image');
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const imgBuffer = Buffer.concat(buffer);
          await sock.updateProfilePicture(jid, imgBuffer);
          await reply('✅ Group profile picture updated.');
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    tag: {
      description: 'Tag a user',
      usage: '.tag @user <message>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          const target = getTargetJid(args, msg);
          if (!target) return reply('❌ Please mention a user to tag.');
          const text = args.slice(1).join(' ') || '👋';
          await sock.sendMessage(jid, { text: `@${target.split('@')[0]} ${text}`, mentions: [target] });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    tagadmin: {
      description: 'Tag all admins',
      usage: '.tagadmin <message>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          const participants = groupMetadata?.participants || [];
          const admins = getGroupAdmins(participants);
          const text = args.join(' ') || '📢 Admins attention!';
          const mentions = admins.filter(a => a !== botJid);
          const adminTags = mentions.map(a => `@${a.split('@')[0]}`).join(' ');
          await sock.sendMessage(jid, { text: `${text}\n\n${adminTags}`, mentions });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    tagall: {
      description: 'Tag all members',
      usage: '.tagall <message>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can tag all.');
          const text = args.join(' ') || '📢 Attention everyone!';
          const participants = groupMetadata?.participants || [];
          const mentions = participants.map(p => p.id);
          const tags = participants.map(p => `@${p.id.split('@')[0]}`).join('\n');
          await sock.sendMessage(jid, { text: `${text}\n\n${tags}`, mentions });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    totalmembers: {
      description: 'Count group members',
      usage: '.totalmembers',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          const participants = groupMetadata?.participants || [];
          const admins = getGroupAdmins(participants);
          const members = participants.length - admins.length;
          await reply(`👥 *Group Members*\n\n📋 Total: ${participants.length}\n👑 Admins: ${admins.length}\n👤 Members: ${members}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    userid: {
      description: 'Get user JID',
      usage: '.userid @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const target = getTargetJid(args, msg) || sender;
          await reply(`🆔 *User ID*\n\nJID: ${target}\nNumber: ${jidToNumber(target)}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    vcf: {
      description: 'Export contacts as VCF',
      usage: '.vcf',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const participants = groupMetadata?.participants || [];
          let vcfContent = '';
          participants.forEach((p, i) => {
            const num = jidToNumber(p.id);
            vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:Contact ${i + 1}\nTEL;type=CELL;waid=${num}:${num}\nEND:VCARD\n`;
          });
          const buffer = Buffer.from(vcfContent, 'utf-8');
          await sock.sendMessage(jid, {
            document: buffer,
            fileName: 'contacts.vcf',
            mimetype: 'text/vcard'
          }, { quoted: msg });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    welcome: {
      description: 'Set welcome message',
      usage: '.welcome on/off or .welcome <message>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (action === 'on' || action === 'off') {
            db.setGroupSetting(jid, 'welcome', action === 'on' ? 'on' : 'off');
            await reply(`✅ Welcome message is now *${action}*`);
          } else {
            const message = args.join(' ');
            if (!message) {
              const current = db.getGroupSetting(jid, 'welcome_message', 'Welcome @user to @group!');
              return reply(`*Current welcome message:*\n${current}\n\nUsage: *.welcome <message>*\nVariables: @user, @group, @desc\nOr: *.welcome on/off*`);
            }
            db.setGroupSetting(jid, 'welcome_message', message);
            db.setGroupSetting(jid, 'welcome', 'on');
            await reply(`✅ Welcome message set to:\n${message}`);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    addcode: {
      description: 'Add group code',
      usage: '.addcode <code>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const code = args.join(' ');
          if (!code) return reply('❌ Please provide a code.\n\nUsage: *.addcode <code>*');
          let codes = JSON.parse(db.getGroupSetting(jid, 'codes', '[]'));
          codes.push({ code, addedBy: sender, addedAt: Date.now() });
          db.setGroupSetting(jid, 'codes', JSON.stringify(codes));
          await reply(`✅ Code added: ${code}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    approve: {
      description: 'Approve a user request',
      usage: '.approve @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const target = getTargetJid(args, msg);
          if (!target) return reply('❌ Please mention a user to approve.');
          let requests = JSON.parse(db.getGroupSetting(jid, 'join_requests', '[]'));
          requests = requests.filter(r => r !== target);
          db.setGroupSetting(jid, 'join_requests', JSON.stringify(requests));
          if (isBotAdmin) {
            try { await sock.groupParticipantsUpdate(jid, [target], 'add'); } catch {}
          }
          await reply(`✅ Approved @${target.split('@')[0]}`, { mentions: [target] });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    approveall: {
      description: 'Approve all pending requests',
      usage: '.approveall',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const requests = JSON.parse(db.getGroupSetting(jid, 'join_requests', '[]'));
          if (requests.length === 0) return reply('❌ No pending requests.');
          if (isBotAdmin) {
            for (const target of requests) {
              try { await sock.groupParticipantsUpdate(jid, [target], 'add'); } catch {}
            }
          }
          db.setGroupSetting(jid, 'join_requests', '[]');
          await reply(`✅ Approved all ${requests.length} pending requests.`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    cancelkick: {
      description: 'Cancel a scheduled kick',
      usage: '.cancelkick @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const target = getTargetJid(args, msg);
          if (!target) return reply('❌ Please mention a user.');
          let kickList = JSON.parse(db.getGroupSetting(jid, 'pending_kicks', '[]'));
          kickList = kickList.filter(k => k.jid !== target);
          db.setGroupSetting(jid, 'pending_kicks', JSON.stringify(kickList));
          await reply(`✅ Cancelled kick for @${target.split('@')[0]}`, { mentions: [target] });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    delallowed: {
      description: 'Remove user from allowed list',
      usage: '.delallowed @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const target = getTargetJid(args, msg);
          if (!target) return reply('❌ Please mention a user.');
          let allowed = JSON.parse(db.getGroupSetting(jid, 'allowed_users', '[]'));
          allowed = allowed.filter(u => u !== target);
          db.setGroupSetting(jid, 'allowed_users', JSON.stringify(allowed));
          await reply(`✅ Removed @${target.split('@')[0]} from allowed list`, { mentions: [target] });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    delcode: {
      description: 'Delete a group code',
      usage: '.delcode <code>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const code = args.join(' ');
          if (!code) return reply('❌ Please provide a code to delete.');
          let codes = JSON.parse(db.getGroupSetting(jid, 'codes', '[]'));
          codes = codes.filter(c => c.code !== code);
          db.setGroupSetting(jid, 'codes', JSON.stringify(codes));
          await reply(`✅ Code deleted: ${code}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    delppgroup: {
      description: 'Delete group profile picture',
      usage: '.delppgroup',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isBotAdmin) return reply('❌ I need to be admin.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          await sock.removeProfilePicture(jid);
          await reply('✅ Group profile picture removed.');
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    disapproveall: {
      description: 'Disapprove all pending requests',
      usage: '.disapproveall',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const count = JSON.parse(db.getGroupSetting(jid, 'join_requests', '[]')).length;
          db.setGroupSetting(jid, 'join_requests', '[]');
          await reply(`✅ Disapproved all ${count} pending requests.`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    editsettings: {
      description: 'Edit group settings',
      usage: '.editsettings <key> <value>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const key = args[0];
          const value = args.slice(1).join(' ');
          if (!key) {
            const settings = db.getAllGroupSettings(jid);
            let list = '⚙️ *Group Settings*\n\n';
            for (const [k, v] of Object.entries(settings)) {
              list += `*${k}:* ${v}\n`;
            }
            return reply(list);
          }
          if (!value) return reply('❌ Please provide a value.\n\nUsage: *.editsettings <key> <value>*');
          db.setGroupSetting(jid, key, value);
          await reply(`✅ Set *${key}* to *${value}*`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    getgrouppp: {
      description: 'Get group profile picture',
      usage: '.getgrouppp',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          try {
            const ppUrl = await sock.profilePictureUrl(jid, 'image');
            const { getBuffer } = require('../lib/utils');
            const buffer = await getBuffer(ppUrl);
            await replyImage(buffer, '🖼️ *Group Profile Picture*');
          } catch {
            await reply('❌ Group profile picture not available or not set.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    listactive: {
      description: 'List active members',
      usage: '.listactive',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          const participants = groupMetadata?.participants || [];
          let list = `📋 *Active Members (${participants.length})*\n\n`;
          participants.forEach((p, i) => {
            list += `${i + 1}. @${p.id.split('@')[0]}${p.admin ? ` [${p.admin}]` : ''}\n`;
          });
          const mentions = participants.map(p => p.id);
          await sock.sendMessage(jid, { text: list, mentions });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    listallowed: {
      description: 'List allowed users',
      usage: '.listallowed',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          const allowed = JSON.parse(db.getGroupSetting(jid, 'allowed_users', '[]'));
          if (allowed.length === 0) return reply('📋 No allowed users configured.');
          let list = '📋 *Allowed Users*\n\n';
          allowed.forEach((jid, i) => { list += `${i + 1}. @${jid.split('@')[0]}\n`; });
          await sock.sendMessage(jid, { text: list, mentions: allowed });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    listcode: {
      description: 'List group codes',
      usage: '.listcode',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          const codes = JSON.parse(db.getGroupSetting(jid, 'codes', '[]'));
          if (codes.length === 0) return reply('📋 No codes configured.');
          let list = '📋 *Group Codes*\n\n';
          codes.forEach((c, i) => { list += `${i + 1}. ${c.code} (by @${c.addedBy?.split('@')[0] || 'unknown'})\n`; });
          await reply(list);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    listinactive: {
      description: 'List inactive members',
      usage: '.listinactive',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          const inactive = JSON.parse(db.getGroupSetting(jid, 'inactive_list', '[]'));
          if (inactive.length === 0) return reply('📋 No inactive members recorded.');
          let list = `📋 *Inactive Members (${inactive.length})*\n\n`;
          inactive.forEach((id, i) => { list += `${i + 1}. @${id.split('@')[0]}\n`; });
          await sock.sendMessage(jid, { text: list, mentions: inactive });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    listrequests: {
      description: 'List pending join requests',
      usage: '.listrequests',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          const requests = JSON.parse(db.getGroupSetting(jid, 'join_requests', '[]'));
          if (requests.length === 0) return reply('📋 No pending join requests.');
          let list = `📋 *Pending Requests (${requests.length})*\n\n`;
          requests.forEach((id, i) => { list += `${i + 1}. @${id.split('@')[0]}\n`; });
          await sock.sendMessage(jid, { text: list, mentions: requests });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    mediatag: {
      description: 'Tag with media',
      usage: '.mediatag (reply to media)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const participants = groupMetadata?.participants || [];
          const mentions = participants.map(p => p.id);
          const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          if (quoted?.imageMessage) {
            const { downloadContentFromMessage } = require('../mrxd-baileys');
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            const buffer = [];
            for await (const chunk of stream) buffer.push(chunk);
            await sock.sendMessage(jid, { image: Buffer.concat(buffer), caption: args.join(' ') || '📢', mentions });
          } else {
            await sock.sendMessage(jid, { text: args.join(' ') || '📢', mentions });
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    reject: {
      description: 'Reject a join request',
      usage: '.reject @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const target = getTargetJid(args, msg);
          if (!target) return reply('❌ Please mention a user.');
          let requests = JSON.parse(db.getGroupSetting(jid, 'join_requests', '[]'));
          requests = requests.filter(r => r !== target);
          db.setGroupSetting(jid, 'join_requests', JSON.stringify(requests));
          await reply(`✅ Rejected request from @${target.split('@')[0]}`, { mentions: [target] });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    antidemote: {
      description: 'Toggle anti-demote protection',
      usage: '.antidemote on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antidemote', 'off');
            return reply(`*Anti-Demote:* ${current}\n\nUsage: *.antidemote on/off*`);
          }
          db.setGroupSetting(jid, 'antidemote', action);
          await reply(`✅ Anti-demote is now *${action}*. Admins will be ${action === 'on' ? 'protected from demotion' : 'able to be demoted'}.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    antiforeign: {
      description: 'Toggle anti-foreign numbers',
      usage: '.antiforeign on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antiforeign', 'off');
            return reply(`*Anti-Foreign:* ${current}\n\nUsage: *.antiforeign on/off*`);
          }
          db.setGroupSetting(jid, 'antiforeign', action);
          await reply(`✅ Anti-foreign is now *${action}*. ${action === 'on' ? 'Foreign numbers will be removed.' : 'All numbers allowed.'}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    antiforward: {
      description: 'Toggle anti-forward messages',
      usage: '.antiforward on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antiforward', 'off');
            return reply(`*Anti-Forward:* ${current}\n\nUsage: *.antiforward on/off*`);
          }
          db.setGroupSetting(jid, 'antiforward', action);
          await reply(`✅ Anti-forward is now *${action}*. Forwarded messages will be ${action === 'on' ? 'deleted' : 'allowed'}.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    antigroupmention: {
      description: 'Toggle anti-group-mention',
      usage: '.antigroupmention on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antigroupmention', 'off');
            return reply(`*Anti-Group-Mention:* ${current}\n\nUsage: *.antigroupmention on/off*`);
          }
          db.setGroupSetting(jid, 'antigroupmention', action);
          await reply(`✅ Anti-group-mention is now *${action}*.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    antimessage: {
      description: 'Toggle anti-message (auto-delete non-admin messages)',
      usage: '.antimessage on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antimessage', 'off');
            return reply(`*Anti-Message:* ${current}\n\nUsage: *.antimessage on/off*`);
          }
          db.setGroupSetting(jid, 'antimessage', action);
          await reply(`✅ Anti-message is now *${action}*. Non-admin messages will be ${action === 'on' ? 'auto-deleted' : 'allowed'}.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    antisticker: {
      description: 'Toggle anti-sticker',
      usage: '.antisticker on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antisticker', 'off');
            return reply(`*Anti-Sticker:* ${current}\n\nUsage: *.antisticker on/off*`);
          }
          db.setGroupSetting(jid, 'antisticker', action);
          await reply(`✅ Anti-sticker is now *${action}*. Stickers will be ${action === 'on' ? 'deleted' : 'allowed'}.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    antitag: {
      description: 'Toggle anti-tag',
      usage: '.antitag on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antitag', 'off');
            return reply(`*Anti-Tag:* ${current}\n\nUsage: *.antitag on/off*`);
          }
          db.setGroupSetting(jid, 'antitag', action);
          await reply(`✅ Anti-tag is now *${action}*. Tag messages will be ${action === 'on' ? 'deleted' : 'allowed'}.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    antitagadmin: {
      description: 'Toggle anti-tag-admin',
      usage: '.antitagadmin on/off',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');
          const action = args[0]?.toLowerCase();
          if (!['on', 'off'].includes(action)) {
            const current = db.getGroupSetting(jid, 'antitagadmin', 'off');
            return reply(`*Anti-Tag-Admin:* ${current}\n\nUsage: *.antitagadmin on/off*`);
          }
          db.setGroupSetting(jid, 'antitagadmin', action);
          await reply(`✅ Anti-tag-admin is now *${action}*. Messages tagging admins will be ${action === 'on' ? 'deleted' : 'allowed'}.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    addgcstatus: {
      description: 'Add replied media to group status/story',
      usage: '.addgcstatus (reply to media in group)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isGroup(jid)) return reply('❌ This command only works in groups.');
          if (!isAdmin && !isOwner) return reply('❌ Only admins can use this command.');

          const { downloadContentFromMessage } = require('../mrxd-baileys');
          const ctx = msg.message?.extendedTextMessage?.contextInfo;
          const quoted = ctx?.quotedMessage;
          if (!quoted) return reply('❌ Please reply to a media message (image/video) in the group.\n\nUsage: *.addgcstatus* (reply to media)');

          let mediaType = null;
          let mediaObj = null;
          let caption = args.join(' ') || '';

          if (quoted.imageMessage) {
            mediaType = 'image';
            mediaObj = quoted.imageMessage;
          } else if (quoted.videoMessage) {
            mediaType = 'video';
            mediaObj = quoted.videoMessage;
          } else if (quoted.viewOnceMessage?.message?.imageMessage) {
            mediaType = 'image';
            mediaObj = quoted.viewOnceMessage.message.imageMessage;
          } else if (quoted.viewOnceMessage?.message?.videoMessage) {
            mediaType = 'video';
            mediaObj = quoted.viewOnceMessage.message.videoMessage;
          } else {
            return reply('❌ Only image and video media can be added to group status.\n\nReply to an image or video with *.addgcstatus*');
          }

          // Download the media
          const stream = await downloadContentFromMessage(mediaObj, mediaType);
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const mediaBuffer = Buffer.concat(buffer);

          // Post to WhatsApp status
          if (mediaType === 'image') {
            await sock.sendMessage('status@broadcast', {
              image: mediaBuffer,
              caption: caption || `📸 ${groupMetadata?.subject || 'Group Status'}`
            });
          } else if (mediaType === 'video') {
            await sock.sendMessage('status@broadcast', {
              video: mediaBuffer,
              caption: caption || `🎬 ${groupMetadata?.subject || 'Group Status'}`
            });
          }

          // Also save to group status tracking
          let gcStatus = JSON.parse(db.getGroupSetting(jid, 'gc_status', '[]'));
          gcStatus.push({
            type: mediaType,
            addedBy: sender,
            addedAt: Date.now(),
            caption: caption || ''
          });
          db.setGroupSetting(jid, 'gc_status', JSON.stringify(gcStatus));

          await reply(`✅ ${mediaType === 'image' ? 'Image' : 'Video'} added to group status!\n📱 Posted to WhatsApp story.\n📊 Total group statuses: ${gcStatus.length}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
