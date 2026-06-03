const axios = require('axios');
const { getBuffer, isUrl } = require('../lib/utils');

module.exports = {
  category: 'SEARCH',
  commands: {
    define: {
      description: 'Define a word',
      usage: '.define <word>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const word = args[0];
          if (!word) return reply('❌ Please provide a word.\n\nUsage: *.define <word>*');
          const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 15000 });
          if (data && data.length > 0) {
            const entry = data[0];
            let result = `📖 *${entry.word}*\n`;
            if (entry.phonetic) result += `🔊 ${entry.phonetic}\n`;
            result += '\n';
            if (entry.meanings) {
              for (const meaning of entry.meanings.slice(0, 3)) {
                result += `*${meaning.partOfSpeech}*\n`;
                for (const def of meaning.definitions.slice(0, 3)) {
                  result += `  • ${def.definition}\n`;
                  if (def.example) result += `    _"${def.example}"_\n`;
                }
                if (meaning.synonyms?.length) {
                  result += `  Synonyms: ${meaning.synonyms.slice(0, 5).join(', ')}\n`;
                }
                result += '\n';
              }
            }
            if (entry.sourceUrls?.length) {
              result += `🔗 Source: ${entry.sourceUrls[0]}`;
            }
            await reply(result);
          } else {
            await reply(`❌ No definition found for "${word}".`);
          }
        } catch (err) {
          if (err.response?.status === 404) {
            await reply(`❌ Word "${args[0]}" not found in the dictionary.`);
          } else {
            await reply(`❌ Error: ${err.message}`);
          }
        }
      }
    },

    define2: {
      description: 'Alternative dictionary search',
      usage: '.define2 <word>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const word = args.join(' ');
          if (!word) return reply('❌ Please provide a word.\n\nUsage: *.define2 <word>*');
          const { data } = await axios.get(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`, { timeout: 15000 });
          if (data && data.length > 0 && data[0].defs) {
            let result = `📖 *${data[0].word}*\n\n`;
            data[0].defs.forEach((def, i) => {
              const [pos, ...definition] = def.split('\t');
              result += `${i + 1}. *${pos || 'def'}* ${definition.join(' ')}\n`;
            });
            await reply(result);
          } else {
            await reply(`❌ No definition found for "${word}". Try *.define* instead.`);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    imdb: {
      description: 'Search IMDB',
      usage: '.imdb <movie/show name>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const query = args.join(' ');
          if (!query) return reply('❌ Please provide a movie/show name.\n\nUsage: *.imdb <name>*');
          const apiKey = process.env.OMDB_API_KEY || 'free';
          const { data } = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=${apiKey}`, { timeout: 15000 });
          if (data?.Response === 'True') {
            let result = `🎬 *${data.Title}* (${data.Year})\n\n`;
            result += `⭐ Rating: ${data.imdbRating}/10 (${data.imdbVotes} votes)\n`;
            result += `🏆 Awards: ${data.Awards || 'N/A'}\n`;
            result += `🎭 Genre: ${data.Genre}\n`;
            result += `🎬 Director: ${data.Director}\n`;
            result += `👥 Actors: ${data.Actors}\n`;
            result += `📝 Plot: ${data.Plot}\n`;
            result += `⏱️ Runtime: ${data.Runtime}\n`;
            result += `🌍 Country: ${data.Country}\n`;
            result += `🗣️ Language: ${data.Language}\n`;
            result += `📦 Type: ${data.Type}\n`;
            if (data.Poster && data.Poster !== 'N/A') {
              try {
                const buffer = await getBuffer(data.Poster);
                await sock.sendMessage(jid, { image: buffer, caption: result }, { quoted: msg });
                return;
              } catch {}
            }
            await reply(result);
          } else {
            await reply(`❌ Movie/show not found: "${query}"`);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    lyrics: {
      description: 'Search song lyrics',
      usage: '.lyrics <song name>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const query = args.join(' ');
          if (!query) return reply('❌ Please provide a song name.\n\nUsage: *.lyrics <song name>*');
          await reply('🔍 Searching for lyrics...');
          try {
            const { data } = await axios.get(`https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`, { timeout: 15000 });
            if (data?.data?.length > 0) {
              const song = data.data[0];
              try {
                const lyricsResp = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(song.artist.name)}/${encodeURIComponent(song.title)}`, { timeout: 15000 });
                if (lyricsResp.data?.lyrics) {
                  let result = `🎵 *${song.title}*\n🎤 *${song.artist.name}*\n\n${lyricsResp.data.lyrics.slice(0, 3000)}`;
                  if (lyricsResp.data.lyrics.length > 3000) result += '\n\n... (truncated)';
                  await reply(result);
                  return;
                }
              } catch {}
              await reply(`🎵 *${song.title}*\n🎤 *${song.artist.name}*\n\n❌ Lyrics not found for this song.`);
            } else {
              await reply('❌ No results found.');
            }
          } catch {
            await reply('❌ Lyrics search unavailable. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    shazam: {
      description: 'Identify song',
      usage: '.shazam (reply to audio)',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const query = args.join(' ');
          if (!query) return reply('❌ Please provide a song name to search.\n\nUsage: *.shazam <song name>*\n_Note: Audio recognition requires a paid API. Using search instead._');
          const yts = require('yt-search');
          const search = await yts(query);
          if (search.videos && search.videos.length > 0) {
            const video = search.videos[0];
            await reply(`🎵 *Song Identified*\n\n📝 Title: ${video.title}\n🎤 Channel: ${video.author.name}\n⏱️ Duration: ${video.timestamp}\n👁️ Views: ${video.views}\n🔗 URL: ${video.url}`);
          } else {
            await reply('❌ Could not identify the song.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    weather: {
      description: 'Get weather info',
      usage: '.weather <city>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const city = args.join(' ');
          if (!city) return reply('❌ Please provide a city name.\n\nUsage: *.weather <city>*');
          const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: 15000 });
          if (data?.current_condition?.[0]) {
            const current = data.current_condition[0];
            const area = data.nearest_area?.[0];
            let result = `🌤️ *Weather for ${area?.areaName?.[0]?.value || city}*\n\n`;
            result += `🌡️ Temperature: ${current.temp_C}°C / ${current.temp_F}°F\n`;
            result += `🤔 Feels like: ${current.FeelsLikeC}°C / ${current.FeelsLikeF}°F\n`;
            result += `💧 Humidity: ${current.humidity}%\n`;
            result += `💨 Wind: ${current.windspeedKmph} km/h (${current.winddir16Point})\n`;
            result += `☁️ Condition: ${current.weatherDesc?.[0]?.value || 'N/A'}\n`;
            result += `👁️ Visibility: ${current.visibility} km\n`;
            result += `🌡️ Pressure: ${current.pressure} hPa\n`;
            result += `☀️ UV Index: ${current.uvIndex}\n`;
            if (data.weather?.[0]) {
              const today = data.weather[0];
              result += `\n📊 *Today's Range*\n`;
              result += `⬆️ Max: ${today.maxtempC}°C | ⬇️ Min: ${today.mintempC}°C`;
            }
            await reply(result);
          } else {
            await reply(`❌ Weather data not found for "${city}".`);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    yts: {
      description: 'Search YouTube',
      usage: '.yts <search term>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const query = args.join(' ');
          if (!query) return reply('❌ Please provide a search term.\n\nUsage: *.yts <search>*');
          await reply('🔍 Searching YouTube...');
          const yts = require('yt-search');
          const search = await yts(query);
          if (!search.videos || search.videos.length === 0) return reply('❌ No results found.');
          let result = `🔍 *YouTube Search: "${query}"*\n\n`;
          search.videos.slice(0, 10).forEach((video, i) => {
            result += `${i + 1}. *${video.title}*\n`;
            result += `   ⏱️ ${video.timestamp} | 👁️ ${video.views} views\n`;
            result += `   🎤 ${video.author.name}\n`;
            result += `   🔗 ${video.url}\n\n`;
          });
          await reply(result);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
