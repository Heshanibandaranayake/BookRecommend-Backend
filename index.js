require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2");
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Connection
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

//Signup 
app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password } = req.body;
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
      db.query(sql, [name, email, hashedPassword], (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Email already exists" });
          }
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
      const sql = "SELECT * FROM users WHERE email = ?";
      //if(sql)
      console.log("sql",sql)
      db.query(sql, [email], async (err, results) => {
        
        if (err) 
            return res.status(500).json({ message: "Database error" });
  
        if (results.length === 0) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
  
        const user = results[0];
        console.log("user",user);
        const isMatch = await bcrypt.compare(password, user.password);
  
        if (!isMatch) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
  
        
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });
  
        return res.json({ message: "Login successful", token, user: user.name});
      });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // app.get("/api/books/recommendations", (req, res) => {
  //   const books = [
  //     {
  //       id: 1,
  //       title: "The Great Gatsby",
  //       author: "F. Scott Fitzgerald",
  //       description: "A novel set in the 1920s, exploring themes of wealth and society.",
  //       covermage: "https://example.com/images/gatsby.jpg",
  //     },
  //     {
  //       id: 2,
  //       title: "To Kill a Mockingbird",
  //       author: "Harper Lee",
  //       description: "A powerful story about racial injustice in the American South.",
  //       coverImage: "https://example.com/images/mockingbird.jpg",
  //     },
  //     {
  //       id: 3,
  //       title: "1984",
  //       author: "George Orwell",
  //       description: "A dystopian novel about totalitarian government surveillance and control.",
  //       coverImage: "https://example.com/images/1984.jpg",
  //     },
  //   ];
  
  //   return res.status(200).json(books);
  // });
  
  // Get user's library books
app.get("/api/user-library/:userId", (req, res) => {
    const userId = req.params.userId;
  
    const sql = `
      SELECT b.id, b.title, b.author, b.category, b.cover_image, ul.review
      FROM user_library ul
      JOIN books b ON ul.book_id = b.id
      WHERE ul.user_id = ?
    `;
  
    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Error fetching user library books:", err);
        return res.status(500).json({ message: "Database error" });
      }
      const response = results.map(book => {
        const coverImage = book.cover_image ? `data:image/jpeg;base64,${book.cover_image.toString('base64')}` : null;
        return {
          ...book,
          cover_image: coverImage
        };
      });
      res.json(response);
    });
  });

  // Search books based on query parameters
app.get('/api/search-books', (req, res) => {

    const { title, author, category } = req.query;
  
    let sql = 'SELECT * FROM books WHERE 1=1'; 
  
    const params = [];
  
    if (title) {
      sql += ' AND title LIKE ?';
      params.push(`%${title}%`);
    }
  
    if (author) {
      sql += ' AND author LIKE ?';
      params.push(`%${author}%`);
    }
  
    if (category) {
      sql += ' AND category LIKE ?';
      params.push(`%${category}%`);
    }
  
    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('Error executing search query:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      const response = results.map(book => {
        console.log("book item",book);
        const coverImage = book.cover_image ? `data:image/jpeg;base64,${book.cover_image.toString('base64')}` : null;
        return {
          ...book,
          cover_image: coverImage
        };
      });
      res.json(response);
    });
  });

app.post('/api/add-to-library/:userId', async(req, res) => {
    const  channelId  = req.body.channelId;
    const userId =req.params.userId; 
    console.log("channelId",channelId);
    try {
      const { data: books } = await axios.get(`http://localhost:5000/api/user-library/${userId}`);
      if (books.length === 0) {
        return res.status(404).json({ message: 'No books found for this user.' });
      }
  
      const bookList = books
        .map(book => `${book.id}. **${book.title}** by ${book.author} (Category: ${book.category})`)
        .join('\n');
  
      // Send the message via bot
      let content = {channelId,message: `📚 **User's Library:**\n${bookList}`};

      // const botResponse = axios({
      //   url: 'http://localhost:4000/bot/post-message',  
      //   method: "post",
      //   body: JSON.stringify(content)
      // })
      console.log("content",content);
      const botResponse = await axios.post('http://localhost:4000/bot/post-message', content);
      console.log("bot response",botResponse);
      
  
      res.status(200).json({ message: 'Library posted to Discord.', botResponse: botResponse.data });
    } catch (err) {
      console.error('Error posting library to Discord:', err);
      res.status(500).json({ message: 'Failed to post library to Discord.' });
    }
    // const sql = 'INSERT INTO user_library (user_id, book_id) VALUES (?, ?)';
    // db.query(sql, [userId, bookId], (err, result) => {
    //   if (err) {
    //     console.error('Error adding book to library:', err);
    //     return res.status(500).json({ message: 'Error adding book to library' });
    //   }
    //   res.json({ message: 'Book added to your library' });
    // });


  });
  // app.get('/api/recommendations', async (req, res) => {
  //   const query = req.query.query;
  
  //   if (!query) {
  //     return res.status(400).json({ message: 'Query parameter is required' });
  //   }
  
  //   try {
  //     const response = await axios.get(`http://localhost:4000/recommendations?query=${query}`);
  
  //     res.json(response);
  //   } catch (err) {
  //     console.error('Error fetching recommendations:', err);
  //     res.status(500).json({ message: 'Database error' });
  //   }
  // });

  app.post('/api/reviews/', async (req, res) => {
    const { review } = req.body;
    const bookId = req.query.bookId;
    const userId = req.query.userId; 
    console.log("review",review,bookId,userId)
  
    try {
      // Check if the user already has a review for this book
      const [existingReview] = await db.promise().query(
        'SELECT * FROM user_library WHERE book_id = ? AND user_id = ?',
        [bookId, userId]
      );
  
      if (existingReview.length > 0) {
        // If review exists, update it
        await db.promise().query(
          'UPDATE user_library SET review = ? WHERE book_id = ? AND user_id = ?',
          [review, bookId, userId]
        );
        res.json({ success: true });
      } else {
       
        await db.promise().query(
          'INSERT INTO user_library (book_id, user_id, review) VALUES (?, ?, ?)',
          [bookId, userId, review]
        );
        res.json({ success: true });
      }
    } catch (err) {
      console.error('Error saving review:', err);
      res.status(500).json({ error: 'Failed to save review' });
    }
  });
  
  app.delete('/api/library/', async (req, res) => {
    console.log("req.query",req.query);
    const bookId = req.query.bookId;
    const userId = req.query.userId; 
  
    try {
      const [existingEntry] = await db.promise().query(
        'SELECT * FROM user_library WHERE book_id = ? AND user_id = ?',
        [bookId, userId]
      );
  
      if (existingEntry.length > 0) {
        await db.promise().query(
          'DELETE FROM user_library WHERE book_id = ? AND user_id = ?',
          [bookId, userId]
        );
        res.json({ success: true, message: 'Book removed from library.' });
      } else {
        res.status(404).json({ success: false, message: 'Book not found in library.' });
      }
    } catch (err) {
      console.error('Error removing book from library:', err);
      res.status(500).json({ error: 'Failed to remove book from library.' });
    }
  });
  
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  
  