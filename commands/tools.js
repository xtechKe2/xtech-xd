const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getBuffer, isUrl, getRandom, numberToJid } = require('../lib/utils');
const { downloadContentFromMessage } = require('../mrxd-baileys');

const TMP_DIR = path.join(__dirname, '..', 'tmp');
function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

module.exports = {
  category: 'TOOLS',
  commands: {
    browse: {
      description: 'Browse a website and get text content',
      usage: '.browse <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || !isUrl(url)) return reply('❌ Please provide a valid URL.\n\nUsage: *.browse <url>*');
          await reply('🌐 Browsing website...');
          const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 20000
          });
          const cheerio = require('cheerio');
          const $ = cheerio.load(data);
          $('script, style, noscript, iframe, nav, footer, header').remove();
          const title = $('title').text().trim();
          const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000);
          if (!text) return reply('❌ Could not extract text from the website.');
          let result = `🌐 *${title || url}*\n\n${text}`;
          if (text.length >= 4000) result += '\n\n... (truncated)';
          await reply(result);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    calculate: {
      description: 'Calculate math expression',
      usage: '.calculate <expression>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const expression = args.join(' ');
          if (!expression) return reply('❌ Please provide a math expression.\n\nUsage: *.calculate 2+2* or *.calculate sin(45)*');
          const math = require('mathjs');
          const result = math.evaluate(expression);
          await reply(`🧮 *Calculator*\n\n📝 Expression: ${expression}\n✅ Result: *${result}*`);
        } catch (err) {
          await reply(`❌ Invalid expression: ${err.message}`);
        }
      }
    },

    device: {
      description: 'Get device info from phone number',
      usage: '.device <number>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const number = args[0]?.replace(/[^0-9+]/g, '');
          if (!number) return reply('❌ Please provide a phone number.\n\nUsage: *.device +254712345678*');
          const Phone = require('awesome-phonenumber');
          const pn = new Phone(number);
          if (!pn.isValid()) return reply('❌ Invalid phone number.');
          const result = `📱 *Phone Info*\n\n` +
            `🔢 Number: ${pn.getNumber('international')}\n` +
            `🌍 Country: ${pn.getRegionCode() || 'Unknown'}\n` +
            `📞 Type: ${pn.getType() || 'Unknown'}\n` +
            `✅ Valid: ${pn.isValid() ? 'Yes' : 'No'}\n` +
            `📱 Mobile: ${pn.isMobile() ? 'Yes' : 'No'}`;
          await reply(result);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    emojimix: {
      description: 'Mix two emojis',
      usage: '.emojimix 😀+😂',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replySticker = (buffer) => sock.sendMessage(jid, { sticker: buffer }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const input = args.join('');
          if (!input || !input.includes('+')) return reply('❌ Please provide two emojis separated by +\n\nUsage: *.emojimix 😀+😂*');
          const [emoji1, emoji2] = input.split('+').map(e => e.trim());
          if (!emoji1 || !emoji2) return reply('❌ Please provide two emojis.');
          try {
            const url = `https://emoji-api.com/emojis?search=${encodeURIComponent(emoji1)}&access_key=free`;
            const emojiData = require('emoji-name-map');
          } catch {}
          try {
            const codePoint1 = [...emoji1].map(c => c.codePointAt(0).toString(16)).join('-');
            const codePoint2 = [...emoji2].map(c => c.codePointAt(0).toString(16)).join('-');
            const mixUrl = `https://www.google.com/userevents/async?emoji1=${codePoint1}&emoji2=${codePoint2}`;
            const imageUrl = `https://emogeez.herokuapp.com/api/v1/emojiMix?emoji1=${codePoint1}&emoji2=${codePoint2}`;
            const buffer = await getBuffer(imageUrl).catch(() => null);
            if (buffer && buffer.length > 500) {
              await replySticker(buffer);
              return;
            }
          } catch {}
          try {
            const { data } = await axios.get(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(emoji1 + emoji2)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQmUaKJszLbY4&limit=1`, { timeout: 10000 });
            if (data?.results?.[0]?.media_formats?.webp?.url) {
              const buffer = await getBuffer(data.results[0].media_formats.webp.url);
              await replySticker(buffer);
              return;
            }
          } catch {}
          await reply(`🤷 Could not mix ${emoji1} and ${emoji2}. Try different emojis.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    fancy: {
      description: 'Convert text to fancy fonts',
      usage: '.fancy <text>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const text = args.join(' ');
          if (!text) return reply('❌ Please provide text.\n\nUsage: *.fancy <text>*');
          const fonts = [
            { name: 'Script', convert: (t) => t.split('').map(c => {
              const map = {'a':'𝓪','b':'𝓫','c':'𝓬','d':'𝓭','e':'𝓮','f':'𝓯','g':'𝓰','h':'𝓱','i':'𝓲','j':'𝓳','k':'𝓴','l':'𝓵','m':'𝓶','n':'𝓷','o':'𝓸','p':'𝓹','q':'𝓺','r':'𝓻','s':'𝓼','t':'𝓽','u':'𝓾','v':'𝓿','w':'𝔀','x':'𝔁','y':'𝔂','z':'𝔃'};
              return map[c.toLowerCase()] || c;
            }).join('') },
            { name: 'Bubble', convert: (t) => t.split('').map(c => {
              const map = {'a':'ⓐ','b':'ⓑ','c':'ⓒ','d':'ⓓ','e':'ⓔ','f':'ⓕ','g':'ⓖ','h':'ⓗ','i':'ⓘ','j':'ⓙ','k':'ⓚ','l':'ⓛ','m':'ⓜ','n':'ⓝ','o':'ⓞ','p':'ⓟ','q':'ⓠ','r':'ⓡ','s':'ⓢ','t':'ⓣ','u':'ⓤ','v':'ⓥ','w':'ⓦ','x':'ⓧ','y':'ⓨ','z':'ⓩ'};
              return map[c.toLowerCase()] || c;
            }).join('') },
            { name: 'Square', convert: (t) => t.split('').map(c => {
              const map = {'a':'🄰','b':'🄱','c':'🄲','d':'🄳','e':'🄴','f':'🄵','g':'🄶','h':'🄷','i':'🄸','j':'🄹','k':'🄺','l':'🄻','m':'🄼','n':'🄽','o':'🄾','p':'🄿','q':'🅀','r':'🅁','s':'🅂','t':'🅃','u':'🅄','v':'🅅','w':'🅆','x':'🅇','y':'🅈','z':'🅉'};
              return map[c.toLowerCase()] || c;
            }).join('') },
            { name: 'Monospace', convert: (t) => t.split('').map(c => {
              const map = {'a':'𝚊','b':'𝚋','c':'𝚌','d':'𝚍','e':'𝚎','f':'𝚏','g':'𝚐','h':'𝚑','i':'𝚒','j':'𝚓','k':'𝚔','l':'𝚕','m':'𝚖','n':'𝚗','o':'𝚘','p':'𝚙','q':'𝚚','r':'𝚛','s':'𝚜','t':'𝚝','u':'𝚞','v':'𝚟','w':'𝚠','x':'𝚡','y':'𝚢','z':'𝚣'};
              return map[c.toLowerCase()] || c;
            }).join('') },
            { name: 'Bold Sans', convert: (t) => t.split('').map(c => {
              const map = {'a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶','j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇'};
              return map[c.toLowerCase()] || c;
            }).join('') }
          ];
          let result = `✨ *Fancy Text*\n\n`;
          fonts.forEach(font => {
            result += `*${font.name}:* ${font.convert(text)}\n\n`;
          });
          await reply(result);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    filtervcf: {
      description: 'Filter VCF contacts',
      usage: '.filtervcf <country code> (reply to vcf)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const countryCode = args[0] || '255';
          const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          if (!quoted?.documentMessage) return reply('❌ Please reply to a VCF file.\n\nUsage: *.filtervcf 254* (reply to .vcf file)');
          const stream = await downloadContentFromMessage(quoted.documentMessage, 'document');
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const vcfContent = Buffer.concat(buffer).toString('utf-8');
          const contacts = vcfContent.split('END:VCARD');
          let filtered = '';
          let count = 0;
          contacts.forEach(contact => {
            const phoneMatch = contact.match(/TEL[^:]*:(.*)/);
            if (phoneMatch) {
              const phone = phoneMatch[1].replace(/[^0-9+]/g, '');
              if (phone.startsWith(countryCode) || phone.startsWith('+' + countryCode)) {
                filtered += contact + 'END:VCARD\n';
                count++;
              }
            }
          });
          if (count === 0) return reply(`❌ No contacts found with country code ${countryCode}.`);
          const outputBuffer = Buffer.from(filtered, 'utf-8');
          await sock.sendMessage(jid, {
            document: outputBuffer,
            fileName: `filtered_${countryCode}.vcf`,
            mimetype: 'text/vcard'
          }, { quoted: msg });
          await reply(`✅ Filtered ${count} contacts with country code ${countryCode}.`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    fliptext: {
      description: 'Flip text upside down',
      usage: '.fliptext <text>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const text = args.join(' ');
          if (!text) return reply('❌ Please provide text.\n\nUsage: *.fliptext <text>*');
          const flipMap = {'a':'ɐ','b':'q','c':'ɔ','d':'p','e':'ǝ','f':'ɟ','g':'ƃ','h':'ɥ','i':'ᴉ','j':'ɾ','k':'ʞ','l':'l','m':'ɯ','n':'u','o':'o','p':'d','q':'b','r':'ɹ','s':'s','t':'ʇ','u':'n','v':'ʌ','w':'ʍ','x':'x','y':'ʎ','z':'z','A':'∀','B':'q','C':'Ɔ','D':'p','E':'Ǝ','F':'Ⅎ','G':'⅁','H':'H','I':'I','J':'ſ','K':'K','L':'˥','M':'W','N':'N','O':'O','P':'Ԁ','Q':'Ό','R':'ɹ','S':'S','T':'⊥','U':'∩','V':'Λ','W':'M','X':'X','Y':'⅄','Z':'Z','!':'¡','?':'¿','.':'˙',',':'\''};
          const flipped = text.split('').map(c => flipMap[c] || c).reverse().join('');
          await reply(`🔄 *Flipped Text*\n\n${flipped}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    genpass: {
      description: 'Generate random password',
      usage: '.genpass <length>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const length = parseInt(args[0]) || 12;
          if (length < 4 || length > 64) return reply('❌ Password length must be between 4 and 64.');
          const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
          const crypto = require('crypto');
          let password = '';
          const randomBytes = crypto.randomBytes(length);
          for (let i = 0; i < length; i++) {
            password += chars[randomBytes[i] % chars.length];
          }
          const strength = length >= 16 ? 'Strong 💪' : length >= 10 ? 'Medium 🔄' : 'Weak ⚠️';
          await reply(`🔐 *Generated Password*\n\n📝 Password: \`${password}\`\n📏 Length: ${length}\n💪 Strength: ${strength}\n\n⚠️ _Keep this password safe!_`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    getabout: {
      description: 'Get user about/bio',
      usage: '.getabout @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const target = mentioned[0] || (args[0] ? numberToJid(args[0]) : null) || sender;
          try {
            const status = await sock.fetchStatus(target);
            await reply(`📝 *About @${target.split('@')[0]}*\n\n${status?.status || 'No bio set'}`, { mentions: [target] });
          } catch {
            await reply(`❌ Could not fetch bio for @${target.split('@')[0]}. They may have privacy settings enabled.`, { mentions: [target] });
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    getpp: {
      description: 'Get user profile picture',
      usage: '.getpp @user',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const target = mentioned[0] || (args[0] ? numberToJid(args[0]) : null) || sender;
          try {
            const ppUrl = await sock.profilePictureUrl(target, 'image');
            const buffer = await getBuffer(ppUrl);
            await replyImage(buffer, `🖼️ *Profile Picture*\n📱 @${target.split('@')[0]}`);
          } catch {
            await reply(`❌ Could not fetch profile picture for @${target.split('@')[0]}. They may not have one or have privacy enabled.`, { mentions: [target] });
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    gsmarena: {
      description: 'Search phone specs on GSMArena',
      usage: '.gsmarena <phone name>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const query = args.join(' ');
          if (!query) return reply('❌ Please provide a phone name.\n\nUsage: *.gsmarena Samsung Galaxy S24*');
          await reply('📱 Searching phone specs...');
          const { data } = await axios.get(`https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
          });
          const cheerio = require('cheerio');
          const $ = cheerio.load(data);
          const firstPhone = $('.makers ul li a').first();
          const phoneName = firstPhone.find('strong').text().trim();
          const phoneLink = firstPhone.attr('href');
          if (!phoneName) return reply('❌ Phone not found. Try a different name.');
          const fullUrl = `https://www.gsmarena.com/${phoneLink}`;
          const phoneResp = await axios.get(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
          const $$ = cheerio.load(phoneResp.data);
          let specs = `📱 *${phoneName}*\n\n`;
          $$('#specs-list tr').each((i, el) => {
            const category = $$(el).find('th').text().trim();
            const key = $$(el).find('td.ttl').text().trim();
            const value = $$(el).find('td.nfo').text().trim();
            if (key && value) specs += `*${key}:* ${value}\n`;
          });
          if (specs.length > 4000) specs = specs.slice(0, 4000) + '\n... (truncated)';
          await reply(specs);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    obfuscate: {
      description: 'Obfuscate JavaScript code',
      usage: '.obfuscate <code>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const code = args.join(' ');
          if (!code) return reply('❌ Please provide JavaScript code.\n\nUsage: *.obfuscate <code>*');
          const obfuscated = code.split('').map(c => {
            const hex = c.charCodeAt(0).toString(16);
            return '\\x' + (hex.length === 1 ? '0' + hex : hex);
          }).join('');
          const evalCode = `eval("${obfuscated}")`;
          await reply(`🔒 *Obfuscated Code*\n\n\`\`\`javascript\n${evalCode}\n\`\`\``);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    qrcode: {
      description: 'Generate QR code from text',
      usage: '.qrcode <text>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const text = args.join(' ');
          if (!text) return reply('❌ Please provide text for QR code.\n\nUsage: *.qrcode <text>*');
          // Use QR code API instead of native qrcode module
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
          const buffer = await getBuffer(qrUrl);
          if (buffer && buffer.length > 500) {
            await replyImage(buffer, `📱 *QR Code*\n\nContent: ${text}`);
          } else {
            await reply('❌ Failed to generate QR code. Try again.');
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    runeval: {
      description: 'Evaluate JavaScript code',
      usage: '.runeval <code>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          if (!isOwner) return reply('❌ Owner only.');
          const code = args.join(' ');
          if (!code) return reply('❌ Please provide JavaScript code.\n\nUsage: *.runeval <code>*');
          const result = eval(code);
          await reply(`💻 *Eval Result*\n\nInput: ${code}\nOutput: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`);
        } catch (err) {
          await reply(`❌ Eval Error: ${err.message}`);
        }
      }
    },

    say: {
      description: 'Text to speech',
      usage: '.say <text>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const text = args.join(' ');
          if (!text) return reply('❌ Please provide text.\n\nUsage: *.say <text>*');
          const tts = require('google-tts-api');
          const url = tts.getAudioUrl(text, { lang: 'en', slow: false, host: 'https://translate.google.com' });
          const buffer = await getBuffer(url);
          await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: msg });
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    ssweb: {
      description: 'Screenshot website',
      usage: '.ssweb <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || !isUrl(url)) return reply('❌ Please provide a URL.\n\nUsage: *.ssweb <url>*');
          await reply('📸 Taking screenshot...');
          const ssUrl = `https://image.thum.io/get/width/1280/crop/720/${url}`;
          const buffer = await getBuffer(ssUrl);
          await replyImage(buffer, `📸 *Screenshot*\n\n🌐 URL: ${url}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    sswebpc: {
      description: 'Screenshot website (desktop)',
      usage: '.sswebpc <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || !isUrl(url)) return reply('❌ Please provide a URL.');
          await reply('📸 Taking desktop screenshot...');
          const ssUrl = `https://image.thum.io/get/width/1920/crop/1080/${url}`;
          const buffer = await getBuffer(ssUrl);
          await replyImage(buffer, `📸 *Desktop Screenshot*\n\n🌐 URL: ${url}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    sswebtab: {
      description: 'Screenshot website (tablet)',
      usage: '.sswebtab <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || !isUrl(url)) return reply('❌ Please provide a URL.');
          await reply('📸 Taking tablet screenshot...');
          const ssUrl = `https://image.thum.io/get/width/1024/crop/768/${url}`;
          const buffer = await getBuffer(ssUrl);
          await replyImage(buffer, `📸 *Tablet Screenshot*\n\n🌐 URL: ${url}`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    sticker: {
      description: 'Create sticker from image',
      usage: '.sticker (reply to image)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replySticker = (buffer) => sock.sendMessage(jid, { sticker: buffer }, { quoted: msg });
        try {
          let imageMsg = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
          let videoMsg = msg.message?.videoMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
          if (!imageMsg && !videoMsg) return reply('❌ Please reply to an image or short video.\n\nUsage: *.sticker* (reply to image)');
          const mediaType = imageMsg ? 'image' : 'video';
          const mediaObj = imageMsg || videoMsg;
          await reply('🎨 Creating sticker...');
          ensureTmpDir();
          const stream = await downloadContentFromMessage(mediaObj, mediaType);
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const inputBuffer = Buffer.concat(buffer);
          if (mediaType === 'image') {
            // Use stickerHelper which handles ffmpeg conversion + EXIF
            const packName = db.getSetting('sticker_packname', 'XTECH_KE');
            const authorName = db.getSetting('sticker_author', 'XTECH_KE');
            const { writeExifImg } = require('../lib/stickerHelper');
            try {
              const stickerBuffer = await writeExifImg(inputBuffer, { packname: packName, author: authorName });
              await replySticker(stickerBuffer);
            } catch {
              await replySticker(inputBuffer);
            }
          } else {
            const inputPath = path.join(TMP_DIR, `${getRandom('mp4')}`);
            const outputPath = path.join(TMP_DIR, `${getRandom('webp')}`);
            fs.writeFileSync(inputPath, inputBuffer);
            try {
              execSync(`ffmpeg -y -i "${inputPath}" -vcodec libwebp -lossless 1 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white" -ss 0 -t 5 -preset default -an -vsync 0 "${outputPath}"`, { timeout: 30000 });
              const stickerBuffer = fs.readFileSync(outputPath);
              await replySticker(stickerBuffer);
            } catch {
              await reply('❌ Failed to create sticker from video. Try with an image instead.');
            }
            try { fs.unlinkSync(inputPath); } catch {}
            try { fs.unlinkSync(outputPath); } catch {}
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    take: {
      description: 'Take/claim a sticker',
      usage: '.take (reply to sticker)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replySticker = (buffer) => sock.sendMessage(jid, { sticker: buffer }, { quoted: msg });
        try {
          let stickerMsg = msg.message?.stickerMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
          if (!stickerMsg) return reply('❌ Please reply to a sticker.\n\nUsage: *.take* (reply to sticker)');
          await reply('🎨 Claiming sticker...');
          const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const stickerBuffer = Buffer.concat(buffer);
          const packName = args[0] || db.getSetting('sticker_packname', 'XTECH_KE');
          const authorName = args[1] || db.getSetting('sticker_author', 'XTECH_KE');
          try {
            const { writeExifWebp } = require('../lib/stickerHelper');
            const newSticker = await writeExifWebp(stickerBuffer, { packname: packName, author: authorName });
            await replySticker(newSticker);
          } catch {
            await replySticker(stickerBuffer);
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    texttopdf: {
      description: 'Convert text to PDF',
      usage: '.texttopdf <text>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const text = args.join(' ');
          if (!text) return reply('❌ Please provide text.\n\nUsage: *.texttopdf <text>*');
          await reply('📄 Creating PDF...');
          ensureTmpDir();
          const PDFDocument = require('pdfkit');
          const outputPath = path.join(TMP_DIR, `${getRandom('pdf')}`);
          const doc = new PDFDocument();
          const stream = fs.createWriteStream(outputPath);
          doc.pipe(stream);
          doc.fontSize(12).text(text, { align: 'left' });
          doc.end();
          await new Promise(resolve => stream.on('finish', resolve));
          const buffer = fs.readFileSync(outputPath);
          await sock.sendMessage(jid, { document: buffer, fileName: 'text.pdf', mimetype: 'application/pdf' }, { quoted: msg });
          fs.unlinkSync(outputPath);
        } catch (err) {
          try {
            const pdfmake = require('pdfmake');
          } catch {}
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    tinyurl: {
      description: 'Shorten URL',
      usage: '.tinyurl <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || !isUrl(url)) return reply('❌ Please provide a URL.\n\nUsage: *.tinyurl <url>*');
          const { data } = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 10000 });
          if (data) {
            await reply(`🔗 *Shortened URL*\n\n📌 Original: ${url}\n✅ Short: ${data}`);
          } else {
            await reply('❌ Failed to shorten URL.');
          }
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    toimage: {
      description: 'Convert sticker to image',
      usage: '.toimage (reply to sticker)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          let stickerMsg = msg.message?.stickerMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
          if (!stickerMsg) return reply('❌ Please reply to a sticker.\n\nUsage: *.toimage* (reply to sticker)');
          const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const stickerBuffer = Buffer.concat(buffer);
          ensureTmpDir();
          const inputPath = path.join(TMP_DIR, `${getRandom('webp')}`);
          const outputPath = path.join(TMP_DIR, `${getRandom('png')}`);
          fs.writeFileSync(inputPath, stickerBuffer);
          try {
            execSync(`ffmpeg -y -i "${inputPath}" "${outputPath}"`, { timeout: 15000 });
            const imageBuffer = fs.readFileSync(outputPath);
            await replyImage(imageBuffer, '🖼️ *Converted to Image*');
          } catch {
            await reply('❌ Failed to convert sticker to image. Make sure ffmpeg is installed.');
          }
          try { fs.unlinkSync(inputPath); } catch {}
          try { fs.unlinkSync(outputPath); } catch {}
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    tourl: {
      description: 'Upload file and get URL',
      usage: '.tourl (reply to media)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          let mediaMsg = msg.message;
          let mediaType = null;
          if (mediaMsg.imageMessage) mediaType = 'image';
          else if (mediaMsg.videoMessage) mediaType = 'video';
          else if (mediaMsg.audioMessage) mediaType = 'audio';
          else if (mediaMsg.stickerMessage) mediaType = 'sticker';
          else if (mediaMsg.documentMessage) mediaType = 'document';
          else {
            const quoted = mediaMsg.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted?.imageMessage) { mediaType = 'image'; mediaMsg = quoted; }
            else if (quoted?.videoMessage) { mediaType = 'video'; mediaMsg = quoted; }
            else if (quoted?.audioMessage) { mediaType = 'audio'; mediaMsg = quoted; }
            else if (quoted?.stickerMessage) { mediaType = 'sticker'; mediaMsg = quoted; }
            else if (quoted?.documentMessage) { mediaType = 'document'; mediaMsg = quoted; }
          }
          if (!mediaType) return reply('❌ Please reply to media.\n\nUsage: *.tourl* (reply to image/video/audio)');
          await reply('📤 Uploading...');
          const mediaObj = mediaMsg[mediaType + 'Message'] || mediaMsg;
          const stream = await downloadContentFromMessage(mediaObj, mediaType);
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const fileBuffer = Buffer.concat(buffer);
          const FormData = require('form-data');
          const form = new FormData();
          const ext = mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'mp3' : mediaType === 'sticker' ? 'webp' : 'bin';
          form.append('file', fileBuffer, { filename: `file.${ext}` });
          try {
            const { data } = await axios.post('https://telegra.ph/upload', form, {
              headers: { ...form.getHeaders() },
              timeout: 30000
            });
            if (data?.[0]?.src) {
              const url = `https://telegra.ph${data[0].src}`;
              await reply(`🔗 *File URL*\n\n${url}\n\n📏 Size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
              return;
            }
          } catch {}
          try {
            const { data } = await axios.post('https://api.imgur.com/3/upload', form, {
              headers: { Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID || '546c25a59c58ad7'}`, ...form.getHeaders() },
              timeout: 30000
            });
            if (data?.data?.link) {
              await reply(`🔗 *File URL*\n\n${data.data.link}\n\n📏 Size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
              return;
            }
          } catch {}
          await reply('❌ Failed to upload file. Try again later.');
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    },

    vcc: {
      description: 'Generate virtual credit card number',
      usage: '.vcc',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const crypto = require('crypto');
          const prefixes = ['4', '5', '3'];
          const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
          let cardNumber = prefix;
          for (let i = 1; i < 16; i++) {
            cardNumber += Math.floor(Math.random() * 10);
          }
          const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
          const year = new Date().getFullYear() + Math.floor(Math.random() * 5) + 1;
          const cvv = String(Math.floor(Math.random() * 900) + 100);
          await reply(`💳 *Virtual Card Generated*\n\n🔢 Card: ${cardNumber.replace(/(.{4})/g, '$1 ').trim()}\n📅 Expiry: ${month}/${year}\n🔒 CVV: ${cvv}\n\n⚠️ _This is a randomly generated number for educational/testing purposes only. It is NOT a real credit card._`);
        } catch (err) { await reply(`❌ Error: ${err.message}`); }
      }
    }
  }
};
