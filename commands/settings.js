const { formatBytes } = require('../lib/utils');

function createToggleCommand(settingKey, displayName, description) {
  return {
    description: description || `Toggle ${displayName}`,
    usage: `.${settingKey} on/off`,
    execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
      const jid = msg.key.remoteJid;
      const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
      try {
        if (!isOwner) return reply('❌ Owner only.');
        const action = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(action)) {
          const current = db.getSetting(settingKey, 'false');
          return reply(`*${displayName}:* ${current === 'true' ? 'ON ✅' : 'OFF ❌'}\n\nUsage: *.${settingKey} on/off*`);
        }
        db.setSetting(settingKey, action === 'on' ? 'true' : 'false');
        await reply(`✅ ${displayName} is now *${action.toUpperCase()}*`);
      } catch (err) { await reply(`❌ Error: ${err.message}`); }
    }
  };
}

function createSetCommand(settingKey, displayName, description) {
  return {
    description: description || `Set ${displayName}`,
    usage: `.${settingKey} <value>`,
    execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
      const jid = msg.key.remoteJid;
      const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
      try {
        if (!isOwner) return reply('❌ Owner only.');
        const value = args.join(' ');
        if (!value) {
          const current = db.getSetting(settingKey, 'not set');
          return reply(`*${displayName}:* ${current}\n\nUsage: *.${settingKey} <value>*`);
        }
        db.setSetting(settingKey, value);
        await reply(`✅ ${displayName} set to *${value}*`);
      } catch (err) { await reply(`❌ Error: ${err.message}`); }
    }
  };
}

