const axios = require('axios');

const SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = '3'; // Free API key for TheSportsDB

const LEAGUES = {
  epl: { id: '4328', name: 'English Premier League' },
  laliga: { id: '4335', name: 'La Liga' },
  seriea: { id: '4332', name: 'Serie A' },
  bundesliga: { id: '4331', name: 'Bundesliga' },
  ligue1: { id: '4334', name: 'Ligue 1' },
  cl: { id: '4480', name: 'UEFA Champions League' },
  el: { id: '4481', name: 'UEFA Europa League' },
  efl: { id: '4329', name: 'EFL Championship' },
  wc: { id: '4429', name: 'FIFA World Cup' }
};

async function getLeagueTable(leagueId) {
  try {
    const { data } = await axios.get(`${SPORTS_DB_BASE}/${API_KEY}/lookuptable.php?l=${leagueId}&s=2024-2025`, { timeout: 15000 });
    return data?.table || [];
  } catch {
    try {
      const { data } = await axios.get(`${SPORTS_DB_BASE}/${API_KEY}/lookuptable.php?l=${leagueId}&s=2023-2024`, { timeout: 15000 });
      return data?.table || [];
    } catch { return []; }
  }
}

async function getLeagueEvents(leagueId) {
  try {
    const { data } = await axios.get(`${SPORTS_DB_BASE}/${API_KEY}/eventsnextleague.php?id=${leagueId}`, { timeout: 15000 });
    return data?.events || [];
  } catch { return []; }
}

async function getPastEvents(leagueId) {
  try {
    const { data } = await axios.get(`${SPORTS_DB_BASE}/${API_KEY}/eventspastleague.php?id=${leagueId}`, { timeout: 15000 });
    return data?.events || [];
  } catch { return []; }
}

function formatStandings(table) {
  if (!table || table.length === 0) return '❌ No standings data available.';
  let result = '';
  table.slice(0, 15).forEach((team, i) => {
    result += `${i + 1}. *${team.strTeam}* - ${team.intPoints} pts\n`;
    result += `   W:${team.intWon} D:${team.intDraw} L:${team.intLoss} GD:${team.intGoalDifference}\n`;
  });
  return result;
}

function formatMatches(events, limit = 8) {
  if (!events || events.length === 0) return '❌ No match data available.';
  let result = '';
  events.slice(0, limit).forEach(event => {
    const home = event.strHomeTeam || 'TBD';
    const away = event.strAwayTeam || 'TBD';
    const score = event.intHomeScore !== null ? ` ${event.intHomeScore}-${event.intAwayScore} ` : ' vs ';
    const date = event.dateEvent || '';
    result += `⚽ *${home}*${score}*${away}*\n   📅 ${date}\n\n`;
  });
  return result;
}

function formatScorers(table) {
  if (!table || table.length === 0) return '❌ No scorer data available.';
  let result = '';
  table.slice(0, 10).forEach((team, i) => {
    result += `${i + 1}. *${team.strTeam}* - ${team.intGoals} goals\n`;
  });
  return result;
}

function createLeagueCommands(prefix, leagueKey) {
  const league = LEAGUES[leagueKey];
  const commands = {};

  commands[`${prefix}matches`] = {
    description: `${league.name} recent matches`,
    usage: `.${prefix}matches`,
    execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
      const jid = msg.key.remoteJid;
      const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
      try {
        await reply(`⚽ Fetching ${league.name} matches...`);
        const events = await getPastEvents(league.id);
        const result = `⚽ *${league.name} - Recent Matches*\n\n${formatMatches(events)}`;
        await reply(result);
      } catch (err) { await reply(`❌ Error: ${err.message}`); }
    }
  };

  commands[`${prefix}scorers`] = {
    description: `${league.name} top scorers`,
    usage: `.${prefix}scorers`,
    execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
      const jid = msg.key.remoteJid;
      const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
      try {
        await reply(`⚽ Fetching ${league.name} standings (sorted by goals)...`);
        const table = await getLeagueTable(league.id);
        const sorted = [...table].sort((a, b) => (parseInt(b.intGoals) || 0) - (parseInt(a.intGoals) || 0));
        const result = `⚽ *${league.name} - Top Scorers (by team goals)*\n\n${formatScorers(sorted)}`;
        await reply(result);
      } catch (err) { await reply(`❌ Error: ${err.message}`); }
    }
  };

  commands[`${prefix}standings`] = {
    description: `${league.name} standings`,
    usage: `.${prefix}standings`,
    execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
      const jid = msg.key.remoteJid;
      const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
      try {
        await reply(`⚽ Fetching ${league.name} standings...`);
        const table = await getLeagueTable(league.id);
        const result = `⚽ *${league.name} - Standings*\n\n${formatStandings(table)}`;
        await reply(result);
      } catch (err) { await reply(`❌ Error: ${err.message}`); }
    }
  };

  commands[`${prefix}upcoming`] = {
    description: `${league.name} upcoming matches`,
    usage: `.${prefix}upcoming`,
    execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
      const jid = msg.key.remoteJid;
      const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
      try {
        await reply(`⚽ Fetching ${league.name} upcoming matches...`);
        const events = await getLeagueEvents(league.id);
        const result = `⚽ *${league.name} - Upcoming Matches*\n\n${formatMatches(events)}`;
        await reply(result);
      } catch (err) { await reply(`❌ Error: ${err.message}`); }
    }
  };

  return commands;
}

