const axios = require('axios');

module.exports = {
  category: 'RELIGION',
  commands: {
    bible: {
      description: 'Get Bible verse',
      usage: '.bible <book chapter:verse> or .bible random',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const input = args.join(' ').trim();
          await reply('📖 Fetching Bible verse...');
          if (!input || input.toLowerCase() === 'random') {
            const { data } = await axios.get('https://bible-api.com/?random=verse', { timeout: 15000 });
            if (data?.text) {
              await reply(`📖 *Bible Verse*\n\n"${data.text.trim()}"\n\n📍 ${data.reference}`);
            } else {
              await reply('❌ Could not fetch Bible verse.');
            }
          } else {
            const { data } = await axios.get(`https://bible-api.com/${encodeURIComponent(input)}`, { timeout: 15000 });
            if (data?.text) {
              await reply(`📖 *Bible Verse*\n\n"${data.text.trim()}"\n\n📍 ${data.reference}`);
            } else {
              await reply('❌ Verse not found. Format: *.bible John 3:16* or *.bible random*');
            }
          }
        } catch (err) {
          if (err.response?.status === 404) {
            await reply('❌ Verse not found. Check the reference and try again.\nFormat: *.bible John 3:16*');
          } else {
            await reply(`❌ Error: ${err.message}`);
          }
        }
      }
    },

    quran: {
      description: 'Get Quran verse',
      usage: '.quran <surah:ayah> or .quran random',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const input = args.join(' ').trim();
          await reply('📖 Fetching Quran verse...');
          if (!input || input.toLowerCase() === 'random') {
            const surah = Math.floor(Math.random() * 114) + 1;
            const { data: surahData } = await axios.get(`https://api.alquran.cloud/v1/surah/${surah}`, { timeout: 15000 });
            if (surahData?.data?.ayahs) {
              const ayah = surahData.data.ayahs[Math.floor(Math.random() * surahData.data.ayahs.length)];
              await reply(`📖 *Quran - ${surahData.data.englishName}*\n\n🕌 Arabic:\n${ayah.text}\n\n🌐 Translation:\n${ayah.text}\n\n📍 Surah ${surahData.data.englishName} (${surahData.data.number}):${ayah.numberInSurah}`);
            } else {
              await reply('❌ Could not fetch Quran verse.');
            }
          } else {
            const parts = input.split(':');
            const surah = parseInt(parts[0]);
            const ayah = parseInt(parts[1]) || 1;
            if (isNaN(surah) || surah < 1 || surah > 114) return reply('❌ Invalid surah number (1-114).\n\nUsage: *.quran 1:1* or *.quran random*');
            try {
              const { data } = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-uthmani,en.asad`, { timeout: 15000 });
              if (data?.data) {
                const arabic = data.data[0];
                const english = data.data[1];
                await reply(`📖 *Quran*\n\n🕌 Arabic:\n${arabic.text}\n\n🌐 Translation:\n${english.text}\n\n📍 Surah ${english.surah.englishName} (${english.surah.number}):${ayah}`);
              } else {
                await reply('❌ Verse not found.');
              }
            } catch {
              const { data } = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}`, { timeout: 15000 });
              if (data?.data) {
                await reply(`📖 *Quran*\n\n${data.data.text}\n\n📍 Surah ${data.data.surah.englishName} (${data.data.surah.number}):${ayah}`);
              } else {
                await reply('❌ Verse not found.');
              }
            }
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
