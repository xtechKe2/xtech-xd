const DARE_QUESTIONS = [
  'Do 20 pushups and send a video',
  'Send a voice note singing the chorus of any song',
  'Call the 5th contact in your phone and say "I love you"',
  'Send a funny selfie with your tongue out',
  'Type a message with your eyes closed and send it',
  'Do your best impression of a celebrity and send a voice note',
  'Send the last photo in your gallery',
  'Text your crush "Hey what are you doing?"',
  'Speak in an accent for the next 5 minutes',
  'Let the group choose your profile picture for a day',
  'Send a voice note of you roasting the person who sent this',
  'Change your name to "I am a potato" for 30 minutes',
  'Share your most embarrassing moment',
  'Do 10 jumping jacks and send a video',
  'Send the 7th message in your chat with your best friend',
  'Record yourself doing a silly dance',
  'Let someone in the group choose your status for an hour',
  'Compliment everyone in the group individually',
  'Send a voice note whispering "I am a secret agent"',
  'Hold your breath for 20 seconds and send proof',
  'Send a message to the last person who texted you saying "I\'m busy conquering the world"',
  'Write a haiku about the person who dared you',
  'Eat a spoonful of a condiment and send a video reaction',
  'Do your best robot dance and send it',
  'Talk in third person for the next 10 minutes',
  'Send the most recent thing you copied on your phone',
  'Call someone and tell them a joke in 30 seconds',
  'Send an embarrassing photo from your childhood',
  'Record a dramatic reading of the last message in the chat',
  'Let the group decide your outfit tomorrow'
];

const TRUTH_QUESTIONS = [
  'What is the most embarrassing thing you\'ve ever done?',
  'What is the biggest lie you\'ve ever told?',
  'What is the most childish thing you still do?',
  'What is the most embarrassing thing you have on your phone?',
  'What is the longest you\'ve ever gone without showering?',
  'What is the worst date you\'ve ever been on?',
  'What is the most embarrassing thing your parents have caught you doing?',
  'What is the weirdest dream you\'ve ever had?',
  'If you could swap lives with anyone for a day, who would it be?',
  'What is the most trouble you\'ve ever been in?',
  'What is the last thing you searched for on your phone?',
  'What is the most awkward thing that happened to you in public?',
  'What is a secret you\'ve never told anyone?',
  'What is the dumbest thing you\'ve ever done on a dare?',
  'Who was your first crush?',
  'What is the most embarrassing thing you\'ve sent to the wrong person?',
  'What is the craziest thing you\'ve done that no one knows about?',
  'If you could change one thing about yourself, what would it be?',
  'What is the pettiest thing you\'ve ever done?',
  'What is the worst thing you\'ve ever eaten out of politeness?',
  'What is the most embarrassing thing in your search history?',
  'What is the biggest misconception people have about you?',
  'What is the most expensive thing you\'ve broken?',
  'What is the worst haircut you\'ve ever had?',
  'What is the most unusual fear you have?',
  'What is the strangest thing you\'ve ever bought?',
  'Who do you think is the most attractive person in this group?',
  'What is the most rebellious thing you did as a teenager?',
  'What is one thing you wish you could undo?',
  'What is the most cringe thing you did in school?'
];

module.exports = {
  category: 'GAMES',
  commands: {
    dare: {
      description: 'Random dare question',
      usage: '.dare',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const dare = DARE_QUESTIONS[Math.floor(Math.random() * DARE_QUESTIONS.length)];
          await reply(`🔥 *Dare*\n\n${dare}\n\n_Do it or pay the price! 😈_`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    truth: {
      description: 'Random truth question',
      usage: '.truth',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const truth = TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)];
          await reply(`🤔 *Truth*\n\n${truth}\n\n_Be honest! 🫣_`);
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    truthordare: {
      description: 'Random truth or dare',
      usage: '.truthordare',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const isTruth = Math.random() > 0.5;
          if (isTruth) {
            const truth = TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)];
            await reply(`🎲 *Truth or Dare*\n\nYou got: *TRUTH* 🤔\n\n${truth}\n\n_Be honest! 🫣_`);
          } else {
            const dare = DARE_QUESTIONS[Math.floor(Math.random() * DARE_QUESTIONS.length)];
            await reply(`🎲 *Truth or Dare*\n\nYou got: *DARE* 🔥\n\n${dare}\n\n_Do it or pay the price! 😈_`);
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
