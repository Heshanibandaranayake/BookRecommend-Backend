require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');

const TOKEN = process.env.DISCORD_BOT_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildMembers 
  ],
});

const app = express();
app.use(express.json());
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

app.post('/bot/post-message', async(req, res) => {
  // console.log("bot req***",req.body);
  // console.log('Headers:', req.headers);
  // console.log('Body:', req.body); // This should print the JSON object
  //res.status(200).json({ success: true });
  const channelId = req.body.channelId;
  const message = req.body.message;

  //console.log("channel id",req.body);
  try {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found.' });
    }

    await channel.send(message);
    res.status(200).json({ message: 'Message sent successfully.' });
  } catch (err) {
    console.error('Error sending message via bot:', err);
    res.status(500).json({ message: 'Failed to send message via bot.' });
  }
});

// app.post('/bot/post-message', (req, res) => {
//   console.log('Request body:', req.body); // Should log the parsed JSON body
//   res.status(200).json({ success: true });
// });




client.login(TOKEN);
// Start the API server
app.listen(PORT, () => {
  console.log(`Bot API running on http://localhost:${PORT}`);
});
