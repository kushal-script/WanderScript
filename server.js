const express = require('express');
const app = express();
const port = 3000;
const connection = require('mysql2');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const {v4: uuidv4} = require('uuid');
const methodOverride = require('method-override');
const saltRounds = 10;

app.use(session({
    secret: 'your-secret-key', // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

const db = connection.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'kushal@RVU', 
    database: 'wanderScriptDB'
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

// GET Sign Up
app.get('/WanderScript/signup', (req, res) => {
    res.render('signup.ejs', { message: req.query.message || null });
});

// GET Sign In
app.get('/WanderScript/signin', (req, res) => {
    res.render('signin.ejs', { message: req.query.message || null });
});

// GET Forgot Password
app.get('/WanderScript/forgot-password', (req, res) => {
    res.render('forgotPassword.ejs', { message: req.query.message || null });
});

// POST Sign Up
app.post('/WanderScript/signup', async (req, res) => {
    const {username, email, password} = req.body;
    const saltRounds = 10;
    db.query('SELECT * FROM users WHERE mailID = ?', [email], async (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.redirect('/WanderScript/signin?message=' + encodeURIComponent('User already exists. Redirecting to login.'));
        } else {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            db.query('INSERT INTO users (userID, username, mailID, password) VALUES (?, ?, ?, ?)',
                [uuidv4(), username, email, hashedPassword], (err) => {
                    if (err) throw err;
                    res.redirect('/WanderScript/signin?message=' + encodeURIComponent('Registered successfully! Please sign in.'));
                });
        }
    });
});

// POST Sign In
app.post('/WanderScript/signin', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE mailID = ?', [email], async (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            res.redirect('/WanderScript/signup?message=' + encodeURIComponent('User not found! Redirecting to sign up.'));
        } else {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    email: user.mailID
                };
                res.send(`Welcome, ${user.username}!`);
            } else {
                res.redirect('/WanderScript/signin?message=' + encodeURIComponent('Incorrect password.'));
            }
        }
    });
});

//POST password reset
app.post('/WanderScript/reset-password', async (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.render('forgotPassword.ejs', { message: "Passwords do not match!" });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const updateQuery = `UPDATE users SET password = ? WHERE mailID = ?`;

        db.query(updateQuery, [hashedPassword, email], (err, result) => {
            if (err) {
                console.error("DB error:", err);
                return res.render('forgotPassword.ejs', { message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.render('forgotPassword.ejs', { message: "No user found with that email." });
            }

            res.render('forgotPassword.ejs', { message: "Password successfully reset!" });
        });

    } catch (error) {
        console.error("Error:", error);
        res.render('forgotPassword.ejs', { message: "Something went wrong. Try again." });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  }
  );












// Logout route
// app.get('/logout', (req, res) => {
//     req.session.destroy();
//     res.redirect('/signin?message=' + encodeURIComponent('You have been logged out.'));
// });

// app.get('/WanderScript/:username', (req, res) => {
//     const username =req.params.username;
//     const query = 'SELECT * FROM users WHERE username = ?';
//     db.query(query, [username], (error, results) => {
//         if(error){
//             console.log("Error fetching user data:", error);
//             res.status(500).send("Error fetching user data");
//         }
//         const user = results[0];
//         if (!user) {
//             return res.status(404).send('User not found');
//         }
//         res.render('currentUser.ejs', { user });
//     })
// });

// db.query('SHOW TABLES', (err, results) => {
//     if (err) {
//         console.error('Error fetching tables:', err);
//     } else {
//         console.log('Tables in the database:', results.map(row => Object.values(row)[0]));
//     }
// }
// );

