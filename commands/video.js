const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { downloadContentFromMessage } = require('../mrxd-baileys');
const { getRandom } = require('../lib/utils');

const TMP_DIR = path.join(__dirname, '..', 'tmp');
function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

module.exports = {
  category: 'VIDEO',
  commands: {
    toaudio: {
      description: 'Convert video to audio',
      usage: '.toaudio (reply to video)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyAudio = (buffer) => sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: msg });
        try {
          let videoMsg = msg.message?.videoMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
          if (!videoMsg) return reply('❌ Please reply to a video message.\n\nUsage: *.toaudio* (reply to video)');
          await reply('🎵 Converting video to audio...');
          ensureTmpDir();
          const stream = await downloadContentFromMessage(videoMsg, 'video');
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const inputBuffer = Buffer.concat(buffer);
          const inputPath = path.join(TMP_DIR, `${getRandom('mp4')}`);
          const outputPath = path.join(TMP_DIR, `${getRandom('mp3')}`);
          fs.writeFileSync(inputPath, inputBuffer);
          try {
            execSync(`ffmpeg -y -i "${inputPath}" -vn -ab 128k -ar 44100 -ac 2 "${outputPath}"`, { timeout: 120000 });
            const outputBuffer = fs.readFileSync(outputPath);
            await replyAudio(outputBuffer);
          } catch (err) {
            await reply(`❌ Failed to convert video to audio: ${err.message}`);
          }
          try { fs.unlinkSync(inputPath); } catch {}
          try { fs.unlinkSync(outputPath); } catch {}
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    tovideo: {
      description: 'Convert sticker/image to video',
      usage: '.tovideo (reply to sticker/image)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyVideo = (buffer, caption) => sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
        try {
          let mediaMsg = msg.message;
          let mediaType = null;
          if (mediaMsg.imageMessage) mediaType = 'image';
          else if (mediaMsg.stickerMessage) mediaType = 'sticker';
          else if (mediaMsg.videoMessage) mediaType = 'video';
          else {
            const quoted = mediaMsg.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted?.imageMessage) { mediaType = 'image'; mediaMsg = quoted; }
            else if (quoted?.stickerMessage) { mediaType = 'sticker'; mediaMsg = quoted; }
            else if (quoted?.videoMessage) { mediaType = 'video'; mediaMsg = quoted; }
          }
          if (!mediaType) return reply('❌ Please reply to an image or sticker.\n\nUsage: *.tovideo* (reply to image/sticker)');
          if (mediaType === 'video') return reply('❌ The media is already a video.');
          await reply('🎬 Converting to video...');
          ensureTmpDir();
          const mediaObj = mediaMsg[mediaType + 'Message'] || mediaMsg;
          const stream = await downloadContentFromMessage(mediaObj, mediaType);
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const inputBuffer = Buffer.concat(buffer);
          const ext = mediaType === 'sticker' ? 'webp' : 'png';
          const inputPath = path.join(TMP_DIR, `${getRandom(ext)}`);
          const outputPath = path.join(TMP_DIR, `${getRandom('mp4')}`);
          fs.writeFileSync(inputPath, inputBuffer);
          try {
            execSync(`ffmpeg -y -loop 1 -i "${inputPath}" -c:v libx264 -t 5 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -r 30 "${outputPath}"`, { timeout: 30000 });
            const outputBuffer = fs.readFileSync(outputPath);
            await replyVideo(outputBuffer, '🎬 *Converted to Video*');
          } catch (err) {
            await reply(`❌ Failed to convert: ${err.message}`);
          }
          try { fs.unlinkSync(inputPath); } catch {}
          try { fs.unlinkSync(outputPath); } catch {}
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    volvideo: {
      description: 'Adjust video volume',
      usage: '.volvideo <1-10> (reply to video)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyVideo = (buffer, caption) => sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
        try {
          const volume = parseFloat(args[0]) || 2;
          if (volume < 0.1 || volume > 10) return reply('❌ Volume must be between 0.1 and 10.\n\nUsage: *.volvideo 2* (reply to video)');
          let videoMsg = msg.message?.videoMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
          if (!videoMsg) return reply('❌ Please reply to a video message.\n\nUsage: *.volvideo <level>* (reply to video)');
          await reply(`🎬 Adjusting video volume to ${volume}x...`);
          ensureTmpDir();
          const stream = await downloadContentFromMessage(videoMsg, 'video');
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const inputBuffer = Buffer.concat(buffer);
          const inputPath = path.join(TMP_DIR, `${getRandom('mp4')}`);
          const outputPath = path.join(TMP_DIR, `${getRandom('mp4')}`);
          fs.writeFileSync(inputPath, inputBuffer);
          try {
            execSync(`ffmpeg -y -i "${inputPath}" -af "volume=${volume}" -c:v copy "${outputPath}"`, { timeout: 120000 });
            const outputBuffer = fs.readFileSync(outputPath);
            if (outputBuffer.length > 60 * 1024 * 1024) {
              await reply('❌ Output video too large (max 60MB).');
            } else {
              await replyVideo(outputBuffer, `🎬 *Volume Adjusted (${volume}x)*`);
            }
          } catch (err) {
            await reply(`❌ Failed to adjust volume: ${err.message}`);
          }
          try { fs.unlinkSync(inputPath); } catch {}
          try { fs.unlinkSync(outputPath); } catch {}
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
