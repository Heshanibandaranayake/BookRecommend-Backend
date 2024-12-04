require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
//const mysql = require('mysql2');


const PostGreSQL  = require('pg').Client;

const { Client, GatewayIntentBits,REST,Routes } = require('discord.js');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

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

// Database Connection
// const db = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "root",
//   database: "book_recommend_system",
// });

const db = new PostGreSQL({
	user: 'postgres',
	password: 'root',
	host: 'localhost',
	port: '5432',
	database: 'book_recommend_system',
});

// 
// db.getConnection((err) => {
//   if (err) {
//     console.error("Database connection failed:", err);
//   } else {
//     console.log("Connected to the database.");
//   }
// });
db.connect().then(() => {
		console.log('Connected to PostgreSQL database');
	})
	.catch((err) => {
		console.error('Error connecting to PostgreSQL database', err);
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

//Signup 
app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password } = req.body;
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const sql = "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)";
      db.query(sql, [name, email, hashedPassword], (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Email already exists" });
          }
          console.log("error",err);
          return res.status(500).json({ message: "Database error" });
        }
  
        res.status(201).json({ message: "User created successfully" });
      });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Login API
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    console.log("email. password", email,password);
    try {
      const sql = "SELECT * FROM users WHERE email = $1"; 
      //if(sql)
      console.log("sql",sql)
      db.query(sql, [email], async (err, results) => {
        
        if (err) 
          
            return res.status(500).json({ message: "Database error" });
            console.log("error",err);
  
        if (results.length === 0) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
  
        const user = results.rows[0];;
        console.log("user",user);
        const isMatch = await bcrypt.compare(password, user.password);
  
        if (!isMatch) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
  
        
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });
  
        return res.status(200).json({ message: "Login successful",user: user.id, username:user.name});
      });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });
//CRUD operations for books
   app.post('/api/book/:userId', async(req, res) => {
    console.log("req",req.body)
    const userId =req.params.userId; 
    const  bookId  = req.body.bookId;
    const command = req.body.command;

    const guild = await client.guilds.fetch(guildId);
    const channel = guild.channels.cache.get(channelId);

    if(command=== 'addbook'){
      const sqlCheck = 'SELECT * FROM user_library WHERE book_id = $1 AND user_id = $2'
      const existingEntry = await db.query(sqlCheck,[bookId, userId]);

      if (existingEntry.rows.length === 0) {
        const sql = 'INSERT INTO user_library (user_id, book_id) VALUES ($1, $2)';
        db.query(sql, [userId, bookId], (err, result) => {
          if (err) {
            console.error('Error adding book to library:', err);
            return res.status(500).json({ message: 'Error adding book to library' });
          }
         
          console.log("bot res")
          return res.status(200).json({ message: 'Book added successfully'});
        });
      }else{
        return res.status(200).json({ message: 'Book already in the library'});
      }
     
      await channel.send(`Adding book with ID: ${bookId}`);

    }else if(command ==='deletebook'){
      const existingEntry = await db.query(
        'SELECT * FROM user_library WHERE book_id = $1 AND user_id = $2',
        [bookId, userId]
      );
  
      if (existingEntry.rows.length > 0) {
        await db.query(
          'DELETE FROM user_library WHERE book_id = $1 AND user_id = $2',
          [bookId, userId]
        );
        
        res.json({ success: true, message: 'Book removed from library.' });
      } else {
        res.status(404).json({ success: false, message: 'Book not found in library.' });
      }
      await channel.send(`deleting book with ID: ${bookId}`);

    } else if(command === 'listbook'){
      const sql = `
        SELECT b.id, b.title, b.author, b.category, b.cover_image, ul.review
        FROM user_library ul
        JOIN books b ON ul.book_id = b.id
        WHERE ul.user_id = $1
      `;
    
      db.query(sql, [userId], (err, results) => {
        if (err) {
          console.error("Error fetching user library books:", err);
          return res.status(500).json({ message: "Database error" });
        }
        const response = results.rows.map(book => {
          const coverImage = book.cover_image ? `data:image/jpeg;base64,${book.cover_image.toString('base64')}` : null;
          return {
            ...book,
            cover_image: coverImage
          };
        });
        return res.json(response);
      });
    }else if(command == 'searchbook'){
      const { title, author, category } = req.body.params;
      
      let sql = 'SELECT * FROM books WHERE TRUE'; 
    
      const params = [];
    
      if (title) {
        sql += ' AND title ILIKE $'+ (params.length + 1);
        params.push(`%${title}%`);
      }
    
      if (author) {
        sql += ' AND author ILIKE $'+ (params.length + 1);
        params.push(`%${author}%`);
      }
    
      if (category) {
        sql += ' AND category ILIKE $'+ (params.length + 1);
        params.push(`%${category}%`);
      }
    
      db.query(sql, params, (err, results) => {
        if (err) {
          console.error('Error executing search query:', err);
          return res.status(500).json({ message: 'Database error' });
        }
        const response = results.rows.map(book => {
          console.log("book item",book);
          const coverImage = book.cover_image ? `data:image/jpeg;base64,${book.cover_image.toString('base64')}` : null;
          return {
            ...book,
            cover_image: coverImage
          };
        });
        res.json(response);
      });
    await channel.send(`searching book title ${title} author ${author} category${category}`);
    }  
  })

  //CRUD operations for review
  app.post('/api/reviews/:userId', async (req, res) => {
    const { command,bookId, review } = req.body;
    const userId = req.params.userId; 
    console.log("review",review,bookId,userId)

    const guild = await client.guilds.fetch(guildId);
    const channel = guild.channels.cache.get(channelId);
  
    try {
      if(command === 'addreview'){
        const existingReview = await db.query(
          'SELECT * FROM user_library WHERE book_id = $1 AND user_id = $2',
          [bookId, userId]
        );
    
        if (existingReview.rows.length > 0) {
          await db.query(
            'UPDATE user_library SET review = $1 WHERE book_id = $2 AND user_id = $3',
            [review, bookId, userId]
          );
          res.json({ success: true });
        } else {
         
          await db.query(
            'INSERT INTO user_library (book_id, user_id, review) VALUES ($1, $2, $3)',
            [bookId, userId, review]
          );
          res.json({ success: true });
        }

        await channel.send(`add review ${userId} ${bookId}`);
      }
      

    } catch (err) {
      console.error('Error saving review:', err);
      res.status(500).json({ error: 'Failed to save review' });
    }
  });

  app.get('/api/allbooks/', async (req, res) => {
    try {
      let query = 'SELECT * FROM books';
  
      const rows = await db.query(query);
  
      if (rows.length === 0) {
        return res.status(404).json({ message: 'No books found.' });
      }
      const response = rows.rows.map(book => {
        console.log("book item",book);
        const coverImage = book.cover_image ? `data:image/jpeg;base64,${book.cover_image.toString('base64')}` : null;
        return {
          ...book,
          cover_image: coverImage
        };
      });
      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching books:', error);
      res.status(500).json({ error: 'Failed to fetch books from the database.' });
    }
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
