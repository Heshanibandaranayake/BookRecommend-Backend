require('dotenv').config();
const { REST, Routes } = require('discord.js');

const clientId = process.env.DISCORD_CLIENT_ID;;  
const guildId = process.env.DISCORD_GUILDE_ID;    
const botToken = process.env.DISCORD_BOT_TOKEN;  



const commands = [
//   {
//     name: 'hello',
//     description: 'Replies with Hello!',
//   },
//   {
//     name: 'ping',
//     description: 'Replies with Pong!',
//   },
 {
    name: 'addbook',
    description: 'Add a new book',
  },
  {
    name: 'deletebook',
    description: 'Delete a book',
  },
  {
    name: 'searchbook',
    description: 'search a book',
  },
  {
    name: 'listbooks',
    description: 'View book list',
  },
  {
    name: 'addreview',
    description: 'View book review',
  },
  {
    name: 'deletereview',
    description: 'Delete book review',
  },
  
];

const rest = new REST({ version: '10' }).setToken(botToken);

(async () => {
  try {
    console.log('Registering guild commands...');
    await rest.put(
      Routes.applicationGuildCommands(clientId,guildId), // Specify the guild ID
      { body: commands }
    );
    console.log('Guild commands registered successfully.');
  } catch (error) {
    console.error('Error registering guild commands:', error);
  }
})();
