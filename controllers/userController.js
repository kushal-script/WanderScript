// controllers/userController.js
const db = require('../utils/db'); // MySQL connection pool
const userService = require('../services/userService'); // User service for data fetching
const { renderWithError } = require('../utils/helpers');
const { isAuthenticated } = require('../middleware/authMiddleware'); // For reuse

// GET /profile
exports.getUserProfile = async (req, res) => {
    // isAuthenticated middleware should handle the initial session check
    const sessionUser = req.session.user; // User guaranteed to exist by middleware

    try {
        const user = await userService.getUserProfileInfoById(sessionUser.id); // Use session ID for current user
        if (!user) {
            // This case ideally shouldn't happen if session.user.id is valid
            return res.redirect('/WanderScript/signin?message=User profile data not found&info=error');
        }

        const followerCount = await userService.getFollowerCount(user.userID);
        const totalUpvotes = await userService.getTotalUpvotesForUserPosts(user.userID);
        const posts = await userService.getPostsByUserId(user.userID, sessionUser.id); // Pass current user ID for upvote status

        const profileData = {
            username: user.username,
            bio: user.bio || 'No bio yet.',
            followers: Array(followerCount).fill('•'), // Just for EJS rendering
            totalUpvotes,
            posts
        };

        res.render('currentUser', { user: profileData });
    } catch (err) {
        console.error("❌ Error loading current user profile:", err);
        res.status(500).send("An unexpected error occurred while loading your profile.");
    }
};

// GET /profile/edit
exports.getEditProfilePage = async (req, res) => {
    // isAuthenticated middleware should handle the initial session check
    const sessionUser = req.session.user;

    try {
        const user = await userService.getUserProfileInfoById(sessionUser.id);

        if (!user) {
            return res.redirect('/WanderScript/signin?message=User not found for editing&info=error');
        }

        res.render('editProfile', {
            user: {
                username: user.username,
                bio: user.bio || '',
                linkedin: user.linkedin_link || '',
                instagram: user.instagram_link || '',
                youtube: user.youtube_link || ''
            },
            message: null
        });
    } catch (err) {
        console.error("❌ Error loading profile edit page:", err);
        res.status(500).send("Error loading edit profile page.");
    }
};

// PUT /profile/edit
exports.updateProfile = async (req, res) => {
    // isAuthenticated middleware handles session check
    const { username, bio, linkedin, instagram, youtube } = req.body;
    const sessionUser = req.session.user;

    try {
        const updateQuery = `
            UPDATE users
            SET username = ?, bio = ?, linkedin_link = ?, instagram_link = ?, youtube_link = ?
            WHERE mailID = ?
        `;
        await db.query(updateQuery, [
            username, bio, linkedin, instagram, youtube, sessionUser.email
        ]);

        req.session.user.username = username; // Update session with new username

        res.redirect('/WanderScript/profile');
    } catch (err) {
        console.error("❌ Error updating profile:", err);
        res.status(500).send("Error updating profile.");
    }
};

// GET /user/:id (Other User Profile)
exports.getOtherUserProfile = async (req, res) => {
    // isAuthenticated middleware should handle the initial session check
    const targetUserID = req.params.id;
    const currentUserID = req.session.user.id;

    try {
        const user = await userService.getUserProfileInfoById(targetUserID);
        if (!user) {
            return res.status(404).send("User not found.");
        }

        const followerCount = await userService.getFollowerCount(targetUserID);
        const totalUpvotes = await userService.getTotalUpvotesForUserPosts(targetUserID);
        const posts = await userService.getPostsByUserId(targetUserID, currentUserID); // Pass current user ID
        const isFollowing = await userService.isFollowing(currentUserID, targetUserID);

        const profileData = {
            _id: targetUserID, 
            username: user.username,
            bio: user.bio || 'No bio yet.',
            followers: Array(followerCount).fill('•'),
            totalUpvotes,
            posts,
            isFollowing: isFollowing,
            youtube: user.youtube_link,
            linkedin: user.linkedin_link,
            instagram: user.instagram_link
        };

        res.render('otherUser', {
            user: profileData,
            currentUser: req.session.user // Pass current user session data
        });
    } catch (err) {
        console.error("❌ Error loading other user profile:", err);
        res.status(500).send("An unexpected error occurred.");
    }
};

// POST /follow/:id
exports.followUser = async (req, res) => {
    // isAuthenticatedApi middleware should handle the initial session check
    const followerID = req.session.user.id;
    const followingID = req.params.id;

    if (followerID === followingID) {
        return res.status(400).json({ success: false, message: 'Cannot follow yourself.' });
    }

    try {
        await db.query(
            `INSERT IGNORE INTO followers (followerID, followingID) VALUES (?, ?)`,
            [followerID, followingID]
        );
        res.json({ success: true, isFollowing: true, message: 'User followed successfully.' });
    } catch (err) {
        console.error("❌ Error following user:", err);
        res.status(500).json({ success: false, message: 'Server error during follow operation.' });
    }
};

