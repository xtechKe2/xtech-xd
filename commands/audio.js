const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { downloadContentFromMessage } = require('../mrxd-baileys');
const { getRandom } = require('../lib/utils');

const TMP_DIR = path.join(__dirname, '..', 'tmp');

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

async function downloadMedia(msg) {
  ensureTmpDir();
  let mediaMsg = msg.message;
  let mediaType = null;
  let mimeType = null;

  if (mediaMsg.imageMessage) {
    mediaType = 'image';
    mimeType = mediaMsg.imageMessage.mimetype;
  } else if (mediaMsg.videoMessage) {
    mediaType = 'video';
    mimeType = mediaMsg.videoMessage.mimetype;
  } else if (mediaMsg.audioMessage) {
    mediaType = 'audio';
    mimeType = mediaMsg.audioMessage.mimetype;
  } else if (mediaMsg.stickerMessage) {
    mediaType = 'sticker';
    mimeType = mediaMsg.stickerMessage.mimetype;
  } else if (mediaMsg.documentMessage) {
    mediaType = 'document';
    mimeType = mediaMsg.documentMessage.mimetype;
  } else if (mediaMsg.extendedTextMessage?.contextInfo?.quotedMessage) {
    const quoted = mediaMsg.extendedTextMessage.contextInfo.quotedMessage;
    if (quoted.audioMessage) { mediaType = 'audio'; mediaMsg = quoted; mimeType = quoted.audioMessage.mimetype; }
    else if (quoted.videoMessage) { mediaType = 'video'; mediaMsg = quoted; mimeType = quoted.videoMessage.mimetype; }
    else if (quoted.imageMessage) { mediaType = 'image'; mediaMsg = quoted; mimeType = quoted.imageMessage.mimetype; }
    else if (quoted.stickerMessage) { mediaType = 'sticker'; mediaMsg = quoted; mimeType = quoted.stickerMessage.mimetype; }
    else if (quoted.documentMessage) { mediaType = 'document'; mediaMsg = quoted; mimeType = quoted.documentMessage.mimetype; }
  }

  if (!mediaType) return null;

  const mediaObj = mediaMsg[mediaType + 'Message'] || mediaMsg;
  const stream = await downloadContentFromMessage(mediaObj, mediaType);
  const buffer = [];
  for await (const chunk of stream) buffer.push(chunk);
  const finalBuffer = Buffer.concat(buffer);

  const ext = mimeType ? mimeType.split('/')[1] : 'bin';
  const inputPath = path.join(TMP_DIR, `${getRandom(ext)}`);
  fs.writeFileSync(inputPath, finalBuffer);
  return { path: inputPath, type: mediaType, mime: mimeType, buffer: finalBuffer };
}

function runFFmpeg(inputPath, outputPath, args) {
  const cmd = `ffmpeg -y -i "${inputPath}" ${args} "${outputPath}"`;
  execSync(cmd, { stdio: 'pipe', timeout: 120000 });
  return outputPath;
}

function createAudioCommand(filterArgs, effectName) {
  return async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const replyAudio = (buffer) => sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: msg });
    try {
      const media = await downloadMedia(msg);
      if (!media) return reply(`❌ Please reply to an audio/video message.\n\nUsage: *${config?.prefix || '.'}${effectName}* (reply to audio)`);
      if (!['audio', 'video'].includes(media.type)) {
        fs.unlinkSync(media.path);
        return reply('❌ Please reply to an audio or video message.');
      }
      await reply(`🎵 Applying ${effectName} effect...`);
      const outputPath = path.join(TMP_DIR, `${getRandom('mp3')}`);
      runFFmpeg(media.path, outputPath, filterArgs);
      if (!fs.existsSync(outputPath)) {
        fs.unlinkSync(media.path);
        return reply('❌ Failed to process audio.');
      }
      const outputBuffer = fs.readFileSync(outputPath);
      await replyAudio(outputBuffer);
      fs.unlinkSync(media.path);
      fs.unlinkSync(outputPath);
    } catch (err) {
      await reply(`❌ Error: ${err.message}`);
    }
  };
}