module.exports = {
  category: 'SETTINGS',
  commands: {
    addbadword: {
      description: 'Add bad word to filter list',
      usage: '.addbadword <word>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const word = args.join(' ').toLowerCase();
          if (!word) return reply('❌ Please provide a word.\n\nUsage: *.addbadword <word>*');
          const words = db.addBadword(word);
          await reply(`✅ Added "${word}" to bad words list.\n📋 Total bad words: ${words.length}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    addcountrycode: {
      description: 'Add country code',
      usage: '.addcountrycode <code>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const code = args[0];
          if (!code) return reply('❌ Please provide a country code.\n\nUsage: *.addcountrycode 255*');
          db.addCountryCode(code);
          await reply(`✅ Added country code: ${code}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    addignorelist: {
      description: 'Add to ignore list',
      usage: '.addignorelist <jid>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const target = args[0] || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
          if (!target) return reply('❌ Please provide a JID.\n\nUsage: *.addignorelist <jid>*');
          db.addIgnoreList(target);
          await reply(`✅ Added ${target} to ignore list.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    addsudo: {
      description: 'Add sudo user',
      usage: '.addsudo @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const target = mentioned[0] || (args[0] ? `${args[0].replace(/[^0-9]/g, '')}@s.whatsapp.net` : null);
          if (!target) return reply('❌ Please mention a user or provide a number.\n\nUsage: *.addsudo @user*');
          db.addSudo(target);
          await reply(`✅ Added @${target.split('@')[0]} to sudo users.`, { mentions: [target] });
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    alwaysonline: createToggleCommand('alwaysonline', 'Always Online', 'Toggle always online presence'),

    antibug: createToggleCommand('antibug', 'Anti-Bug', 'Toggle anti-bug protection'),

    anticall: createToggleCommand('anticall', 'Anti-Call', 'Toggle anti-call (reject incoming calls)'),

    antidelete: createToggleCommand('antidelete', 'Anti-Delete', 'Toggle anti-delete (recover deleted messages)'),

    antideletestatus: createToggleCommand('antideletestatus', 'Anti-Delete Status', 'Toggle anti-delete for status'),

    antiedit: createToggleCommand('antiedit', 'Anti-Edit', 'Toggle anti-edit (show original edited messages)'),

    antiviewonce: createToggleCommand('antiviewonce', 'Anti-View-Once', 'Toggle anti-view-once (save view-once media)'),

    autobio: createToggleCommand('autobio', 'Auto Bio', 'Toggle auto bio update'),

    autoblock: createToggleCommand('autoblock', 'Auto Block', 'Toggle auto block unknown callers'),

    autoreact: createToggleCommand('autoreact', 'Auto React', 'Toggle auto react to messages'),

    autoreactstatus: createToggleCommand('autoreact_status', 'Auto React Status', 'Toggle auto react to status'),

    autoread: createToggleCommand('autoread', 'Auto Read', 'Toggle auto read messages'),

    autorecord: createToggleCommand('autorecord', 'Auto Record', 'Toggle auto recording presence'),

    autorecordtyping: createToggleCommand('autorecordtyping', 'Auto Record+Typing', 'Toggle auto recording and typing presence'),

    autotype: createToggleCommand('autotype', 'Auto Type', 'Toggle auto typing presence'),

    autoviewstatus: createToggleCommand('autosave_status', 'Auto View Status', 'Toggle auto view status'),

    chatbot: createToggleCommand('chatbot', 'Chatbot Mode', 'Toggle chatbot mode (respond to all messages)'),

    delanticallmsg: {
      description: 'Delete anti-call message setting',
      usage: '.delanticallmsg',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          db.delSetting('anticall_msg');
          await reply('✅ Anti-call message reset to default.');
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    delcountrycode: {
      description: 'Delete country code',
      usage: '.delcountrycode <code>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const code = args[0];
          if (!code) return reply('❌ Please provide a country code.\n\nUsage: *.delcountrycode 255*');
          db.delCountryCode(code);
          await reply(`✅ Removed country code: ${code}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    deletebadword: {
      description: 'Delete a bad word',
      usage: '.deletebadword <word>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const word = args.join(' ').toLowerCase();
          if (!word) return reply('❌ Please provide a word.\n\nUsage: *.deletebadword <word>*');
          const words = db.delBadword(word);
          await reply(`✅ Removed "${word}" from bad words list.\n📋 Remaining: ${words.length}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    delgoodbye: {
      description: 'Delete goodbye message',
      usage: '.delgoodbye',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          db.delSetting('goodbye');
          await reply('✅ Goodbye message reset to default.');
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    delignorelist: {
      description: 'Remove from ignore list',
      usage: '.delignorelist <jid>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const target = args[0];
          if (!target) return reply('❌ Please provide a JID.\n\nUsage: *.delignorelist <jid>*');
          db.delIgnoreList(target);
          await reply(`✅ Removed ${target} from ignore list.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    delsudo: {
      description: 'Remove sudo user',
      usage: '.delsudo @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const target = mentioned[0] || (args[0] ? `${args[0].replace(/[^0-9]/g, '')}@s.whatsapp.net` : null);
          if (!target) return reply('❌ Please mention a user or provide a number.\n\nUsage: *.delsudo @user*');
          db.delSudo(target);
          await reply(`✅ Removed @${target.split('@')[0]} from sudo users.`, { mentions: [target] });
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    delwelcome: {
      description: 'Delete welcome message',
      usage: '.delwelcome',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          db.delSetting('welcome');
          await reply('✅ Welcome message reset to default.');
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    getsettings: {
      description: 'Show all current settings',
      usage: '.getsettings',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const settings = db.getAllSettings();
          let list = '⚙️ *Bot Settings*\n\n';
          const categories = {
            'General': ['prefix', 'mode', 'owner', 'owner_name', 'bot_name', 'timezone', 'version'],
            'Auto': ['autoread', 'autoreact', 'autotype', 'autorecord', 'autobio', 'alwaysonline', 'chatbot', 'autoblock'],
            'Anti': ['anticall', 'antidelete', 'antiedit', 'antiviewonce', 'antibug'],
            'Status': ['autosave_status', 'autoreact_status', 'status_emoji', 'status_delay'],
            'Messages': ['welcome', 'goodbye', 'anticall_msg', 'warn_limit'],
            'Sticker': ['sticker_author', 'sticker_packname'],
            'Other': ['watermark', 'font', 'menu_style', 'country_codes']
          };
          for (const [category, keys] of Object.entries(categories)) {
            list += `*${category}:*\n`;
            for (const key of keys) {
              if (settings[key] !== undefined) {
                const value = settings[key].length > 50 ? settings[key].slice(0, 50) + '...' : settings[key];
                list += `  ${key}: ${value}\n`;
              }
            }
            list += '\n';
          }
          await reply(list);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    listcountrycode: {
      description: 'List country codes',
      usage: '.listcountrycode',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const codes = db.getCountryCodes();
          await reply(`📋 *Country Codes*\n\n${codes.join(', ')}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    listwarn: {
      description: 'List all warnings',
      usage: '.listwarn',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const warnings = db.getAllWarnings();
          if (warnings.length === 0) return reply('📋 No active warnings.');
          let list = '📋 *Active Warnings*\n\n';
          warnings.forEach((w, i) => {
            list += `${i + 1}. @${w.jid.split('@')[0]} - ${w.count} warning(s)\n`;
          });
          await sock.sendMessage(jid, { text: list, mentions: warnings.map(w => w.jid) });
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    mode: {
      description: 'Set bot mode (public/private)',
      usage: '.mode public/private',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const newMode = args[0]?.toLowerCase();
          if (!['public', 'private'].includes(newMode)) {
            const current = db.getSetting('mode', 'public');
            return reply(`*Current Mode:* ${current}\n\nUsage: *.mode public/private*\n\n📌 *Public:* Everyone can use commands\n📌 *Private:* Only owner/sudo can use commands`);
          }
          db.setSetting('mode', newMode);
          await reply(`✅ Mode changed to *${newMode}*\n${newMode === 'private' ? '🔒 Only owner/sudo users can use commands now.' : '🔓 Everyone can use commands now.'}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    resetsetting: {
      description: 'Reset a setting',
      usage: '.resetsetting <key>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const key = args[0];
          if (!key) return reply('❌ Please provide a setting key.\n\nUsage: *.resetsetting <key>*');
          db.delSetting(key);
          await reply(`✅ Setting *${key}* has been reset.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    resetwarn: {
      description: 'Reset warnings for a user',
      usage: '.resetwarn @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const target = mentioned[0] || (args[0] ? `${args[0].replace(/[^0-9]/g, '')}@s.whatsapp.net` : null);
          if (!target) return reply('❌ Please mention a user.\n\nUsage: *.resetwarn @user*');
          db.resetWarning(target);
          await reply(`✅ Warnings reset for @${target.split('@')[0]}`, { mentions: [target] });
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    setanticallmsg: createSetCommand('anticall_msg', 'Anti-Call Message', 'Set anti-call rejection message'),

    setbotname: createSetCommand('bot_name', 'Bot Name', 'Set bot display name'),

    setcontextlink: createSetCommand('context_link', 'Context Link', 'Set context link for messages'),

    setfont: createSetCommand('font', 'Font Style', 'Set font style'),

    setgoodbye: createSetCommand('goodbye', 'Goodbye Message', 'Set goodbye message template'),

    setmenu: createSetCommand('menu_style', 'Menu Style', 'Set menu display style'),

    setmenuimage: createSetCommand('menu_image', 'Menu Image', 'Set menu image URL'),

    setownername: createSetCommand('owner_name', 'Owner Name', 'Set owner display name'),

    setownernumber: {
      description: 'Set owner phone number',
      usage: '.setownernumber <number>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const number = args[0]?.replace(/[^0-9]/g, '');
          if (!number) return reply('❌ Please provide a phone number.\n\nUsage: *.setownernumber 255712345678*');
          db.setSetting('owner', number);
          await reply(`✅ Owner number set to *${number}*`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    setprefix: {
      description: 'Set command prefix',
      usage: '.setprefix <prefix>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const newPrefix = args[0];
          if (!newPrefix) return reply(`*Current prefix:* ${db.getSetting('prefix', '.')}\n\nUsage: *.setprefix !*`);
          db.setSetting('prefix', newPrefix);
          await reply(`✅ Prefix changed to *${newPrefix}*`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    setstatusemoji: createSetCommand('status_emoji', 'Status Emoji', 'Set auto-react emoji for status'),

    setstickerauthor: createSetCommand('sticker_author', 'Sticker Author', 'Set sticker author name'),

    setstickerpackname: createSetCommand('sticker_packname', 'Sticker Pack Name', 'Set sticker pack name'),

    settimezone: createSetCommand('timezone', 'Timezone', 'Set bot timezone'),

    setwarn: {
      description: 'Set warning limit',
      usage: '.setwarn <number>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const limit = parseInt(args[0]);
          if (!limit || limit < 1) return reply(`*Current warn limit:* ${db.getSetting('warn_limit', '3')}\n\nUsage: *.setwarn 5*`);
          db.setSetting('warn_limit', limit.toString());
          await reply(`✅ Warning limit set to *${limit}*`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    setwatermark: createSetCommand('watermark', 'Watermark', 'Set watermark text'),

    setwelcome: createSetCommand('welcome', 'Welcome Message', 'Set welcome message template'),

    showanticallmsg: {
      description: 'Show anti-call message',
      usage: '.showanticallmsg',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const msg2 = db.getSetting('anticall_msg', 'Calls are not allowed by the bot owner!');
          await reply(`📋 *Anti-Call Message:*\n\n${msg2}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    showgoodbye: {
      description: 'Show goodbye message',
      usage: '.showgoodbye',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const msg2 = db.getSetting('goodbye', 'Goodbye @user from @group!');
          await reply(`📋 *Goodbye Message:*\n\n${msg2}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    showwelcome: {
      description: 'Show welcome message',
      usage: '.showwelcome',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const msg2 = db.getSetting('welcome', 'Welcome @user to @group!');
          await reply(`📋 *Welcome Message:*\n\n${msg2}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    statusdelay: {
      description: 'Set status view delay',
      usage: '.statusdelay <seconds>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const delay = parseInt(args[0]);
          if (isNaN(delay) || delay < 0) return reply(`*Current status delay:* ${db.getSetting('status_delay', '0')}s\n\nUsage: *.statusdelay 5*`);
          db.setSetting('status_delay', delay.toString());
          await reply(`✅ Status delay set to *${delay} seconds*`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    statussettings: {
      description: 'Show status-related settings',
      usage: '.statussettings',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const result = `📱 *Status Settings*\n\n` +
            `👁️ Auto View: ${db.getSetting('autosave_status', 'false') === 'true' ? 'ON ✅' : 'OFF ❌'}\n` +
            `😀 Auto React: ${db.getSetting('autoreact_status', 'false') === 'true' ? 'ON ✅' : 'OFF ❌'}\n` +
            `⏱️ Delay: ${db.getSetting('status_delay', '0')}s\n` +
            `😀 Emoji: ${db.getSetting('status_emoji', '🔥')}`;
          await reply(result);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    testanticallmsg: {
      description: 'Test anti-call message',
      usage: '.testanticallmsg',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const msg2 = db.getSetting('anticall_msg', 'Calls are not allowed by the bot owner!');
          await reply(`🔔 *Anti-Call Test Message:*\n\n${msg2}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    testgoodbye: {
      description: 'Test goodbye message',
      usage: '.testgoodbye',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const template = db.getSetting('goodbye', 'Goodbye @user from @group!');
          const groupMeta = groupMetadata || {};
          const replaced = template
            .replace(/@user/g, `@${sender.split('@')[0]}`)
            .replace(/@group/g, groupMeta.subject || 'this group')
            .replace(/@desc/g, groupMeta.desc || '');
          await reply(`👋 *Goodbye Test:*\n\n${replaced}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    testwelcome: {
      description: 'Test welcome message',
      usage: '.testwelcome',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const template = db.getSetting('welcome', 'Welcome @user to @group!');
          const groupMeta = groupMetadata || {};
          const replaced = template
            .replace(/@user/g, `@${sender.split('@')[0]}`)
            .replace(/@group/g, groupMeta.subject || 'this group')
            .replace(/@desc/g, groupMeta.desc || '');
          await reply(`👋 *Welcome Test:*\n\n${replaced}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    }
  }
};
