// controllers/authController.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db'); // MySQL connection pool
const emailService = require('../services/emailService');
const userService = require('../services/userService'); // For user lookup
const { renderAuthPage, renderWithError } = require('../utils/helpers');
const validator = require('validator'); // For specific internal email checks if needed

const saltRounds = 10; //Hashing (password)

// GET /signup
exports.getSignupPage = (req, res) => {
    renderAuthPage(res, 'signup.ejs', req.query);
};

// POST /signup
exports.signupUser = async (req, res) => {
    const { username, email, password } = req.body; 

    try {
        const existingUser = await userService.findUserByEmail(email);
        if (existingUser) {
            return res.redirect('/WanderScript/signin?message=User already exists! Redirecting to login&info=warning');
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await db.query('INSERT INTO users (userID, username, mailID, password) VALUES (?, ?, ?, ?)',
            [uuidv4(), username, email, hashedPassword]);

        res.redirect('/WanderScript/signin?message=Registered successfully! redirecting to login&info=success');
    } catch (err) {
        console.error("❌ Error during signup:", err);
        renderWithError(res, 'signup.ejs', { username, email }, "Registration failed. Please try again.", "error");
    }
};

// GET /signin
exports.getSigninPage = (req, res) => {
    renderAuthPage(res, 'signin.ejs', req.query);
};

// POST /signin
exports.signinUser = async (req, res) => {
    const { email, password, username } = req.body; 

    try {
        const user = await userService.findUserByEmail(email);
        if (!user) {
            return res.redirect('/WanderScript/signup?message=User not found! Redirecting to signup&info=warning');
        }

        const match1 = await bcrypt.compare(password, user.password);
        const match2 = username === user.username;
        const match3 = email === user.mailID;

        if (match1 && match2 && match3) {
            req.session.user = {
                id: user.userID,
                username: user.username,
                email: user.mailID
            };
            res.redirect('/WanderScript/loading');
        } else {
            res.redirect('/WanderScript/signin?message=Incorrect credentials&info=error');
        }
    } catch (err) {
        console.error("❌ Error during signin:", err);
        res.redirect('/WanderScript/signin?message=An unexpected error occurred.&info=error');
    }
};

// GET /forgot-password
exports.getForgotPasswordPage = (req, res) => {
    renderAuthPage(res, 'forgotPassword.ejs', req.query);
};

// POST /reset-password
exports.resetPassword = async (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return renderWithError(res, 'forgotPassword.ejs', {}, "Passwords do not match!", "error");
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        const [result] = await db.query(`UPDATE users SET password = ? WHERE mailID = ?`, [hashedPassword, email]);

        if (result.affectedRows === 0) {
            return renderWithError(res, 'forgotPassword.ejs', {}, "No user found with that email.", "error");
        }

        renderAuthPage(res, 'forgotPassword.ejs', { message: "Password successfully reset!", info: 'success' });
    } catch (error) {
        console.error("❌ Error resetting password:", error);
        renderWithError(res, 'forgotPassword.ejs', {}, "Something went wrong. Try again.", "warning");
    }
};

// GET /verify-otp
exports.getVerifyOtpPage = (req, res) => {
    renderAuthPage(res, 'otpVerification.ejs', req.query, { mailID: null, username: null });
};

// POST /verify-otp (handles both verify and send OTP requests)
exports.postVerifyOtp = (req, res) => {
    const { verifyRequest, OTPrequest } = req.body;
    if (verifyRequest) {
        verifyOtp(req, res);
    } else if (OTPrequest) {
        sendOtp(req, res);
    } else {
        res.status(400).send('Bad Request: Missing parameters.');
    }
};

// Internal function: OTP Verification (used by postVerifyOtp)
const verifyOtp = async (req, res) => {
    try {
        const { userOtp, email, username } = req.body;
        if (!email || !userOtp || !username) {
            return renderWithError(res, 'otpVerification.ejs', { mailID: email, username: username }, "Email, username, and OTP are required.", 'warning');
        }
        if (!validator.isEmail(email)) {
            return res.redirect('/WanderScript/verify-otp?message=' + encodeURIComponent('Invalid email format.'));
        }

        const [results] = await db.query('SELECT userID, otp, otp_expiry FROM users WHERE mailID = ? AND username = ?', [email, username]);

        if (results.length === 0) {
            return renderWithError(res, 'otpVerification.ejs', { mailID: email, username: username }, "No user found with this email or username.", 'error');
        }

        const { userID, otp: dbOtp, otp_expiry: expiry } = results[0];

        if (userOtp == dbOtp && Date.now() < expiry) {
            req.session.user = { id: userID, email: email, username: username };
            return res.redirect('/WanderScript/loading');
        } else {
            return renderWithError(res, 'otpVerification.ejs', { mailID: email, username: username, otpExpiry: expiry }, "Invalid or expired OTP. Please try again.", 'error');
        }
    } catch (error) {
        console.error("❌ Error in OTP verification logic:", error);
        renderWithError(res, 'otpVerification.ejs', {}, "An unexpected error occurred during OTP verification.", 'error');
    }
};

// Internal function: Send OTP (used by postVerifyOtp)
const sendOtp = async (req, res) => {
    try {
        const { email, username } = req.body;
        const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;

        if (!email || !username) {
            if (isAjax) return res.status(400).json({ success: false, message: 'Email and username are required.' });
            return renderWithError(res, 'otpVerification.ejs', { mailID: email, username: username }, 'Email and username are required to resend OTP.', 'warning');
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        const expiry = Date.now() + 5 * 60 * 1000;

        const [result] = await db.query('UPDATE users SET otp = ?, otp_expiry = ? WHERE mailID = ? AND username = ?', [otp, expiry, email, username]);

        if (result.affectedRows === 0) {
            if (isAjax) return res.status(404).json({ success: false, message: 'No user found with that email or username.' });
            return renderWithError(res, 'otpVerification.ejs', { mailID: email, username: username }, 'No user found with that email or username.', 'warning');
        }

        await emailService.sendOtpEmail(email, otp); // Using the service

        if (isAjax) return res.status(200).json({ success: true, message: 'New OTP sent successfully!', otpExpiry: expiry });
        renderAuthPage(res, 'otpVerification.ejs', { message: 'OTP sent successfully. Check your email.', info: 'success' }, { mailID: email, username: username, otpExpiry: expiry });

    } catch (error) {
        console.error("❌ Error in sending OTP:", error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: 'An error occurred while sending the OTP.' });
        }
        renderWithError(res, 'otpVerification.ejs', { mailID: email, username: username }, 'An error occurred while sending the OTP.', 'error');
    }
};

// POST /logout
exports.logoutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("❌ Error destroying session:", err);
            return res.status(500).json({ success: false, message: "Failed to log out." });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.status(200).json({ success: true, message: 'Logged out successfully.' });
    });
};

// DELETE /delete-account (This route is more a user action, might fit better in userController)
exports.deleteAccount = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userID = req.session.user.id;
    try {
        await db.query(`DELETE FROM users WHERE userID = ?`, [userID]);
        req.session.destroy((err) => {
            if (err) {
                console.error("❌ Error destroying session after account delete:", err);
                return res.status(500).json({ success: false, message: "Account deleted, but failed to clear session." });
            }
            res.clearCookie('connect.sid');
            res.json({ success: true, message: 'Account and session deleted.' });
        });
    } catch (err) {
        console.error("❌ Error deleting user account:", err);
        res.status(500).json({ success: false, message: 'Failed to delete account.' });
    }
};