module.exports = {
  category: 'AUDIO',
  commands: {
    bass: {
      description: 'Add bass boost to audio',
      usage: '.bass (reply to audio)',
      execute: createAudioCommand('-af "bass=g=15:f=100:w=0.3"', 'bass')
    },

    blown: {
      description: 'Blow/distort audio',
      usage: '.blown (reply to audio)',
      execute: createAudioCommand('-af "acrusher=.1:1:64:0:log"', 'blown')
    },

    deep: {
      description: 'Deepen audio voice',
      usage: '.deep (reply to audio)',
      execute: createAudioCommand('-af "atempo=0.9,asetrate=44100*0.7,aresample=44100"', 'deep')
    },

    earrape: {
      description: 'Earrape effect',
      usage: '.earrape (reply to audio)',
      execute: createAudioCommand('-af "bass=g=30:f=50:w=0.2,volume=5"', 'earrape')
    },

    reverse: {
      description: 'Reverse audio',
      usage: '.reverse (reply to audio)',
      execute: createAudioCommand('-af "areverse"', 'reverse')
    },

    robot: {
      description: 'Robot voice effect',
      usage: '.robot (reply to audio)',
      execute: createAudioCommand('-af "asetrate=44100*0.5,atempo=2,asetrate=44100*1.5,atempo=0.667,aresample=44100"', 'robot')
    },

    tomp3: {
      description: 'Convert video/audio to mp3',
      usage: '.tomp3 (reply to audio/video)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyAudio = (buffer) => sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: msg });
        try {
          const media = await downloadMedia(msg);
          if (!media) return reply('❌ Please reply to an audio/video message.\n\nUsage: *.tomp3* (reply to audio/video)');
          await reply('🎵 Converting to MP3...');
          const outputPath = path.join(TMP_DIR, `${getRandom('mp3')}`);
          runFFmpeg(media.path, outputPath, '-vn -ab 128k -ar 44100 -ac 2');
          if (!fs.existsSync(outputPath)) {
            fs.unlinkSync(media.path);
            return reply('❌ Failed to convert audio.');
          }
          const outputBuffer = fs.readFileSync(outputPath);
          await replyAudio(outputBuffer);
          fs.unlinkSync(media.path);
          fs.unlinkSync(outputPath);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    toptt: {
      description: 'Convert audio to voice note (PTT)',
      usage: '.toptt (reply to audio)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const media = await downloadMedia(msg);
          if (!media) return reply('❌ Please reply to an audio message.\n\nUsage: *.toptt* (reply to audio)');
          await reply('🎤 Converting to voice note...');
          const outputPath = path.join(TMP_DIR, `${getRandom('ogg')}`);
          runFFmpeg(media.path, outputPath, '-vn -c:a libopus -b:a 64k -ar 16000 -ac 1');
          if (!fs.existsSync(outputPath)) {
            fs.unlinkSync(media.path);
            return reply('❌ Failed to convert audio.');
          }
          const outputBuffer = fs.readFileSync(outputPath);
          await sock.sendMessage(jid, { audio: outputBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: msg });
          fs.unlinkSync(media.path);
          fs.unlinkSync(outputPath);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    volaudio: {
      description: 'Adjust audio volume',
      usage: '.volaudio <1-10> (reply to audio)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyAudio = (buffer) => sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: msg });
        try {
          const volume = parseFloat(args[0]) || 2;
          if (volume < 0.1 || volume > 10) return reply('❌ Volume must be between 0.1 and 10.\n\nUsage: *.volaudio 2* (reply to audio)');
          const media = await downloadMedia(msg);
          if (!media) return reply('❌ Please reply to an audio/video message.\n\nUsage: *.volaudio <level>* (reply to audio)');
          if (!['audio', 'video'].includes(media.type)) {
            fs.unlinkSync(media.path);
            return reply('❌ Please reply to an audio or video message.');
          }
          await reply(`🎵 Adjusting volume to ${volume}x...`);
          const outputPath = path.join(TMP_DIR, `${getRandom('mp3')}`);
          runFFmpeg(media.path, outputPath, `-af "volume=${volume}"`);
          if (!fs.existsSync(outputPath)) {
            fs.unlinkSync(media.path);
            return reply('❌ Failed to adjust volume.');
          }
          const outputBuffer = fs.readFileSync(outputPath);
          await replyAudio(outputBuffer);
          fs.unlinkSync(media.path);
          fs.unlinkSync(outputPath);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
