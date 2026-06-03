module.exports = {
  category: 'SUPPORT',
  commands: {
    feedback: {
      description: 'Send feedback to owner',
      usage: '.feedback <message>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const fb = args.join(' ');
          if (!fb) return reply('📝 Send your feedback:\n\nUsage: *.feedback Your message here*');
          const ownerNum = db.getSetting('owner', '255712345678');
          const ownerJid = `${ownerNum}@s.whatsapp.net`;
          const pushName = msg.pushName || 'Unknown';
          try {
            await sock.sendMessage(ownerJid, {
              text: `📩 *New Feedback*\n\n*From:* ${pushName}\n*JID:* ${sender}\n*Message:* ${fb}`
            });
            await reply('✅ Thank you for your feedback! The owner has been notified.');
          } catch {
            db.setSetting(`feedback_${Date.now()}`, JSON.stringify({ from: sender, message: fb, pushName }));
            await reply('✅ Feedback saved! The owner will review it soon.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    helpers: {
      description: 'List helper/sudo users',
      usage: '.helpers',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const prefix = db.getSetting('prefix', '.');
          const { getTotalCommands } = require('../lib/menu');
          const totalCmds = getTotalCommands();
          const sudoUsers = db.getSudo();
          let help = `🤝 *XTECH_KE Bot Help*\n\n` +
            `*Prefix:* ${prefix}\n` +
            `*Total Commands:* ${totalCmds}\n\n` +
            `*Quick Commands:*\n` +
            `• ${prefix}menu - Show main menu\n` +
            `• ${prefix}allmenu - Show all commands\n` +
            `• ${prefix}listmenu - Show categories\n` +
            `• ${prefix}ping - Check bot speed\n` +
            `• ${prefix}runtime - Bot uptime\n` +
            `• ${prefix}owner - Owner info\n` +
            `• ${prefix}feedback - Send feedback\n\n`;
          if (sudoUsers.length > 0) {
            help += `*Sudo/Helper Users:*\n`;
            sudoUsers.forEach((jid, i) => {
              help += `${i + 1}. @${jid.split('@')[0]}\n`;
            });
            await sock.sendMessage(jid, { text: help, mentions: sudoUsers });
          } else {
            help += `*No helper users configured.*`;
            await reply(help);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