const allCommands = {};

// Create commands for each league
for (const [key, league] of Object.entries(LEAGUES)) {
  const leagueCommands = createLeagueCommands(key, key);
  Object.assign(allCommands, leagueCommands);
}

// WWE commands
allCommands.wrestlingevents = {
  description: 'WWE wrestling events',
  usage: '.wrestlingevents',
  execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    try {
      await reply('🤼 Fetching WWE events...');
      const { data } = await axios.get(`${SPORTS_DB_BASE}/${API_KEY}/eventsnextleague.php?id=4522`, { timeout: 15000 });
      if (data?.events?.length > 0) {
        let result = '🤼 *WWE Upcoming Events*\n\n';
        data.events.slice(0, 8).forEach(event => {
          result += `🎪 *${event.strEvent}*\n`;
          result += `   📅 ${event.dateEvent}\n`;
          result += `   🏟️ ${event.strVenue || 'TBD'}\n\n`;
        });
        await reply(result);
      } else {
        await reply('❌ No WWE events found.');
      }
    } catch (err) { await reply(`❌ Error: ${err.message}`); }
  }
};

allCommands.wwenews = {
  description: 'WWE news',
  usage: '.wwenews',
  execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    try {
      const { data } = await axios.get(`${SPORTS_DB_BASE}/${API_KEY}/lookupleague.php?id=4522`, { timeout: 15000 });
      if (data?.leagues?.[0]) {
        const league = data.leagues[0];
        let result = '🤼 *WWE Info*\n\n';
        result += `📌 Name: ${league.strLeague}\n`;
        result += `🌐 Website: ${league.strWebsite || 'N/A'}\n`;
        result += `📺 TV: ${league.strTvRights || 'N/A'}\n`;
        if (league.strDescriptionEN) result += `\n📝 ${league.strDescriptionEN.slice(0, 500)}`;
        await reply(result);
      } else {
        await reply('❌ WWE news unavailable.');
      }
    } catch (err) { await reply(`❌ Error: ${err.message}`); }
  }
};

allCommands.wweschedule = {
  description: 'WWE schedule',
  usage: '.wweschedule',
  execute: async (sock, msg, args, { isOwner, isAdmin, isBotAdmin, groupMetadata, sender, botJid, db, config }) => {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    try {
      await reply('🤼 Fetching WWE schedule...');
      const { data } = await axios.get(`${SPORTS_DB_BASE}/${API_KEY}/eventsnextleague.php?id=4522`, { timeout: 15000 });
      if (data?.events?.length > 0) {
        let result = '🤼 *WWE Schedule*\n\n';
        data.events.slice(0, 10).forEach(event => {
          result += `📅 ${event.dateEvent} - *${event.strEvent}*\n`;
          if (event.strTime) result += `   ⏰ ${event.strTime}\n`;
          if (event.strVenue) result += `   🏟️ ${event.strVenue}\n`;
          result += '\n';
        });
        await reply(result);
      } else {
        await reply('❌ No WWE schedule data found.');
      }
    } catch (err) { await reply(`❌ Error: ${err.message}`); }
  }
};

module.exports = {
  category: 'SPORTS',
  commands: allCommands
};