// POST /unfollow/:id
exports.unfollowUser = async (req, res) => {
    // isAuthenticatedApi middleware should handle the initial session check
    const followerID = req.session.user.id;
    const followingID = req.params.id;

    try {
        await db.query(
            `DELETE FROM followers WHERE followerID = ? AND followingID = ?`,
            [followerID, followingID]
        );
        res.json({ success: true, isFollowing: false, message: 'User unfollowed successfully.' });
    } catch (err) {
        console.error("❌ Error unfollowing user:", err);
        res.status(500).json({ success: false, message: 'Server error during unfollow operation.' });
    }
};

// GET /search-users
exports.searchUsers = async (req, res) => {
    // isAuthenticatedApi middleware should handle the initial session check
    const search = req.query.q || '';
    const loggedInUserID = req.session.user.id;

    try {
        const users = await userService.searchUsers(search, loggedInUserID);
        res.json({ success: true, users: users });
    } catch (err) {
        console.error("❌ SQL or DB Error during user search:", err.message);
        res.status(500).json({ success: false, message: "Server error during search." });
    }
};

// GET /profile/dashboard
exports.getUserDashboard = async (req, res) => {
    // isAuthenticated middleware should handle the initial session check
    const userID = req.session.user.id;

    try {
        const currentUser = await userService.findUserById(userID); // Get basic user info for dashboard header

        const following = await userService.getUsersBeingFollowed(userID);
        const followers = await userService.getFollowers(userID);

        // Fetch posts and upvotes for the current user's own posts
        const [posts] = await db.query(`
            SELECT title, (SELECT COUNT(*) FROM post_upvotes WHERE postID = p.postID) AS upvotes
            FROM posts p
            WHERE p.userID = ?
        `, [userID]);

        res.render('userDashboard', {
            currentUser,
            followers,
            following,
            posts
        });
    } catch (err) {
        console.error("❌ Dashboard error:", err);
        res.status(500).send("Server error while loading dashboard.");
    }
};

// POST /remove-follower/:id
exports.removeFollower = async (req, res) => {
    // isAuthenticatedApi middleware should handle the initial session check
    const followingID = req.session.user.id; // The user who is removing a follower (current user)
    const followerID = req.params.id; // The follower to be removed

    try {
        await db.query(
            `DELETE FROM followers WHERE followerID = ? AND followingID = ?`,
            [followerID, followingID]
        );
        res.json({ success: true, message: 'Follower removed successfully.' });
    } catch (err) {
        console.error("❌ Error removing follower:", err);
        res.status(500).json({ success: false, message: 'Server error removing follower.' });
    }
};

// Add to controllers/userController.js
// GET /user/:id/mail
exports.getMailPage = async (req, res) => {
    // isAuthenticated middleware handles session check
    const toUserID = req.params.id;
    const { message, messageType } = req.query; // For messages coming from redirect

    try {
        const toUser = await userService.findUserById(toUserID); // Fetch recipient details
        if (!toUser) {
            return res.status(404).send("Recipient not found.");
        }

        const currentUser = req.session.user;

        res.render('mail', {
            toMail: toUser.mailID,
            fromMail: currentUser.email,
            toUserID,
            otherUsername: toUser.username,
            user: { username: currentUser.username }, // Current user's info for template
            message,
            messageType,
            subject: '', // Initialize for form
            body: ''     // Initialize for form
        });
    } catch (err) {
        console.error("❌ Error loading mail form:", err);
        res.status(500).send("Server error loading mail form.");
    }
};

// POST /user/:id/mail
exports.sendMailToUser = async (req, res) => {
    // isAuthenticated & validateMailInput middleware handle checks
    const { from, to, subject, body } = req.body;
    const username = req.session.user?.username; // Current user's username
    const toUserID = req.params.id; // Recipient's ID

    const formattedSubject = `${subject} `;
    const formattedBody = `
    || Mail from ${username} (${from}) ||

  ${body}

---

This email was sent via WanderScript but not by WanderScript.
Do not reply to this email unless requested.
    `.trim();

    try {
        await require('../services/emailService').sendContactMail(from, to, formattedSubject, formattedBody);

        res.redirect(`/WanderScript/user/${toUserID}/mail?message=${encodeURIComponent('Mail sent successfully!')}&messageType=success`);
    } catch (error) {
        console.error("❌ Failed to send mail:", error);
        // Refetch recipient's username if error occurs to re-render form correctly
        const toUser = await userService.findUserById(toUserID); // Using userService
        const otherUsername = toUser?.username || 'Recipient';

        res.render('mail', {
            toMail: to,
            fromMail: from,
            toUserID,
            otherUsername: otherUsername,
            user: { username },
            subject, // Keep subject and body in form
            body,
            message: "Failed to send mail. Please try again.",
            messageType: "error"
        });
    }
};