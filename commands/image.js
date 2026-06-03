const axios = require('axios');
const { getBuffer } = require('../lib/utils');

module.exports = {
  category: 'IMAGE',
  commands: {
    remini: {
      description: 'Enhance image quality',
      usage: '.remini (reply to image)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const { downloadContentFromMessage } = require('../mrxd-baileys');
          let imageMsg = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
          if (!imageMsg) return reply('❌ Please reply to an image to enhance.\n\nUsage: *.remini* (reply to image)');
          await reply('🖼️ Enhancing image...');
          const stream = await downloadContentFromMessage(imageMsg, 'image');
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const imgBuffer = Buffer.concat(buffer);
          try {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('image', imgBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
            const response = await axios.post('https://api.remini.ai/v1/enhance', form, {
              headers: { ...form.getHeaders() },
              timeout: 60000,
              maxContentLength: 50 * 1024 * 1024
            });
            if (response.data?.output_url) {
              const enhancedBuffer = await getBuffer(response.data.output_url);
              await replyImage(enhancedBuffer, '✨ *Enhanced Image*');
              return;
            }
          } catch {}
          try {
            // Use ffmpeg for basic upscale since jimp is removed (native module)
            const { execSync } = require('child_process');
            const fs = require('fs');
            const path = require('path');
            const tmpDir = path.join(__dirname, '..', 'tmp');
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
            const crypto = require('crypto');
            const inp = path.join(tmpDir, crypto.randomBytes(8).toString('hex') + '.jpg');
            const outp = path.join(tmpDir, crypto.randomBytes(8).toString('hex') + '.jpg');
            fs.writeFileSync(inp, imgBuffer);
            execSync(`ffmpeg -y -i "${inp}" -vf "scale=iw*2:ih*2:flags=lanczos" -q:v 2 "${outp}"`, { timeout: 15000 });
            const enhancedBuffer = fs.readFileSync(outp);
            try { fs.unlinkSync(inp); } catch {}
            try { fs.unlinkSync(outp); } catch {}
            await replyImage(enhancedBuffer, '✨ *Enhanced Image*\n⚠️ Basic upscaling applied');
          } catch {
            await replyImage(imgBuffer, '✨ *Enhanced Image*\n⚠️ Could not enhance further');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    wallpaper: {
      description: 'Search and download wallpaper',
      usage: '.wallpaper <search term>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const query = args.join(' ') || 'nature';
          await reply(`🖼️ Searching for "${query}" wallpaper...`);
          try {
            const { data } = await axios.get(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${process.env.UNSPLASH_ACCESS_KEY || ''}`, { timeout: 15000 });
            if (data?.urls?.regular) {
              const buffer = await getBuffer(data.urls.regular);
              await replyImage(buffer, `🖼️ *${data.alt_description || query}*\n📸 By: ${data.user?.name || 'Unknown'}`);
              return;
            }
          } catch {}
          try {
            const buffer = await getBuffer(`https://source.unsplash.com/1920x1080/?${encodeURIComponent(query)}`);
            if (buffer && buffer.length > 5000) {
              await replyImage(buffer, `🖼️ *Wallpaper: ${query}*`);
              return;
            }
          } catch {}
          try {
            const buffer = await getBuffer(`https://image.pollinations.ai/prompt/${encodeURIComponent(query + ' beautiful wallpaper 4k hd landscape')}/width/1920/height/1080?nologo=true`);
            if (buffer && buffer.length > 5000) {
              await replyImage(buffer, `🖼️ *Wallpaper: ${query}*\n⚠️ AI-generated`);
              return;
            }
          } catch {}
          await reply('❌ Could not find wallpaper. Try a different search term.');
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
