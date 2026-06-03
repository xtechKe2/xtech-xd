const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getBuffer, getRandom } = require('../lib/utils');

const TMP_DIR = path.join(__dirname, '..', 'tmp');
function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

async function ephoto360Request(effectUrl, text1, text2 = '') {
  try {
    const response = await axios.post('https://en.ephoto360.com/effect/create-image', {
      text_1: text1,
      text_2: text2,
      url_effect: effectUrl
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://en.ephoto360.com/'
      },
      timeout: 30000
    });
    if (response.data?.image) {
      return response.data.image.startsWith('http') ? response.data.image : `https://en.ephoto360.com${response.data.image}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function textEffectAPI(effectName, text1, text2 = '') {
  try {
    const response = await axios.get('https://api.popcat.xyz/textart', {
      params: { text: text1 },
      timeout: 15000
    });
    if (response.data?.image) return response.data.image;
  } catch {}
  try {
    const url = `https://api.lightxai.com/api/v1/textEffect?effect=${encodeURIComponent(effectName)}&text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`;
    const response = await axios.get(url, { timeout: 15000 });
    if (response.data?.imageUrl) return response.data.imageUrl;
  } catch {}
  try {
    const url = `https://flamingtext.com/net-fu/effects/${effectName}/logo.cgi?script=${effectName}&text=${encodeURIComponent(text1)}&symbol_tag=gold&font=arial&_js=1`;
    const { data } = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const imgMatch = data.match(/src="(\/logos\/[^"]+)"/);
    if (imgMatch) return `https://flamingtext.com${imgMatch[1]}`;
  } catch {}
  return null;
}

async function generatePollinationsImage(prompt) {
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=256&nologo=true`;
    const buffer = await getBuffer(url);
    if (buffer && buffer.length > 2000) return buffer;
  } catch {}
  return null;
}

function createEphotoCommand(name, effectId, description, needsTwoTexts = false) {
  return {
    description: description,
    usage: needsTwoTexts ? `.${name} <text1>|<text2>` : `.${name} <text>`,
    execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
      const jid = msg.key.remoteJid;
      const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
      const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
      try {
        const input = args.join(' ');
        if (!input) return reply(`❌ Please provide text.\n\nUsage: *.${name} <text>*`);
        let text1 = input, text2 = '';
        if (needsTwoTexts && input.includes('|')) {
          const parts = input.split('|');
          text1 = parts[0].trim();
          text2 = parts[1].trim();
        }
        await reply('🎨 Creating text effect...');
        const imageUrl = await ephoto360Request(effectId, text1, text2);
        if (imageUrl) {
          try {
            const buffer = await getBuffer(imageUrl);
            await replyImage(buffer, `🎨 *${name} Effect*`);
            return;
          } catch {}
        }
        const altUrl = await textEffectAPI(name, text1, text2);
        if (altUrl) {
          try {
            const buffer = await getBuffer(altUrl);
            await replyImage(buffer, `🎨 *${name} Effect*`);
            return;
          } catch {}
        }
        const prompt = `Create a stunning text effect image with the text "${text1}"${text2 ? ` and "${text2}"` : ''} in ${name.replace(/([A-Z])/g, ' $1').trim()} style, professional typography design, high quality`;
        const buffer = await generatePollinationsImage(prompt);
        if (buffer) {
          await replyImage(buffer, `🎨 *${name} Effect*\n⚠️ AI-generated approximation`);
        } else {
          await reply('❌ Failed to create text effect. Try again later.');
        }
      } catch (err) {
        await reply(`❌ Error: ${err.message}`);
      }
    }
  };
}

function createComingSoonCommand(name) {
  return {
    description: `${name} text effect (coming soon)`,
    usage: `.${name} <text>`,
    execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
      const jid = msg.key.remoteJid;
      const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
      const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
      try {
        const input = args.join(' ');
        if (!input) return reply(`❌ Please provide text.\n\nUsage: *.${name} <text>*`);
        await reply('🎨 Creating text effect...');
        const prompt = `Create a stunning text effect image with the text "${input}" in ${name.replace(/([A-Z])/g, ' $1').trim()} style, professional typography design, vibrant colors, high quality`;
        const buffer = await generatePollinationsImage(prompt);
        if (buffer) {
          await replyImage(buffer, `🎨 *${name} Effect*\n⚠️ AI-generated preview`);
        } else {
          await reply(`⏳ *${name}* effect is coming soon! Stay tuned.`);
        }
      } catch (err) {
        await reply(`❌ Error: ${err.message}`);
      }
    }
  };
}

const WORKING_EFFECTS = {
  '1917style': '/write-text-on-1917-style-475',
  'blackpinklogo': '/create-blackpink-logo-online-free-424',
  'glitchtext': '/create-glitch-text-effects-online-635',
  'glowingtext': '/write-text-on-glowing-effects-374',
  'gradienttext': '/create-gradient-text-effect-online-587',
  'luxurygold': '/create-luxury-gold-text-effect-online-578',
  'neon': '/create-neon-light-text-effect-online-575',
  'writetext': '/write-text-on-475',
  'galaxywallpaper': '/create-galaxy-wallpaper-with-name-online-496',
  'graffiti': '/create-cool-graffiti-text-effect-online-585'
};

const COMING_SOON_EFFECTS = [
  'advancedglow', 'blackpinkstyle', 'cartoonstyle', 'deletingtext',
  'dragonball', 'effectclouds', 'flag3dtext', 'flagtext', 'freecreate',
  'galaxystyle', 'incandescent', 'lighteffects', 'logomaker',
  'makingneon', 'matrix', 'multicoloredneon', 'neonglitch',
  'papercutstyle', 'pixelglitch', 'royaltext', 'sand',
  'summerbeach', 'topography', 'typography', 'watercolortext'
];

const commands = {};

for (const [name, effectId] of Object.entries(WORKING_EFFECTS)) {
  commands[name] = createEphotoCommand(name, effectId, `Create ${name.replace(/([A-Z])/g, ' $1').trim()} text effect`);
}

for (const name of COMING_SOON_EFFECTS) {
  commands[name] = createComingSoonCommand(name);
}

module.exports = {
  category: 'EPHOTO360',
  commands
};
