const express = require('express');
const app = express();
const connection = require('mysql2');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const {v4: uuidv4} = require('uuid');
const methodOverride = require('method-override');
const nodemailer = require('nodemailer');

const port = 3000;
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

//OTP confirmation
const otp = Math.floor(100000 + Math.random() * 900000); 
const expiry = Date.now() + 5 * 60 * 1000; 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'kushal0042@gmail.com',
      pass: 'zrgp rkbm mjxn rpkk' 
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

// GET Verify OTP
app.get('/WanderScript/verify-otp', (req, res) => {
    res.render('otpVerification.ejs', { message: req.query.message || null });
});

//Post verify otp
app.post('/WanderScript/verify-otp', (req, res) => {
    const { verifyRequest, OTPrequest } = req.body;
    if(verifyRequest){
        otpVerification(req, res);
    }
    if(OTPrequest){
        sendOtp(req, res);
    }
});

//Function otp verification
function otpVerification(req, res) {
    try {
        const { userOtp, email, username } = req.body;

        if (!email || !userOtp || !username) {
            return res.render('otpVerification.ejs', {
                message: "Email, username, and OTP are required.",
                mailID: email
            });
        }
        const query = 'SELECT otp, otp_expiry FROM users WHERE mailID = ? and username = ?';
        db.query(query, [email, username], (err, results) => {
            if (err) {
                console.error("Database error during OTP verification:", err);
                return res.render('otpVerification.ejs', {
                    message: "Internal server error.",
                    mailID: email
                });
            }
            if (results.length === 0) {
                return res.render('otpVerification.ejs', {
                    message: "No user found with this email or username.",
                    mailID: email
                });
            }

            const dbOtp = results[0].otp;
            const expiry = results[0].otp_expiry;

            if (userOtp == dbOtp && Date.now() < expiry) {
                res.send(`Welcome ${username} !!`);
            } else {
                res.render('otpVerification.ejs', {
                    message: "Invalid or expired OTP. Please try again.",
                    mailID: email,
                    otpExpiry: expiry
                });
            }
        });
    } catch (error) {
        console.error("Error in OTP verification logic:", error);
        res.render('otpVerification.ejs', {
            message: "An unexpected error occurred during OTP verification."
        });
    }
}

// OTP Verification Function
function otpVerification(req, res) {
    try {
        const { userOtp, email, username } = req.body;
        if (!email || !userOtp || !username) {
            return res.render('otpVerification.ejs', {
                message: "Email, username, and OTP are required.",
                mailID: email,
                username: username
            });
        }
        const query = 'SELECT otp, otp_expiry FROM users WHERE mailID = ? AND username = ?';
        db.query(query, [email, username], (err, results) => {
            if (err) {
                console.error("Database error during OTP verification:", err);
                return res.render('otpVerification.ejs', {
                    message: "Internal server error.",
                    mailID: email,
                    username: username
                });
            }
            if (results.length === 0) {
                return res.render('otpVerification.ejs', {
                    message: "No user found with this email or username.",
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
                    mailID: email,
                    username: username,
                    otpExpiry: expiry
                });
            }
        });
    } catch (error) {
        console.error("Error in OTP verification logic:", error);
        return res.render('otpVerification.ejs', {
            message: "An unexpected error occurred during OTP verification."
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
                message: 'Email and username are required to resend OTP.'
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
                    message: 'Failed to update OTP in the database. Please try again.'
                });
            }

            if (result.affectedRows === 0) {
                return res.render('otpVerification.ejs', {
                    mailID: email,
                    username: username,
                    message: 'No user found with that email or username.'
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
                        message: 'Failed to send OTP email. Please try again.'
                    });
                }

                console.log('Email sent:', info.response);
                return res.render('otpVerification.ejs', {
                    mailID: email,
                    username: username,
                    otpExpiry: expiry,
                    message: 'OTP sent successfully. Check your email.'
                });
            });
        });
    } catch (error) {
        console.error("Error in sending OTP:", error);
        return res.render('otpVerification.ejs', {
            mailID: null,
            message: 'An error occurred while sending the OTP.'
        });
    }
}

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