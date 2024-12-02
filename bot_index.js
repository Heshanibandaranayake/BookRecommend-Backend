require('dotenv').config(); // Load environment variables from .env
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const token = process.env.DISCORD_BOT_TOKEN;

client.login(token).then(() => {
  console.log('Bot logged in successfully');
}).catch(error => {
  console.error('Error logging in:', error);
});
