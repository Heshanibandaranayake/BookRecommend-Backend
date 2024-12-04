require('dotenv').config();
const { Client, GatewayIntentBits,REST,Routes } = require('discord.js');
const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
const cors = require("cors");
const jwt = require("jsonwebtoken");


const TOKEN = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;;  
const guildId = process.env.DISCORD_GUILDE_ID;  
const channelId = process.env.DISCORD_CHANNEL_ID;  

const rest = new REST({ version: '10' }).setToken(TOKEN);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildMembers 
  ],
});


const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.BOT_API_PORT || 4000;

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "book_recommend_system",
});

db.getConnection((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to the database.");
  }
});

client.once('ready', () => {
  console.log(`Discord Bot is online as ${client.user.tag}`);
});

client.login(TOKEN);

(async () => {
  try {
    console.log('Fetching guild commands...');
    const commands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    console.log('Fetched commands:', commands);
  } catch (error) {
    console.error('Error fetching commands:', error);
  }
})();

client.on('messageCreate', async (message) => {
  // Ignore messages from the bot itself
  if (message.author.bot) return;

  // Parse the message
  const [command, ...args] = message.content.trim().split(/\s+/);

  try {
    if (command === 'addbook') {
      const bookId = args[0]; // Assume the first argument is the book ID
      if (!bookId) {
        return message.reply('Please provide a book ID. Usage: `addbook <bookId>`');
      }

      // Send request to backend
      const response = await axios.post('http://localhost:5000/api/book', { 
        command: 'addbook', 
        bookId 
      });

      // Respond in Discord
      message.reply(`Book with ID ${bookId} has been added.`);
    } 
    else if (command === 'deletebook') {
      const bookId = args[0]; // Assume the first argument is the book ID
      if (!bookId) {
        return message.reply('Please provide a book ID. Usage: `deletebook <bookId>`');
      }

      // Send request to backend
      const response = await axios.post('http://localhost:5000/api/book', { 
        command: 'deletebook', 
        bookId 
      });

      // Respond in Discord
      message.reply(`Book with ID ${bookId} has been deleted.`);
    } 
    else if (command === 'viewbook') {
      const bookId = args[0]; // Assume the first argument is the book ID
      if (!bookId) {
        return message.reply('Please provide a book ID. Usage: `viewbook <bookId>`');
      }

      // Send request to backend
      const response = await axios.post('http://localhost:5000/api/book', { 
        command: 'viewbook', 
        bookId 
      });

      // Respond in Discord
      message.reply(`Book with ID ${bookId} is being viewed.`);
    } 
    else {
      message.reply('Unknown command. Available commands: `addbook`, `deletebook`, `viewbook`');
    }
  } catch (error) {
    console.error('Error processing command:', error.message);
    message.reply('Failed to process the command. Please try again.');
  }
});


// Start the API server
app.listen(PORT, () => {
  console.log(`Bot API running on http://localhost:${PORT}`);
});
