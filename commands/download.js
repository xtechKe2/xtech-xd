const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { getBuffer, isUrl, extractUrls, getRandom } = require('../lib/utils');
const { downloadContentFromMessage } = require('../mrxd-baileys');

const TMP_DIR = path.join(__dirname, '..', 'tmp');
function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function getQuotedMsg(msg) {
  try {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (ctx?.quotedMessage) {
      return {
        message: ctx.quotedMessage,
        key: {
          remoteJid: msg.key.remoteJid,
          fromMe: ctx.participant === msg.key.remoteJid,
          id: ctx.stanzaId,
          participant: ctx.participant
        }
      };
    }
  } catch {}
  return null;
}

module.exports = {
  category: 'DOWNLOAD',
  commands: {
    apk: {
      description: 'Download APK from APKPure',
      usage: '.apk <app name>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const appName = args.join(' ');
          if (!appName) return reply('❌ Please provide an app name.\n\nUsage: *.apk <app name>*');
          await reply(`🔍 Searching for "${appName}" on APKPure...`);
          const searchUrl = `https://apkpure.com/search?q=${encodeURIComponent(appName)}`;
          const { data } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
          });
          const $ = cheerio.load(data);
          const firstResult = $('a.search-title').first();
          const appUrl = firstResult.attr('href');
          const appTitle = firstResult.text().trim();
          if (!appUrl) return reply('❌ App not found. Try a different name.');
          const fullUrl = appUrl.startsWith('http') ? appUrl : `https://apkpure.com${appUrl}`;
          const downloadUrl = `${fullUrl}/download`;
          const response = await axios.get(downloadUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000,
            maxRedirects: 5
          });
          const $$ = cheerio.load(response.data);
          const apkLink = $$('#download_link').attr('href') || $$('a.btn-download').attr('href');
          if (apkLink) {
            await reply(`📱 *${appTitle}*\n\n📦 Download Link:\n${apkLink.startsWith('http') ? apkLink : `https://apkpure.com${apkLink}`}\n\n⬇️ Download from APKPure`);
          } else {
            await reply(`📱 *${appTitle}*\n\n🔗 App Page:\n${fullUrl}\n\n⚠️ Direct download link not found. Visit the page to download.`);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    download: {
      description: 'General downloader (detect URL type)',
      usage: '.download <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const url = args[0] || extractUrls(args.join(' '))[0];
          if (!url) return reply('❌ Please provide a URL.\n\nUsage: *.download <url>*');
          if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) {
            const tiktokCmd = module.exports.commands.tiktok;
            return tiktokCmd.execute(sock, msg, [url], { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config });
          }
          if (url.includes('instagram.com') || url.includes('instagr.am')) {
            const igCmd = module.exports.commands.instagram;
            return igCmd.execute(sock, msg, [url], { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config });
          }
          if (url.includes('facebook.com') || url.includes('fb.watch')) {
            const fbCmd = module.exports.commands.facebook;
            return fbCmd.execute(sock, msg, [url], { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config });
          }
          if (url.includes('twitter.com') || url.includes('x.com')) {
            const twCmd = module.exports.commands.twitter;
            return twCmd.execute(sock, msg, [url], { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config });
          }
          if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const songCmd = module.exports.commands.song;
            return songCmd.execute(sock, msg, [url], { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config });
          }
          if (url.includes('pinterest.com') || url.includes('pin.it')) {
            const pinCmd = module.exports.commands.pin;
            return pinCmd.execute(sock, msg, [url], { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config });
          }
          await reply('❌ Unsupported URL. Try specific commands: .tiktok, .instagram, .facebook, .twitter, .song, .video');
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    facebook: {
      description: 'Download Facebook video',
      usage: '.facebook <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyVideo = (buffer, caption) => sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || !url.includes('facebook.com') && !url.includes('fb.watch')) return reply('❌ Please provide a Facebook video URL.\n\nUsage: *.facebook <url>*');
          await reply('📥 Downloading Facebook video...');
          const apiUrl = `https://api.fabdl.com/facebook/video?url=${encodeURIComponent(url)}`;
          const { data } = await axios.get(apiUrl, { timeout: 30000 });
          if (data?.result?.download_url) {
            const videoBuffer = await getBuffer(data.result.download_url);
            await replyVideo(videoBuffer, `📹 *Facebook Video*`);
          } else {
            try {
              const altUrl = `https://co.wuk.sh/api/json`;
              const { data: d2 } = await axios.post(altUrl, { url }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
              if (d2?.url) {
                const videoBuffer = await getBuffer(d2.url);
                await replyVideo(videoBuffer, '📹 *Facebook Video*');
              } else {
                await reply('❌ Failed to download Facebook video.');
              }
            } catch {
              await reply('❌ Failed to download Facebook video. The video may be private or the URL is invalid.');
            }
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    gdrive: {
      description: 'Download from Google Drive',
      usage: '.gdrive <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyDocument = (buffer, filename, mimetype) => sock.sendMessage(jid, { document: buffer, fileName: filename, mimetype }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || !url.includes('drive.google.com')) return reply('❌ Please provide a Google Drive URL.\n\nUsage: *.gdrive <url>*');
          await reply('📥 Downloading from Google Drive...');
          let fileId = '';
          const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
          const match2 = url.match(/id=([a-zA-Z0-9_-]+)/);
          if (match1) fileId = match1[1];
          else if (match2) fileId = match2[1];
          else return reply('❌ Invalid Google Drive URL.');
          const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
          const response = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            maxRedirects: 5,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 60000
          });
          const contentType = response.headers['content-type'] || 'application/octet-stream';
          if (contentType.includes('text/html')) {
            const html = Buffer.from(response.data).toString();
            const confirmMatch = html.match(/confirm=([0-9]+)/);
            if (confirmMatch) {
              const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${fileId}`;
              const resp2 = await axios.get(confirmUrl, { responseType: 'arraybuffer', maxRedirects: 5, timeout: 120000 });
              const filename = `gdrive_${fileId.slice(0, 8)}`;
              await replyDocument(Buffer.from(resp2.data), filename, resp2.headers['content-type'] || 'application/octet-stream');
            } else {
              await reply('❌ File may be too large or requires permission.');
            }
          } else {
            const filename = `gdrive_${fileId.slice(0, 8)}`;
            await replyDocument(Buffer.from(response.data), filename, contentType);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    gitclone: {
      description: 'Clone a git repo as zip',
      usage: '.gitclone <repo url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyDocument = (buffer, filename, mimetype) => sock.sendMessage(jid, { document: buffer, fileName: filename, mimetype }, { quoted: msg });
        try {
          const repoUrl = args[0];
          if (!repoUrl || !repoUrl.includes('github.com')) return reply('❌ Please provide a GitHub repo URL.\n\nUsage: *.gitclone <github url>*');
          await reply('📦 Cloning repository...');
          let downloadUrl = repoUrl.replace(/\.git$/, '');
          if (downloadUrl.endsWith('/')) downloadUrl = downloadUrl.slice(0, -1);
          downloadUrl += '/archive/refs/heads/main.zip';
          let buffer;
          try {
            buffer = await getBuffer(downloadUrl);
          } catch {
            downloadUrl = repoUrl.replace(/\.git$/, '').replace(/\/$/, '') + '/archive/refs/heads/master.zip';
            buffer = await getBuffer(downloadUrl);
          }
          const repoName = repoUrl.split('/').pop().replace('.git', '');
          await replyDocument(buffer, `${repoName}.zip`, 'application/zip');
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    image: {
      description: 'Download image from URL',
      usage: '.image <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || !isUrl(url)) return reply('❌ Please provide an image URL.\n\nUsage: *.image <url>*');
          await reply('🖼️ Downloading image...');
          const buffer = await getBuffer(url);
          await replyImage(buffer, '🖼️ *Downloaded Image*');
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    instagram: {
      description: 'Download Instagram media',
      usage: '.instagram <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyVideo = (buffer, caption) => sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || (!url.includes('instagram.com') && !url.includes('instagr.am'))) return reply('❌ Please provide an Instagram URL.\n\nUsage: *.instagram <url>*');
          await reply('📥 Downloading Instagram media...');
          const apiUrl = `https://api.fabdl.com/instagram/media?url=${encodeURIComponent(url)}`;
          const { data } = await axios.get(apiUrl, { timeout: 30000 }).catch(() => ({ data: null }));
          if (data?.result?.download_url) {
            const buffer = await getBuffer(data.result.download_url);
            if (data.result.type === 'video') {
              await replyVideo(buffer, '📸 *Instagram Media*');
            } else {
              await replyImage(buffer, '📸 *Instagram Media*');
            }
          } else {
            try {
              const apiUrl2 = `https://ig-downloader.com/api/v1/instagram?url=${encodeURIComponent(url)}`;
              const resp = await axios.get(apiUrl2, { timeout: 30000 });
              const mediaUrl = resp.data?.medias?.[0]?.url || resp.data?.url;
              if (mediaUrl) {
                const buffer = await getBuffer(mediaUrl);
                await replyVideo(buffer, '📸 *Instagram Media*');
              } else {
                await reply('❌ Failed to download Instagram media. The post may be private.');
              }
            } catch {
              await reply('❌ Failed to download Instagram media. Try again later.');
            }
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    itunes: {
      description: 'Search and get iTunes song info',
      usage: '.itunes <song name>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const query = args.join(' ');
          if (!query) return reply('❌ Please provide a song name.\n\nUsage: *.itunes <song name>*');
          const { data } = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=5&entity=song`, { timeout: 15000 });
          if (!data.results || data.results.length === 0) return reply('❌ No results found.');
          let result = '🎵 *iTunes Search Results*\n\n';
          data.results.forEach((track, i) => {
            result += `*${i + 1}. ${track.trackName}*\n`;
            result += `  🎤 Artist: ${track.artistName}\n`;
            result += `  💿 Album: ${track.collectionName}\n`;
            result += `  🎵 Preview: ${track.previewUrl || 'N/A'}\n`;
            result += `  🔗 Link: ${track.trackViewUrl}\n\n`;
          });
          await reply(result);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    mediafire: {
      description: 'Download from MediaFire',
      usage: '.mediafire <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyDocument = (buffer, filename, mimetype) => sock.sendMessage(jid, { document: buffer, fileName: filename, mimetype }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || !url.includes('mediafire.com')) return reply('❌ Please provide a MediaFire URL.\n\nUsage: *.mediafire <url>*');
          await reply('📥 Downloading from MediaFire...');
          const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
          const $ = cheerio.load(data);
          const downloadLink = $('a#downloadButton').attr('href') || $('a.download_link').attr('href');
          const fileName = $('div.filename').text().trim() || $('div.dl-btn-label').attr('title') || 'mediafire_download';
          if (!downloadLink) return reply('❌ Could not find download link. File may be private or deleted.');
          const buffer = await getBuffer(downloadLink);
          const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
          if (buffer.length > 100 * 1024 * 1024) return reply(`❌ File too large (${sizeMB}MB). Maximum is 100MB.`);
          await replyDocument(buffer, fileName, 'application/octet-stream');
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    pin: {
      description: 'Download Pinterest image/video',
      usage: '.pin <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        const replyVideo = (buffer, caption) => sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || (!url.includes('pinterest.com') && !url.includes('pin.it'))) return reply('❌ Please provide a Pinterest URL.\n\nUsage: *.pin <url>*');
          await reply('📥 Downloading Pinterest media...');
          try {
            const apiUrl = `https://api.fabdl.com/pinterest/media?url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });
            if (data?.result?.download_url) {
              const buffer = await getBuffer(data.result.download_url);
              if (data.result.type === 'video') {
                await replyVideo(buffer, '📌 *Pinterest Media*');
              } else {
                await replyImage(buffer, '📌 *Pinterest Media*');
              }
              return;
            }
          } catch {}
          const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000,
            maxRedirects: 5
          });
          const $ = cheerio.load(response.data);
          const ogImage = $('meta[property="og:image"]').attr('content');
          const ogVideo = $('meta[property="og:video"]').attr('content');
          if (ogVideo) {
            const buffer = await getBuffer(ogVideo);
            await replyVideo(buffer, '📌 *Pinterest Media*');
          } else if (ogImage) {
            const buffer = await getBuffer(ogImage);
            await replyImage(buffer, '📌 *Pinterest Media*');
          } else {
            await reply('❌ Could not find Pinterest media.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    savestatus: {
      description: 'Save viewed status',
      usage: '.savestatus (reply to status)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          if (!quoted) return reply('❌ Please reply to a status message.\n\nUsage: *.savestatus* (reply to status)');
          ensureTmpDir();
          let mediaType = null;
          let mediaObj = null;
          if (quoted.imageMessage) { mediaType = 'image'; mediaObj = quoted.imageMessage; }
          else if (quoted.videoMessage) { mediaType = 'video'; mediaObj = quoted.videoMessage; }
          else if (quoted.audioMessage) { mediaType = 'audio'; mediaObj = quoted.audioMessage; }
          else if (quoted.stickerMessage) { mediaType = 'sticker'; mediaObj = quoted.stickerMessage; }
          else return reply('❌ No media found in the replied message.');
          const stream = await downloadContentFromMessage(mediaObj, mediaType);
          const buffer = [];
          for await (const chunk of stream) buffer.push(chunk);
          const finalBuffer = Buffer.concat(buffer);
          const caption = '📱 *Saved Status*';
          if (mediaType === 'image') {
            await sock.sendMessage(jid, { image: finalBuffer, caption }, { quoted: msg });
          } else if (mediaType === 'video') {
            await sock.sendMessage(jid, { video: finalBuffer, caption }, { quoted: msg });
          } else if (mediaType === 'audio') {
            await sock.sendMessage(jid, { audio: finalBuffer, mimetype: 'audio/mp4' }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { sticker: finalBuffer }, { quoted: msg });
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    song: {
      description: 'Download song from YouTube',
      usage: '.song <name/url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyAudio = (buffer) => sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: msg });
        try {
          const query = args.join(' ');
          if (!query) return reply('❌ Please provide a song name or URL.\n\nUsage: *.song <name/url>*');
          await reply('🔍 Searching for song...');
          const yts = require('yt-search');
          let video;
          if (query.match(/youtube\.com|youtu\.be/)) {
            const urlMatch = query.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (urlMatch) {
              video = await yts({ videoId: urlMatch[1] });
            } else {
              return reply('❌ Invalid YouTube URL.');
            }
          } else {
            const search = await yts(query);
            if (!search.videos || search.videos.length === 0) return reply('❌ No results found.');
            video = search.videos[0];
          }
          await reply(`🎵 Downloading: *${video.title}*\n⏱️ Duration: ${video.timestamp}`);
          const ytdl = require('ytdl-core');
          ensureTmpDir();
          const outputPath = path.join(TMP_DIR, `${getRandom('mp3')}`);
          const stream = ytdl(video.url, { quality: 'highestaudio', filter: 'audioonly' });
          const writeStream = fs.createWriteStream(outputPath);
          await new Promise((resolve, reject) => {
            stream.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
            stream.on('error', reject);
          });
          const buffer = fs.readFileSync(outputPath);
          if (buffer.length > 60 * 1024 * 1024) {
            fs.unlinkSync(outputPath);
            return reply('❌ Audio file too large (max 60MB).');
          }
          await replyAudio(buffer);
          fs.unlinkSync(outputPath);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    song2: {
      description: 'Alternative song downloader',
      usage: '.song2 <name/url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyDocument = (buffer, filename, mimetype) => sock.sendMessage(jid, { document: buffer, fileName: filename, mimetype }, { quoted: msg });
        try {
          const query = args.join(' ');
          if (!query) return reply('❌ Please provide a song name or URL.\n\nUsage: *.song2 <name/url>*');
          await reply('🔍 Searching for song...');
          const yts = require('yt-search');
          let video;
          if (query.match(/youtube\.com|youtu\.be/)) {
            const urlMatch = query.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (urlMatch) video = await yts({ videoId: urlMatch[1] });
            else return reply('❌ Invalid YouTube URL.');
          } else {
            const search = await yts(query);
            if (!search.videos || search.videos.length === 0) return reply('❌ No results found.');
            video = search.videos[0];
          }
          await reply(`🎵 Downloading: *${video.title}*\n⏱️ Duration: ${video.timestamp}`);
          const ytdl = require('ytdl-core');
          ensureTmpDir();
          const outputPath = path.join(TMP_DIR, `${getRandom('mp3')}`);
          const stream = ytdl(video.url, { quality: 'highestaudio', filter: 'audioonly' });
          const writeStream = fs.createWriteStream(outputPath);
          await new Promise((resolve, reject) => {
            stream.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
            stream.on('error', reject);
          });
          const buffer = fs.readFileSync(outputPath);
          const safeTitle = video.title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50);
          await replyDocument(buffer, `${safeTitle}.mp3`, 'audio/mpeg');
          fs.unlinkSync(outputPath);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    telesticker: {
      description: 'Download Telegram sticker pack',
      usage: '.telesticker <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replySticker = (buffer) => sock.sendMessage(jid, { sticker: buffer }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || !url.includes('t.me')) return reply('❌ Please provide a Telegram sticker pack URL.\n\nUsage: *.telesticker <url>*');
          await reply('📥 Fetching sticker pack...');
          const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
          const $ = cheerio.load(data);
          const stickerImages = [];
          $('img').each((i, el) => {
            const src = $(el).attr('src');
            if (src && (src.includes('sticker') || src.includes('webp'))) {
              stickerImages.push(src);
            }
          });
          if (stickerImages.length === 0) return reply('❌ No stickers found in the pack.');
          const limit = Math.min(stickerImages.length, 5);
          await reply(`📦 Found ${stickerImages.length} stickers. Sending first ${limit}...`);
          for (let i = 0; i < limit; i++) {
            try {
              const buffer = await getBuffer(stickerImages[i]);
              await replySticker(buffer);
            } catch {}
          }
          if (stickerImages.length > limit) {
            await reply(`📦 Showing ${limit} of ${stickerImages.length} stickers.`);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    tiktok: {
      description: 'Download TikTok video',
      usage: '.tiktok <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyVideo = (buffer, caption) => sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || (!url.includes('tiktok.com') && !url.includes('vm.tiktok.com'))) return reply('❌ Please provide a TikTok URL.\n\nUsage: *.tiktok <url>*');
          await reply('📥 Downloading TikTok video...');
          const apiUrl = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`;
          const { data } = await axios.get(apiUrl, { timeout: 30000 }).catch(async () => {
            const altUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
            return await axios.get(altUrl, { timeout: 30000 });
          });
          const videoUrl = data?.video || data?.data?.play || data?.result?.video;
          const desc = data?.desc || data?.data?.title || data?.result?.desc || 'TikTok Video';
          const author = data?.author?.nickname || data?.data?.author?.nickname || '';
          if (videoUrl) {
            const buffer = await getBuffer(videoUrl);
            await replyVideo(buffer, `🎵 *TikTok Video*\n${author ? `👤 ${author}\n` : ''}📝 ${desc}`);
          } else {
            await reply('❌ Failed to download TikTok video.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    tiktokaudio: {
      description: 'Download TikTok audio',
      usage: '.tiktokaudio <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyAudio = (buffer) => sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || (!url.includes('tiktok.com') && !url.includes('vm.tiktok.com'))) return reply('❌ Please provide a TikTok URL.\n\nUsage: *.tiktokaudio <url>*');
          await reply('📥 Downloading TikTok audio...');
          const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
          const { data } = await axios.get(apiUrl, { timeout: 30000 });
          const audioUrl = data?.data?.music || data?.data?.play;
          if (audioUrl) {
            const buffer = await getBuffer(audioUrl);
            await replyAudio(buffer);
          } else {
            await reply('❌ Failed to download TikTok audio.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    twitter: {
      description: 'Download Twitter/X video',
      usage: '.twitter <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyVideo = (buffer, caption) => sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || (!url.includes('twitter.com') && !url.includes('x.com'))) return reply('❌ Please provide a Twitter/X URL.\n\nUsage: *.twitter <url>*');
          await reply('📥 Downloading Twitter/X video...');
          const apiUrl = `https://api.fabdl.com/twitter/video?url=${encodeURIComponent(url)}`;
          const { data } = await axios.get(apiUrl, { timeout: 30000 }).catch(() => ({ data: null }));
          if (data?.result?.download_url) {
            const buffer = await getBuffer(data.result.download_url);
            await replyVideo(buffer, '🐦 *Twitter/X Video*');
          } else {
            try {
              const apiUrl2 = `https://twitsave.com/info?url=${encodeURIComponent(url)}`;
              const resp = await axios.get(apiUrl2, { timeout: 15000 });
              const $ = cheerio.load(resp.data);
              const videoUrl = $('video source').attr('src') || $('a.download-link').attr('href');
              if (videoUrl) {
                const buffer = await getBuffer(videoUrl);
                await replyVideo(buffer, '🐦 *Twitter/X Video*');
              } else {
                await reply('❌ Failed to download Twitter/X video.');
              }
            } catch {
              await reply('❌ Failed to download Twitter/X video. The tweet may not contain media.');
            }
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    video: {
      description: 'Download video from YouTube',
      usage: '.video <name/url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyVideo = (buffer, caption) => sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
        try {
          const query = args.join(' ');
          if (!query) return reply('❌ Please provide a video name or URL.\n\nUsage: *.video <name/url>*');
          await reply('🔍 Searching for video...');
          const yts = require('yt-search');
          let video;
          if (query.match(/youtube\.com|youtu\.be/)) {
            const urlMatch = query.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (urlMatch) video = await yts({ videoId: urlMatch[1] });
            else return reply('❌ Invalid YouTube URL.');
          } else {
            const search = await yts(query);
            if (!search.videos || search.videos.length === 0) return reply('❌ No results found.');
            video = search.videos[0];
          }
          await reply(`📹 Downloading: *${video.title}*\n⏱️ Duration: ${video.timestamp}`);
          const ytdl = require('ytdl-core');
          ensureTmpDir();
          const outputPath = path.join(TMP_DIR, `${getRandom('mp4')}`);
          const stream = ytdl(video.url, { quality: 'highest', filter: 'videoandaudio' });
          const writeStream = fs.createWriteStream(outputPath);
          await new Promise((resolve, reject) => {
            stream.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
            stream.on('error', reject);
          });
          const buffer = fs.readFileSync(outputPath);
          if (buffer.length > 60 * 1024 * 1024) {
            fs.unlinkSync(outputPath);
            return reply('❌ Video file too large (max 60MB). Try downloading audio with .song');
          }
          await replyVideo(buffer, `📹 *${video.title}*\n⏱️ ${video.timestamp} | 👁️ ${video.views} views`);
          fs.unlinkSync(outputPath);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    videodoc: {
      description: 'Send video as document',
      usage: '.videodoc <name/url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyDocument = (buffer, filename, mimetype) => sock.sendMessage(jid, { document: buffer, fileName: filename, mimetype }, { quoted: msg });
        try {
          const query = args.join(' ');
          if (!query) return reply('❌ Please provide a video name or URL.\n\nUsage: *.videodoc <name/url>*');
          await reply('🔍 Searching for video...');
          const yts = require('yt-search');
          let video;
          if (query.match(/youtube\.com|youtu\.be/)) {
            const urlMatch = query.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (urlMatch) video = await yts({ videoId: urlMatch[1] });
            else return reply('❌ Invalid YouTube URL.');
          } else {
            const search = await yts(query);
            if (!search.videos || search.videos.length === 0) return reply('❌ No results found.');
            video = search.videos[0];
          }
          await reply(`📥 Downloading: *${video.title}*`);
          const ytdl = require('ytdl-core');
          ensureTmpDir();
          const outputPath = path.join(TMP_DIR, `${getRandom('mp4')}`);
          const stream = ytdl(video.url, { quality: 'highest', filter: 'videoandaudio' });
          const writeStream = fs.createWriteStream(outputPath);
          await new Promise((resolve, reject) => {
            stream.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
            stream.on('error', reject);
          });
          const buffer = fs.readFileSync(outputPath);
          const safeTitle = video.title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50);
          await replyDocument(buffer, `${safeTitle}.mp4`, 'video/mp4');
          fs.unlinkSync(outputPath);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    xvideo: {
      description: 'Download from various video platforms',
      usage: '.xvideo <url>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const url = args[0];
          if (!url || !isUrl(url)) return reply('❌ Please provide a video URL.\n\nUsage: *.xvideo <url>*');
          const downloadCmd = module.exports.commands.download;
          return downloadCmd.execute(sock, msg, [url], { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config });
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
