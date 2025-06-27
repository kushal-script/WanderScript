// middleware/authMiddleware.js
const db = require('../utils/db'); // MySQL connection pool

/**
 * Middleware to check if the user is authenticated (for rendering pages).
 * Redirects to signin page if not authenticated.
 */
exports.isAuthenticated = (req, res, next) => {
    if (req.session.user && req.session.user.id) {
        return next();
    }
    const encodedMessage = encodeURIComponent('Please sign in to access this page.');
    res.redirect(`/WanderScript/signin?message=${encodedMessage}&info=warning`);
};

/**
 * Middleware to check if the user is authenticated (for API endpoints).
 * Sends a 401 JSON response if not authenticated.
 */
exports.isAuthenticatedApi = (req, res, next) => {
    if (req.session.user && req.session.user.id) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Login required.' });
};

/**
 * Middleware to check if the current user is the owner of a specific post.
 * Requires isAuthenticatedApi to run first.
 * Assumes req.params.id contains postID for /posts/delete/:id or /posts/edit/:id
 * Assumes req.params.postID for /comments/:postID (if checking ownership for comments on a post).
 */
exports.isPostOwner = async (req, res, next) => {
    const postId = req.params.id || req.params.postID; // Adjust based on route parameter name
    const currentUserID = req.session.user?.id; // Assumes isAuthenticatedApi has populated req.session.user

    if (!postId || !currentUserID) {
        return res.status(400).json({ success: false, message: 'Missing post ID or user ID.' });
    }

    try {
        const [rows] = await db.query('SELECT userID FROM posts WHERE postID = ?', [postId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }
        if (String(rows[0].userID) === String(currentUserID)) {
            return next(); // User is the owner
        }
        res.status(403).json({ success: false, message: 'Unauthorized: You do not own this post.' });
    } catch (err) {
        console.error("Error checking post ownership:", err);
        res.status(500).json({ success: false, message: 'Server error checking ownership.' });
    }
};

/**
 * Helper function used by commentController for checking post ownership (not directly a middleware, but reusable logic)
 */
exports.userOwnsPost = async (postID, userID) => {
    const [rows] = await db.query('SELECT userID FROM posts WHERE postID = ?', [postID]);
    return rows.length > 0 && String(rows[0].userID) === String(userID);
};