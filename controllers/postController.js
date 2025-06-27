// controllers/postController.js
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db'); // MySQL connection pool
const userService = require('../services/userService'); // To get userID from email
const { renderWithError } = require('../utils/helpers');

// GET /posts/new
exports.getNewPostPage = (req, res) => {
    // isAuthenticated middleware should handle the initial session check
    res.render('newPost', {
        user: req.session.user,
        message: null // Initialize message
    });
};

// POST /posts/new
exports.createPost = async (req, res) => {
    const { title, description } = req.body; // Validation handled by middleware
    const sessionUser = req.session.user; // User guaranteed by middleware

    try {
        const user = await userService.findUserByEmail(sessionUser.email); // Ensure user exists and get their ID
        if (!user) {
            return res.redirect('/WanderScript/signin?message=User not found. Please re-login&info=error');
        }

        await db.query(
            `INSERT INTO posts (postID, userID, title, description, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [uuidv4(), user.userID, title, description]
        );

        res.redirect('/WanderScript/profile');
    } catch (err) {
        console.error("❌ Error creating post:", err);
        renderWithError(res, 'newPost', { user: sessionUser, title, description }, "Failed to create post. Try again.", "error");
    }
};

// GET /posts/edit/:id
exports.getEditPostPage = async (req, res) => {
    // isAuthenticated middleware should handle the initial session check
    const postID = req.params.id;

    try {
        const [[post]] = await db.query(
            `SELECT postID AS _id, title, description AS info FROM posts WHERE postID = ?`,
            [postID]
        );

        if (!post) {
            return res.status(404).send("Post not found.");
        }

        res.render('editPost', {
            post,
            user: req.session.user,
            message: null
        });
    } catch (err) {
        console.error("❌ Error loading post for editing:", err);
        res.status(500).send("Internal server error.");
    }
};

// PUT /posts/edit/:id
exports.updatePost = async (req, res) => {
    // isAuthenticated middleware handles session check
    // isPostOwner middleware handles authorization
    const postID = req.params.id;
    const { title, description } = req.body;

    if (!title || !description) {
        return res.render('editPost', {
            message: "Both fields required.",
            post: { _id: postID, title, info: description },
            user: req.session.user
        });
    }

    try {
        await db.query(
            `UPDATE posts SET title = ?, description = ? WHERE postID = ?`,
            [title, description, postID]
        );
        res.render('editPost', {
            post: { _id: postID, title, info: description },
            user: req.session.user,
            message: "Post updated successfully.",
            messageType: "success" // Added messageType
        });
    } catch (err) {
        console.error("❌ Error updating post:", err);
        res.status(500).send("Error saving changes.");
    }
};

// DELETE /posts/delete/:id
exports.deletePost = async (req, res) => {
    // isAuthenticatedApi & isPostOwner middleware handle checks
    const postID = req.params.id;

    try {
        // Delete related upvotes first 
        await db.query(`DELETE FROM post_upvotes WHERE postID = ?`, [postID]);
        // Then delete the post
        await db.query(`DELETE FROM posts WHERE postID = ?`, [postID]);

        return res.status(200).json({ success: true, message: 'Post deleted successfully.' });
    } catch (err) {
        console.error("❌ Error deleting post:", err);
        return res.status(500).json({ success: false, message: 'Error deleting post.' });
    }
};

// GET /homefeed
exports.getHomeFeed = async (req, res) => {
    // isAuthenticated middleware should handle the initial session check
    const currentUser = req.session.user; // Guaranteed to exist by middleware
    const userID = currentUser.id;

    try {
        const [allPosts] = await db.query(`
            SELECT
                p.postID, p.title, p.description,
                p.userID, u.username,
                (SELECT COUNT(*) FROM post_upvotes WHERE postID = p.postID) AS upvotes,
                EXISTS (
                    SELECT 1 FROM post_upvotes
                    WHERE postID = p.postID
                    AND userID = ?
                ) AS isUpvoted
            FROM posts p
            JOIN users u ON p.userID = u.userID
            WHERE p.userID != ?
            ORDER BY p.created_at DESC`,
            [userID, userID]);

        const [followingRows] = await db.query(
            `SELECT followingID FROM followers WHERE followerID = ?`,
            [userID]
        );

        const followingIDs = new Set(followingRows.map(row => row.followingID));

        const postsWithFollowFlag = allPosts.map(post => ({
            ...post,
            isFollowing: followingIDs.has(post.userID)
        }));

        let totalUnreadCount = 0;
        const threads = await require('../models/Message').find({ participants: userID }); // Direct model import

        for (let thread of threads) {
            const unreadCountInThread = await require('../models/Chats').countDocuments({ // Direct model import
                threadID: thread._id,
                receiverID: userID,
                isRead: false
            });
            totalUnreadCount += unreadCountInThread;
        }

        res.render('homeFeed', {
            allPosts: postsWithFollowFlag,
            currentUser,
            totalUnreadCount
        });
    } catch (err) {
        console.error("❌ Error loading home feed:", err);
        res.status(500).send("Server error loading feed.");
    }
};

// POST /posts/upvote/:id
exports.upvotePost = async (req, res) => {
    // isAuthenticatedApi middleware should handle the initial session check
    const userID = req.session.user.id;
    const postID = req.params.id;

    try {
        const [[existing]] = await db.query(
            `SELECT * FROM post_upvotes WHERE postID = ? AND userID = ?`,
            [postID, userID]
        );

        let isUpvoted;
        if (existing) {
            await db.query(
                `DELETE FROM post_upvotes WHERE postID = ? AND userID = ?`,
                [postID, userID]
            );
            isUpvoted = false;
        } else {
            await db.query(
                `INSERT INTO post_upvotes (postID, userID) VALUES (?, ?)`,
                [postID, userID]
            );
            isUpvoted = true;
        }

        const [[{ count }]] = await db.query(
            `SELECT COUNT(*) as count FROM post_upvotes WHERE postID = ?`,
            [postID]
        );

        res.json({ success: true, isUpvoted, newUpvoteCount: count });
    } catch (err) {
        console.error("❌ Upvote error:", err);
        return res.status(500).json({ success: false, message: "Server error during upvote." });
    }
};