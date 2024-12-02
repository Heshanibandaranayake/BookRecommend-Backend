require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const mysql = require('mysql2/promise');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const app = express();
const PORT = process.env.BOT_API_PORT || 4000;

// Database connection
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "book_recommend_system",
});

// Discord bot login
client.once('ready', () => {
  console.log(`Discord Bot is online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);

// Bot responds to Discord commands
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!recommend')) {
    const query = message.content.replace('!recommend', '').trim();

    if (!query) {
      return message.channel.send('Please provide a keyword or genre for recommendations, e.g., `!recommend fantasy`.');
    }

    try {
      const [results] = await db.execute(
        `SELECT title, author 
         FROM books 
         WHERE title LIKE ? OR author LIKE ? OR category LIKE ?
         LIMIT 10`,
        [`%${query}%`, `%${query}%`, `%${query}%`]
      );

      if (results.length === 0) {
        return message.channel.send(`No recommendations found for "${query}". Try another keyword or genre.`);
      }

      const recommendationList = results
        .map((book, index) => `${index + 1}. **${book.title}** by ${book.author}`)
        .join('\n');

      message.channel.send(`Here are some recommendations for "${query}":\n${recommendationList}`);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      message.channel.send('There was an error retrieving recommendations. Please try again later.');
    }
  }
});

// Expose an API for the backend to fetch recommendations
app.get('/recommendations', async (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.status(400).json({ message: 'Query parameter is required' });
  }

  try {
    const [results] = await db.execute(
      `SELECT title, author 
       FROM books 
       WHERE title LIKE ? OR author LIKE ? OR category LIKE ?
       LIMIT 10`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: `No recommendations found for "${query}"` });
    }

    res.json(results);
  } catch (error) {
    console.error('Error fetching recommendations from the database:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Start the API server
app.listen(PORT, () => {
  console.log(`Bot API running on http://localhost:${PORT}`);
});
