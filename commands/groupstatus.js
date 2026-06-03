const { isGroup } = require('../lib/utils');

module.exports = {
  category: 'GROUPSTATUS',
  commands: {
    fetchgroups: {
      description: 'List all groups the bot is in',
      usage: '.fetchgroups',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Only the owner can use this command.');
          const chats = await sock.groupFetchAllParticipating();
          const groups = Object.entries(chats);
          if (groups.length === 0) return reply('📋 Bot is not in any groups.');
          let list = `📋 *Groups (${groups.length})*\n\n`;
          for (const [gid, meta] of groups) {
            list += `📌 *${meta.subject}*\n`;
            list += `   Members: ${meta.participants?.length || 0}\n`;
            list += `   JID: ${gid}\n\n`;
          }
          if (list.length > 60000) {
            list = list.slice(0, 60000) + '\n\n... and more';
          }
          await reply(list);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    tosgroup: {
      description: 'Send message to all groups',
      usage: '.tosgroup <message>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Only the owner can use this command.');
          const text = args.join(' ');
          if (!text) return reply('❌ Please provide a message.\n\nUsage: *.tosgroup <message>*');
          const chats = await sock.groupFetchAllParticipating();
          const groups = Object.keys(chats);
          if (groups.length === 0) return reply('❌ Bot is not in any groups.');
          let sent = 0;
          for (const gid of groups) {
            try {
              await sock.sendMessage(gid, { text: `📢 *Broadcast*\n\n${text}` });
              sent++;
              await new Promise(r => setTimeout(r, 2000));
            } catch {}
          }
          await reply(`✅ Message sent to ${sent}/${groups.length} groups.`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
