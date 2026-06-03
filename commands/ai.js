const axios = require('axios');

const AI_SYSTEM_PROMPT = `You are XTECH_KE AI, a helpful and intelligent assistant built into the XTECH_KE WhatsApp bot. You are concise, friendly, and provide accurate information. Keep responses under 1000 characters when possible. Use emojis sparingly.`;

async function queryFreeAI(prompt, systemPrompt = AI_SYSTEM_PROMPT) {
  try {
    const response = await axios.post('https://api.duckduckgo.com/duckchat/v1/chat', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    return response.data?.message || response.data?.choices?.[0]?.message?.content || null;
  } catch {
    try {
      const response = await axios.get('https://api.openai.com/v1/models', { timeout: 5000 });
    } catch {}
    return null;
  }
}

async function queryBlackboxAI(prompt) {
  try {
    const response = await axios.post('https://www.blackbox.ai/api/chat', {
      messages: [{ id: Date.now().toString(), content: prompt, role: 'user' }],
      previewToken: null,
      userId: null,
      codeModelMode: true,
      agentMode: {},
      trendingAgentMode: {},
      isMicMode: false,
      maxTokens: 1024,
      isChromeExt: false,
      githubToken: null
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 60000
    });
    const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const cleaned = text.replace(/\$~~~\$.*?\$~~~\$/gs, '').replace(/\$@\$.*?\$@\$/gs, '').trim();
    return cleaned || text.slice(0, 2000);
  } catch (err) {
    return null;
  }
}

async function queryGemini(prompt) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || '';
    const url = apiKey
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`
      : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }]
    }, { timeout: 30000 });
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

async function queryDeepSeek(prompt) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY || '';
    if (!apiKey) return null;
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 60000
    });
    return response.data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

async function queryGPT(prompt, systemPrompt = AI_SYSTEM_PROMPT) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
    return response.data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

async function getAIResponse(prompt, systemPrompt = AI_SYSTEM_PROMPT) {
  let result = await queryBlackboxAI(prompt);
  if (result) return result;
  result = await queryGemini(prompt);
  if (result) return result;
  result = await queryDeepSeek(prompt);
  if (result) return result;
  result = await queryGPT(prompt, systemPrompt);
  if (result) return result;
  return null;
}

function getQuotedText(msg) {
  try {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (ctx?.quotedMessage) {
      return ctx.quotedMessage.conversation || ctx.quotedMessage.extendedTextMessage?.text || '';
    }
  } catch {}
  return '';
}

module.exports = {
  category: 'AI',
  commands: {
    analyze: {
      description: 'Analyze text using AI',
      usage: '.analyze <text/reply>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const text = args.join(' ') || getQuotedText(msg);
          if (!text) return reply('❌ Please provide text to analyze.\n\nUsage: *.analyze <text>* or reply to a message');
          await reply('🔍 Analyzing...');
          const prompt = `Analyze the following text in detail. Provide insights about tone, intent, key points, and any notable patterns:\n\n${text}`;
          const result = await getAIResponse(prompt);
          if (result) {
            await reply(`🔍 *Analysis Result*\n\n${result}`);
          } else {
            await reply('❌ AI analysis failed. Please try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    blackbox: {
      description: 'Chat with Blackbox AI',
      usage: '.blackbox <question>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const question = args.join(' ') || getQuotedText(msg);
          if (!question) return reply('❌ Please provide a question.\n\nUsage: *.blackbox <question>*');
          await reply('⏳ Blackbox AI is thinking...');
          const result = await queryBlackboxAI(question);
          if (result) {
            await reply(`🤖 *Blackbox AI*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ Blackbox AI is unavailable. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    code: {
      description: 'Generate code from description',
      usage: '.code <description>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const description = args.join(' ') || getQuotedText(msg);
          if (!description) return reply('❌ Please describe what code you want.\n\nUsage: *.code <description>*');
          await reply('💻 Generating code...');
          const prompt = `Generate clean, well-commented code for the following request. Include brief explanation:\n\n${description}`;
          const result = await getAIResponse(prompt, 'You are an expert programmer. Generate clean, efficient code with comments. Keep it concise.');
          if (result) {
            await reply(`💻 *Generated Code*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ Code generation failed. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    dalle: {
      description: 'Generate image from text',
      usage: '.dalle <description>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        const replyImage = (buffer, caption) => sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
        try {
          const description = args.join(' ');
          if (!description) return reply('❌ Please describe the image you want.\n\nUsage: *.dalle <description>*');
          await reply('🎨 Generating image...');
          try {
            const { getBuffer } = require('../lib/utils');
            const imageBuffer = await getBuffer(`https://image.pollinations.ai/prompt/${encodeURIComponent(description)}?width=512&height=512&nologo=true`);
            if (imageBuffer && imageBuffer.length > 1000) {
              await replyImage(imageBuffer, `🎨 *Generated Image*\n\nPrompt: ${description}`);
            } else {
              await reply('❌ Failed to generate image. Try a different description.');
            }
          } catch {
            await reply('❌ Image generation API unavailable. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    deepseek: {
      description: 'Chat with DeepSeek AI',
      usage: '.deepseek <question>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const question = args.join(' ') || getQuotedText(msg);
          if (!question) return reply('❌ Please provide a question.\n\nUsage: *.deepseek <question>*');
          await reply('⏳ DeepSeek AI is thinking...');
          let result = await queryDeepSeek(question);
          if (!result) result = await queryBlackboxAI(`[DeepSeek Mode] ${question}`);
          if (result) {
            await reply(`🧠 *DeepSeek AI*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ DeepSeek AI is unavailable. Set DEEPSEEK_API_KEY or try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    doppleai: {
      description: 'Chat with DoppleAI',
      usage: '.doppleai <question>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const question = args.join(' ') || getQuotedText(msg);
          if (!question) return reply('❌ Please provide a question.\n\nUsage: *.doppleai <question>*');
          await reply('⏳ DoppleAI is thinking...');
          const prompt = `[DoppleAI] ${question}`;
          const result = await getAIResponse(prompt);
          if (result) {
            await reply(`🎭 *DoppleAI*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ DoppleAI is unavailable. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    gemini: {
      description: 'Chat with Google Gemini',
      usage: '.gemini <question>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const question = args.join(' ') || getQuotedText(msg);
          if (!question) return reply('❌ Please provide a question.\n\nUsage: *.gemini <question>*');
          await reply('⏳ Gemini is thinking...');
          let result = await queryGemini(question);
          if (!result) result = await queryBlackboxAI(`[Gemini Mode] ${question}`);
          if (result) {
            await reply(`💎 *Google Gemini*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ Gemini is unavailable. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    generate: {
      description: 'General text generation',
      usage: '.generate <prompt>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const prompt = args.join(' ') || getQuotedText(msg);
          if (!prompt) return reply('❌ Please provide a prompt.\n\nUsage: *.generate <prompt>*');
          await reply('⏳ Generating...');
          const result = await getAIResponse(prompt);
          if (result) {
            await reply(`✨ *Generated*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ Generation failed. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    gpt: {
      description: 'Chat with GPT',
      usage: '.gpt <question>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const question = args.join(' ') || getQuotedText(msg);
          if (!question) return reply('❌ Please provide a question.\n\nUsage: *.gpt <question>*');
          await reply('⏳ GPT is thinking...');
          let result = await queryGPT(question);
          if (!result) result = await queryBlackboxAI(`[GPT Mode] ${question}`);
          if (result) {
            await reply(`🤖 *GPT*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ GPT is unavailable. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    programming: {
      description: 'Programming help from AI',
      usage: '.programming <question>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const question = args.join(' ') || getQuotedText(msg);
          if (!question) return reply('❌ Please provide a programming question.\n\nUsage: *.programming <question>*');
          await reply('⏳ Getting programming help...');
          const prompt = `You are an expert programmer. Help with this programming question. Provide code examples if relevant:\n\n${question}`;
          const result = await getAIResponse(prompt, 'You are an expert programmer. Provide clear, concise answers with code examples. Use proper code formatting.');
          if (result) {
            await reply(`👨‍💻 *Programming Help*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ Programming help unavailable. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    recipe: {
      description: 'Generate recipe from ingredients',
      usage: '.recipe <ingredients>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const ingredients = args.join(' ') || getQuotedText(msg);
          if (!ingredients) return reply('❌ Please list your ingredients.\n\nUsage: *.recipe <ingredients>*');
          await reply('🍳 Generating recipe...');
          const prompt = `Create a delicious recipe using these ingredients: ${ingredients}\n\nInclude: recipe name, prep time, cook time, servings, ingredients list with measurements, step-by-step instructions, and tips.`;
          const result = await getAIResponse(prompt, 'You are a professional chef. Create detailed, easy-to-follow recipes. Include measurements and cooking times.');
          if (result) {
            await reply(`🍳 *Recipe*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ Recipe generation failed. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    story: {
      description: 'Generate a story',
      usage: '.story <theme/prompt>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const theme = args.join(' ') || getQuotedText(msg) || 'adventure';
          await reply('📖 Writing story...');
          const prompt = `Write an engaging short story about: ${theme}\n\nMake it creative, with vivid descriptions and an interesting plot twist. Keep it under 500 words.`;
          const result = await getAIResponse(prompt, 'You are a creative storyteller. Write engaging, vivid stories with interesting plots.');
          if (result) {
            await reply(`📖 *Story*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ Story generation failed. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    summarize: {
      description: 'Summarize text',
      usage: '.summarize <text/reply>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const text = args.join(' ') || getQuotedText(msg);
          if (!text) return reply('❌ Please provide text to summarize.\n\nUsage: *.summarize <text>* or reply to a message');
          if (text.length < 50) return reply('❌ Text is too short to summarize. Provide at least 50 characters.');
          await reply('📝 Summarizing...');
          const prompt = `Summarize the following text concisely, capturing all key points:\n\n${text}`;
          const result = await getAIResponse(prompt, 'You are a summarization expert. Provide concise, accurate summaries capturing all key points.');
          if (result) {
            await reply(`📝 *Summary*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ Summarization failed. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    teach: {
      description: 'Teach/explain a topic',
      usage: '.teach <topic>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const topic = args.join(' ') || getQuotedText(msg);
          if (!topic) return reply('❌ Please provide a topic to learn about.\n\nUsage: *.teach <topic>*');
          await reply('📚 Teaching...');
          const prompt = `Explain the following topic in a clear, educational way. Use simple language and examples:\n\n${topic}\n\nInclude: definition, key concepts, examples, and why it matters.`;
          const result = await getAIResponse(prompt, 'You are a patient, skilled teacher. Explain concepts clearly with examples. Make complex topics easy to understand.');
          if (result) {
            await reply(`📚 *Lesson: ${topic}*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ Teaching failed. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    },

    translate2: {
      description: 'Translate text using AI',
      usage: '.translate2 <language> <text>',
      execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
        const jid = msg.key.remoteJid;
        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
        try {
          const lang = args[0];
          const text = args.slice(1).join(' ') || getQuotedText(msg);
          if (!lang || !text) return reply('❌ Please provide language and text.\n\nUsage: *.translate2 <language> <text>*\nExample: *.translate2 french Hello world*');
          await reply('🌐 Translating...');
          const prompt = `Translate the following text to ${lang}. Only provide the translation, nothing else:\n\n${text}`;
          const result = await getAIResponse(prompt, 'You are a professional translator. Provide accurate, natural-sounding translations. Only output the translated text.');
          if (result) {
            await reply(`🌐 *Translation (${lang})*\n\n${result.slice(0, 4000)}`);
          } else {
            await reply('❌ Translation failed. Try again later.');
          }
        } catch (err) {
          await reply(`❌ Error: ${err.message}`);
        }
      }
    }
  }
};
