// services/userService.js
const db = require('../utils/db'); // MySQL connection pool

/**
 * Finds a user by their email address.
 * @param {string} email - The email ID to search for.
 * @returns {Promise<object|null>} The user object or null if not found.
 */
exports.findUserByEmail = async (email) => {
    const [rows] = await db.query('SELECT * FROM users WHERE mailID = ?', [email]);
    return rows[0] || null;
};

/**
 * Finds a user by their user ID.
 * @param {string} userID - The user ID to search for.
 * @returns {Promise<object|null>} The user object (userID, username, mailID) or null if not found.
 */
exports.findUserById = async (userID) => {
    const [rows] = await db.query('SELECT userID, username, mailID FROM users WHERE userID = ?', [userID]);
    return rows[0] || null;
};

/**
 * Finds a user's profile information by their user ID.
 * @param {string} userID - The user ID to search for.
 * @returns {Promise<object|null>} User profile data or null if not found.
 */
exports.getUserProfileInfoById = async (userID) => {
    const [rows] = await db.query(
        `SELECT userID, username, bio, youtube_link, linkedin_link, instagram_link FROM users WHERE userID = ?`,
        [userID]
    );
    return rows[0] || null;
};

/**
 * Gets the follower count for a given user.
 * @param {string} userID - The ID of the user.
 * @returns {Promise<number>} The number of followers.
 */
exports.getFollowerCount = async (userID) => {
    const [[{ followerCount }]] = await db.query(
        `SELECT COUNT(*) AS followerCount FROM followers WHERE followingID = ?`,
        [userID]
    );
    return followerCount;
};

/**
 * Gets the total upvotes across all posts by a given user.
 * @param {string} userID - The ID of the user.
 * @returns {Promise<number>} The total upvotes.
 */
exports.getTotalUpvotesForUserPosts = async (userID) => {
    const [[{ totalUpvotes }]] = await db.query(
        `SELECT COUNT(*) AS totalUpvotes FROM post_upvotes
         WHERE postID IN (SELECT postID FROM posts WHERE userID = ?)`,
        [userID]
    );
    return totalUpvotes;
};

/**
 * Gets posts by a specific user, including upvote count and whether current user upvoted.
 * @param {string} targetUserID - The ID of the user whose posts are being fetched.
 * @param {string} currentUserID - The ID of the currently logged-in user (for upvote status).
 * @returns {Promise<Array<object>>} An array of post objects.
 */
exports.getPostsByUserId = async (targetUserID, currentUserID) => {
    const [posts] = await db.query(
        `SELECT
           p.postID AS _id,
           p.title,
           p.description AS info,
           (SELECT COUNT(*) FROM post_upvotes pu WHERE pu.postID = p.postID) AS upvotes,
           EXISTS(
             SELECT 1 FROM post_upvotes
             WHERE postID = p.postID AND userID = ?
           ) AS isUpvoted
         FROM posts p
         WHERE p.userID = ?
         ORDER BY p.created_at DESC`,
        [currentUserID, targetUserID]
    );
    return posts;
};

/**
 * Checks if a follower relationship exists.
 * @param {string} followerID - The ID of the follower.
 * @param {string} followingID - The ID of the user being followed.
 * @returns {Promise<boolean>} True if following, false otherwise.
 */
exports.isFollowing = async (followerID, followingID) => {
    const [[isFollowing]] = await db.query(
        `SELECT 1 FROM followers WHERE followerID = ? AND followingID = ?`,
        [followerID, followingID]
    );
    return Boolean(isFollowing);
};

/**
 * Fetches users for search functionality.
 * @param {string} search - The search query.
 * @param {string} loggedInUserID - The ID of the logged-in user to exclude from results.
 * @returns {Promise<Array<object>>} List of matching users.
 */
exports.searchUsers = async (search, loggedInUserID) => {
    const sql = `
        SELECT u.userID, u.username,
               (SELECT COUNT(*) FROM followers WHERE followingID = u.userID) AS followersCount
        FROM users u
        WHERE u.username LIKE ? AND u.userID != ?
        LIMIT 10
    `;
    const [results] = await db.query(sql, [`%${search}%`, loggedInUserID]);
    return results;
};

/**
 * Fetches all users currently followed by a given user.
 * @param {string} userID - The ID of the user whose following list is needed.
 * @returns {Promise<Array<object>>} List of users being followed.
 */
exports.getUsersBeingFollowed = async (userID) => {
    const [following] = await db.query(`
        SELECT u.userID, u.username FROM followers f
        JOIN users u ON f.followingID = u.userID
        WHERE f.followerID = ?
    `, [userID]);
    return following;
};

/**
 * Fetches all users who are following a given user.
 * @param {string} userID - The ID of the user whose follower list is needed.
 * @returns {Promise<Array<object>>} List of followers.
 */
exports.getFollowers = async (userID) => {
    const [followers] = await db.query(`
        SELECT u.userID, u.username FROM followers f
        JOIN users u ON f.followerID = u.userID
        WHERE f.followingID = ?
    `, [userID]);
    return followers;
};