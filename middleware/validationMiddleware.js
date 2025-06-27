// middleware/validationMiddleware.js
const validator = require('validator'); // Your external validator library

/**
 * Validates the format of an email address.
 * Redirects to signin with error message on failure.
 */
exports.validateEmail = (req, res, next) => {
    const email = req.body.email || req.query.email; // Can be in body or query
    if (!email || !validator.isEmail(email)) {
        const encodedMessage = encodeURIComponent('Invalid email format.');
        return res.redirect(`/WanderScript/signin?message=${encodedMessage}&info=error`);
    }
    next();
};

/**
 * Validates signup input fields (username, email, password).
 * Redirects to signup with error message on failure.
 */
exports.validateSignupInput = (req, res, next) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        const encodedMessage = encodeURIComponent('All fields are required.');
        return res.redirect('/WanderScript/signup?message=' + encodedMessage + '&info=error');
    }
    if (!validator.isEmail(email)) {
        const encodedMessage = encodeURIComponent('Invalid email format.');
        return res.redirect('/WanderScript/signup?message=' + encodedMessage + '&info=error');
    }
    // You could add password strength validation here
    next();
};

/**
 * Validates post input (title, description).
 * Renders newPost page with error message on failure.
 */
exports.validatePostInput = (req, res, next) => {
    const { title, description } = req.body;
    if (!title || !description) {
        // Assuming this is used for a page render, not an API call
        return res.render('newPost', {
            user: req.session.user, // Pass current user back to the form
            message: "Title and description are required.",
            messageType: "error"
        });
    }
    next();
};

/**
 * Validates mail form input.
 * Renders mail page with error message on failure.
 */
exports.validateMailInput = async (req, res, next) => {
    const { from, to, subject, body } = req.body;
    const username = req.session.user?.username;
    const toUserID = req.params.id;

    if (!from || !to || !subject || !body || !username) {
        const [rows] = await require('../utils/db').query('SELECT username FROM users WHERE userID = ?', [toUserID]);
        const otherUsername = rows.length > 0 ? rows[0].username : 'Recipient';

        return res.render('mail', {
            toMail: to,
            fromMail: from,
            toUserID,
            otherUsername: otherUsername,
            user: { username }, // Current user's username
            subject,
            body,
            message: "All fields are required.",
            messageType: "error"
        });
    }
    next();
};