require('dotenv').config();

const express = require('express');
const app = express();
const connection = require('mysql2');
const path = require('path');
// const bcrypt = require('bcrypt');
const session = require('express-session');
// const { v4: uuidv4 } = require('uuid');
const methodOverride = require('method-override');
// const nodemailer = require('nodemailer');
// const validator = require('validator');

const port = 2000;

// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: true,
//     cookie: {
//         secure: false,
//         maxAge: 24 * 60 * 60 * 1000 // 1 day
//     }
// }));

const db = connection.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error("DB Connection Error:", err);
    } else {
        console.log("Connected to MySQL (wanderScriptDB)");
    }
});

app.use(express.urlencoded({ extended: true }));

app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/WanderScript/Profile', (req, res) => {
    console.log("Rendering currentUser.ejs");
    res.render('currentUser.ejs');
});

app.post('/', (req, res) => {
    let infoQuery = 
})

  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));