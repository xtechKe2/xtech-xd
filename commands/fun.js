const axios = require('axios');

module.exports = {
  category: 'FUN',
  commands: {
    fact: {
      description: 'Random fun fact',
      usage: '.fact',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const { data } = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random', { timeout: 10000 });
          if (data?.text) {
            await reply(`🧠 *Random Fact*\n\n${data.text}`);
          } else {
            const fallbackFacts = [
              'Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible.',
              'Octopuses have three hearts and blue blood.',
              'A group of flamingos is called a "flamboyance".',
              'Bananas are berries, but strawberries are not.',
              'The shortest war in history lasted 38 minutes between Britain and Zanzibar.',
              'A shrimp\'s heart is located in its head.',
              'Wombat poop is cube-shaped.',
              'The inventor of the Pringles can is buried in one.',
              'A jiffy is an actual unit of time: 1/100th of a second.',
              'There are more possible iterations of a game of chess than there are atoms in the known universe.'
            ];
            await reply(`🧠 *Random Fact*\n\n${fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)]}`);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    jokes: {
      description: 'Random joke',
      usage: '.jokes',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const { data } = await axios.get('https://v2.jokeapi.dev/joke/Any?safe-mode', { timeout: 10000 });
          if (data?.type === 'twopart') {
            await reply(`😂 *Joke*\n\n${data.setup}\n\n||${data.delivery}||`);
          } else if (data?.joke) {
            await reply(`😂 *Joke*\n\n${data.joke}`);
          } else {
            const fallbackJokes = [
              'Why don\'t scientists trust atoms? Because they make up everything!',
              'Why did the scarecrow win an award? He was outstanding in his field!',
              'What do you call a fake noodle? An impasta!',
              'Why don\'t eggs tell jokes? They\'d crack each other up!',
              'What do you call a bear with no teeth? A gummy bear!',
              'Why did the bicycle fall over? Because it was two-tired!',
              'What do you call a sleeping dinosaur? A dino-snore!',
              'Why can\'t your nose be 12 inches long? Because then it would be a foot!'
            ];
            await reply(`😂 *Joke*\n\n${fallbackJokes[Math.floor(Math.random() * fallbackJokes.length)]}`);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    memes: {
      description: 'Random meme from Reddit',
      usage: '.memes',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const { data } = await axios.get('https://meme-api.com/gimme', { timeout: 10000 });
          if (data?.url && (data.url.endsWith('.jpg') || data.url.endsWith('.png') || data.url.endsWith('.jpeg') || data.url.endsWith('.gif'))) {
            const { getBuffer } = require('../lib/utils');
            const buffer = await getBuffer(data.url);
            await replyImage(buffer, `😂 *${data.title || 'Meme'}*\n👍 ${data.ups || 0} upvotes | r/${data.subreddit || 'memes'}`);
          } else {
            await reply('❌ Could not fetch meme. Try again.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    quotes: {
      description: 'Random quote',
      usage: '.quotes',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const { data } = await axios.get('https://api.quotable.io/random', { timeout: 10000 }).catch(async () => {
            return await axios.get('https://api.favqs.com/v1/quotes/?filter=', { timeout: 10000 });
          });
          if (data?.content) {
            await reply(`💬 *Quote*\n\n"${data.content}"\n\n— ${data.author || 'Unknown'}`);
          } else if (data?.quotes?.[0]) {
            const q = data.quotes[0];
            await reply(`💬 *Quote*\n\n"${q.body}"\n\n— ${q.author || 'Unknown'}`);
          } else {
            const fallbackQuotes = [
              { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
              { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
              { text: 'Life is what happens when you\'re busy making other plans.', author: 'John Lennon' },
              { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
              { text: 'It is during our darkest moments that we must focus to see the light.', author: 'Aristotle' },
              { text: 'The purpose of our lives is to be happy.', author: 'Dalai Lama' },
              { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' }
            ];
            const q = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
            await reply(`💬 *Quote*\n\n"${q.text}"\n\n— ${q.author}`);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    trivia: {
      description: 'Random trivia question',
      usage: '.trivia',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const { data } = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', { timeout: 10000 });
          if (data?.results?.[0]) {
            const q = data.results[0];
            const options = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
            const optionLetters = ['A', 'B', 'C', 'D'];
            let text = `🧠 *Trivia*\n\nCategory: ${q.category}\nDifficulty: ${q.difficulty}\n\n❓ ${q.question}\n\n`;
            options.forEach((opt, i) => {
              text += `${optionLetters[i]}. ${opt}\n`;
            });
            text += `\n||Answer: ${q.correct_answer}||`;
            await reply(text);
          } else {
            await reply('❌ Could not fetch trivia question.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    truthdetector: {
      description: 'Fun truth detector game',
      usage: '.truthdetector <statement>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const statement = args.join(' ');
          if (!statement) return reply('❌ Please provide a statement.\n\nUsage: *.truthdetector <statement>*');
          const results = [
            { emoji: '🟢', text: 'TRUE', confidence: Math.floor(Math.random() * 20) + 80 },
            { emoji: '🟡', text: 'MOSTLY TRUE', confidence: Math.floor(Math.random() * 20) + 60 },
            { emoji: '🟠', text: 'PARTIALLY TRUE', confidence: Math.floor(Math.random() * 20) + 40 },
            { emoji: '🔴', text: 'FALSE', confidence: Math.floor(Math.random() * 30) + 70 },
            { emoji: '🟣', text: 'INCONCLUSIVE', confidence: Math.floor(Math.random() * 30) + 20 }
          ];
          const result = results[Math.floor(Math.random() * results.length)];
          const { progressBar } = require('../lib/utils');
          const bar = progressBar(result.confidence);
          await reply(`🔍 *Truth Detector*\n\n📝 Statement: "${statement}"\n\n${result.emoji} Result: *${result.text}*\n📊 Confidence: [${bar}] ${result.confidence}%\n\n⚠️ _This is just for fun and not a real truth detector!_`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    xxqc: {
      description: 'Random quote/fun message',
      usage: '.xxqc',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const quotes = [
            "Life is short. Smile while you still have teeth. 😁",
            "I'm not lazy, I'm on energy saving mode. 🔋",
            "I speak my mind. I never mind what I speak. 🗣️",
            "Sometimes I pretend to be normal, but it gets boring. So I go back to being me. 😎",
            "I'm not arguing, I'm just explaining why I'm right. 💁",
            "Do what you love, and you'll never work a day in your life. Because that field probably isn't hiring. 😂",
            "The early bird can have the worm, because worms are gross and mornings are stupid. 🐦",
            "I'm on a seafood diet. I see food and I eat it. 🍕",
            "My bed and I love each other, but my alarm clock doesn't want to accept it. ⏰",
            "I'm not procrastinating, I'm doing side quests first. 🎮",
            "Money talks... but mine just says goodbye. 💸",
            "I'm not short, I'm just concentrated awesome. ✨",
            "Common sense is like deodorant. The people who need it most never use it. 🧴",
            "I came, I saw, I forgot what I came for. 🤔",
            "My phone's battery lasts longer than my motivation. 📱",
            "I don't need a hairstylist, my pillow gives me a new style every morning. 💇",
            "If you think nobody cares if you're alive, try missing a couple of payments. 💰",
            "I'm not superstitious, but I am a little stitious. 🤞"
          ];
          await reply(`💫 *Random Vibe*\n\n${quotes[Math.floor(Math.random() * quotes.length)]}`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
