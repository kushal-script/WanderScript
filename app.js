// app.js

require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const methodOverride = require('method-override');
const multer = require('multer'); // For handling form-data
const upload = multer(); // Initialize multer (can be configured more specifically if files are involved)

// Import custom modules
const db = require('./utils/db'); // MySQL connection pool
const connectMongo = require('./utils/mongo'); // MongoDB connection function

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Configuration
const port = process.env.PORT || 3000;

// Global Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(upload.none()); // Use this for processing form-data without files globally

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/WanderScript/assets', express.static('public/assets'));

// Database Connections
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ MySQL DB Connection Error:", err);
        process.exit(1); // Exit process if cannot connect to DB
    } else {
        console.log("✅ Connected to MySQL (wanderScriptDB)");
        connection.release(); // Release connection back to pool
    }
});

connectMongo(); // Call the MongoDB connection function

// Mount Routes
// All routes under /WanderScript will be handled by these routers
app.use('/WanderScript', authRoutes);
app.use('/WanderScript', userRoutes);
app.use('/WanderScript/posts', postRoutes);
app.use('/WanderScript/comments', commentRoutes);
app.use('/WanderScript/messages', messageRoutes);

// Generic Redirects (loading pages) - These could potentially be moved to a `generalRoutes.js`
app.get('/WanderScript/loading', (req, res) => {
    if (!req.session.user) return res.redirect('/WanderScript/signin');
    res.render('loading', {
        redirectTo: '/WanderScript/profile',
        tagline: 'let the blogging begin !!'
    });
});

app.get('/WanderScript/transition-logout', (req, res) => {
    res.render('loading', { redirectTo: '/WanderScript/signin', tagline: '' });
});

app.get('/WanderScript/transition-delete', (req, res) => {
    res.render('loading', { redirectTo: '/WanderScript/signin', tagline: '' });
});

// 404 Not Found Handler
app.use((req, res) => {
    res.status(404).render('pageNotFound', {
        user: req.session.user || null
    });
});

// Start Server
app.listen(port, () => {
    console.log(`🚀 WanderScript server running on http://localhost:${port}`);
});