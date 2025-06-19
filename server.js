require('dotenv').config();

const express = require('express');
const app = express();
const connection = require('mysql2');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const methodOverride = require('method-override');
const nodemailer = require('nodemailer');
const validator = require('validator');

const port = process.env.PORT;
const saltRounds = 10;

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

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

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.use(express.urlencoded({ extended: true }));

app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// GET Sign Up
app.get('/WanderScript/signup', (req, res) => {
    res.render('signup.ejs', { 
        message: req.query.message || null,
        messageType: req.query.info });
});

// GET Sign In
app.get('/WanderScript/signin', (req, res) => {
    res.render('signin.ejs', { 
        message: req.query.message || null,
        messageType: req.query.info
     });
});

// GET Forgot Password
app.get('/WanderScript/forgot-password', (req, res) => {
    res.render('forgotPassword.ejs', { 
        message: req.query.message || null,
        messageType: req.query.info
     });
});

// GET Verify OTP
app.get('/WanderScript/verify-otp', (req, res) => {
    res.render('otpVerification.ejs', { 
        message: req.query.message || null,
        messageType: req.query.info
     });
});

//Post verify otp
app.post('/WanderScript/verify-otp', (req, res) => {
    const { verifyRequest, OTPrequest } = req.body;
    if (verifyRequest) {
        otpVerification(req, res);
    }
    if (OTPrequest) {
        sendOtp(req, res);
    }
});

// OTP Verification Function
function otpVerification(req, res) {
    try {
        const { userOtp, email, username } = req.body;
        if (!email || !userOtp || !username) {
            return res.render('otpVerification.ejs', {
                message: "Email, username, and OTP are required.",
                messageType: 'warning',
                mailID: email,
                username: username
            });
        }
        if (!validator.isEmail(email)) {
            return res.redirect('/WanderScript/verify-otp?message=' + encodeURIComponent('Invalid email format.'));
        }
        const query = 'SELECT otp, otp_expiry FROM users WHERE mailID = ? AND username = ?';
        db.query(query, [email, username], (err, results) => {
            if (err) {
                console.error("Database error during OTP verification:", err);
                return res.render('otpVerification.ejs', {
                    message: "Internal server error.",
                    messageType: 'error',
                    mailID: email,
                    username: username
                });
            }
            if (results.length === 0) {
                return res.render('otpVerification.ejs', {
                    message: "No user found with this email or username.",
                    messageType: 'error',
                    mailID: email,
                    username: username
                });
            }

            const dbOtp = results[0].otp;
            const expiry = results[0].otp_expiry;

            if (userOtp == dbOtp && Date.now() < expiry) {
                return res.send(`Welcome ${username} !!`);
            } else {
                return res.render('otpVerification.ejs', {
                    message: "Invalid or expired OTP. Please try again.",
                    messageType: 'error',
                    mailID: email,
                    username: username,
                    otpExpiry: expiry
                });
            }
        });
    } catch (error) {
        console.error("Error in OTP verification logic:", error);
        return res.render('otpVerification.ejs', {
            message: "An unexpected error occurred during OTP verification.",
            messageType: 'error'
        });
    }
}

// Send OTP Function
function sendOtp(req, res) {
    try {
        const { email, username } = req.body;

        if (!email || !username) {
            return res.render('otpVerification.ejs', {
                mailID: email,
                username: username,
                message: 'Email and username are required to resend OTP.',
                messageType: 'warning'
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        const expiry = Date.now() + 5 * 60 * 1000;

        const updateQuery = 'UPDATE users SET otp = ?, otp_expiry = ? WHERE mailID = ? AND username = ?';
        db.query(updateQuery, [otp, expiry, email, username], (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.render('otpVerification.ejs', {
                    mailID: email,
                    username: username,
                    message: 'Failed to update OTP in the database. Please try again.',
                    messageType: 'error'
                });
            }

            if (result.affectedRows === 0) {
                return res.render('otpVerification.ejs', {
                    mailID: email,
                    username: username,
                    message: 'No user found with that email or username.',
                    messageType: 'warning'
                });
            }

            transporter.sendMail({
                from: 'kushal0042@gmail.com',
                to: email,
                subject: 'Your WanderScript OTP',
                text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
            }, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                    return res.render('otpVerification.ejs', {
                        mailID: email,
                        username: username,
                        message: 'Failed to send OTP email. Please try again.',
                        messageType: 'error'
                    });
                }

                console.log('Email sent:', info.response);
                return res.render('otpVerification.ejs', {
                    mailID: email,
                    username: username,
                    otpExpiry: expiry,
                    message: 'OTP sent successfully. Check your email.',
                    messageType: 'success'
                });
            });
        });
    } catch (error) {
        console.error("Error in sending OTP:", error);
        return res.render('otpVerification.ejs', {
            mailID: null,
            message: 'An error occurred while sending the OTP.',
            messageType: 'error'
        });
    }
}

// POST Sign Up
app.post('/WanderScript/signup', async (req, res) => {
    const { username, email, password } = req.body;
    const saltRounds = 10;

    if (!validator.isEmail(email)) {
        return res.redirect('/WanderScript/signup?message=Invalid email format&info=error');
    }
    db.query('SELECT * FROM users WHERE mailID = ?', [email], async (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.redirect('/WanderScript/signin?message=User already exists! Redirecting to login&info=warning');
        } else {
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            db.query('INSERT INTO users (userID, username, mailID, password) VALUES (?, ?, ?, ?)',
                [uuidv4(), username, email, hashedPassword], (err) => {
                    if (err) throw err;
                    res.redirect('/WanderScript/signin?message=Registered successfully! redirecting to login&info=success');
                });
        }
    });
});

// POST Sign In
app.post('/WanderScript/signin', (req, res) => {
    const { email, password, username } = req.body;

    if (!validator.isEmail(email)) {
        return res.redirect('/WanderScript/signin?message=Invalid email format&info=error');
    }

    db.query('SELECT * FROM users WHERE mailID = ?', [email], async (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            res.redirect('/WanderScript/signup?message=User not found! Redirecting to signup&info=warning');
        } else {
            const user = results[0];
            const match1 = await bcrypt.compare(password, user.password);
            const match2 = username === user.username;
            const match3 = email === user.mailID;

            if (match1 && match2 && match3) {
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    email: user.mailID
                };
                res.render('homeFeed.ejs', { message: 'Let the blogging begin!' });
            } else {
                res.redirect('/WanderScript/signin?message=Incorrect credentials&info=error');
            }
        }
    });
});

//POST password reset
app.post('/WanderScript/reset-password', async (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.render('forgotPassword.ejs', { 
            message: "Passwords do not match!",
            messageType: 'error' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const updateQuery = `UPDATE users SET password = ? WHERE mailID = ?`;

        db.query(updateQuery, [hashedPassword, email], (err, result) => {
            if (err) {
                console.error("DB error:", err);
                return res.render('forgotPassword.ejs', { 
                    message: "Database error.",
                    messageType: 'error' });
            }

            if (result.affectedRows === 0) {
                return res.render('forgotPassword.ejs', { 
                    message: "No user found with that email.",
                    messageType: 'error' });
            }

            res.render('forgotPassword.ejs', { 
                message: "Password successfully reset!",
                messageType: 'success' });
        });

    } catch (error) {
        console.error("Error:", error);
        res.render('forgotPassword.ejs', { 
            message: "Something went wrong. Try again.",
            messageType: 'warning' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
}
);