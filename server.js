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
app.use('/WanderScript/assets', express.static('public/assets'));

// GET Sign Up
app.get('/WanderScript/signup', (req, res) => {
    res.render('signup.ejs', {
        message: req.query.message || null,
        messageType: req.query.info
    });
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

                return res.render('homeFeed.ejs', {
                    message: 'Let the blogging begin!',
                    messagetype: 'success'
                });

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
                    id: user.userID,
                    username: user.username,
                    email: user.mailID
                };
                return res.redirect('/WanderScript/profile');
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
            messageType: 'error'
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const updateQuery = `UPDATE users SET password = ? WHERE mailID = ?`;

        db.query(updateQuery, [hashedPassword, email], (err, result) => {
            if (err) {
                console.error("DB error:", err);
                return res.render('forgotPassword.ejs', {
                    message: "Database error.",
                    messageType: 'error'
                });
            }

            if (result.affectedRows === 0) {
                return res.render('forgotPassword.ejs', {
                    message: "No user found with that email.",
                    messageType: 'error'
                });
            }

            res.render('forgotPassword.ejs', {
                message: "Password successfully reset!",
                messageType: 'success'
            });
        });

    } catch (error) {
        console.error("Error:", error);
        res.render('forgotPassword.ejs', {
            message: "Something went wrong. Try again.",
            messageType: 'warning'
        });
    }
});

//user profile rendering
app.get('/WanderScript/profile', async (req, res) => {
    try {
        const sessionUser = req.session.user;
        if (!sessionUser || !sessionUser.email) {
            return res.redirect('/WanderScript/signin?message=Please sign in to view your profile&info=warning');
        }

        let getInfo = `SELECT userID, username, bio, youtube_link, linkedin_link, instagram_link FROM users WHERE mailID = ?`;
        let email = sessionUser.email;
        const [userRows] = await db.promise().query(getInfo, [email]);

        if (userRows.length === 0) {
            return res.redirect('/WanderScript/signin?message=User not found&info=error')
        }

        const user = userRows[0];
        const userID = user.userID;

        //followers count
        const [[{ followerCount }]] = await db.promise().query(
            `SELECT COUNT(*) AS followerCount FROM followers WHERE followingID = ?`,
            [userID]
        );

        //total upvotes count
        const [[{ totalUpvotes }]] = await db.promise().query(
            `SELECT COUNT(*) AS totalUpvotes FROM post_upvotes 
             WHERE postID IN (SELECT postID FROM posts WHERE userID = ?)`,
            [userID]
        );

        //total posts
        const [posts] = await db.promise().query(
            `SELECT p.postID AS _id, p.title, p.description AS info,
                    (SELECT COUNT(*) FROM post_upvotes pu WHERE pu.postID = p.postID) AS upvotes
             FROM posts p WHERE p.userID = ?
             ORDER BY p.created_at DESC`,
            [userID]
        );

        //passing data
        const profileData = {
            username: user.username,
            bio: user.bio || 'No bio yet.',
            followers: Array(followerCount).fill('•'),
            totalUpvotes,
            posts
        };

        res.render('currentUser', { user: profileData });

        console.error("Error loading profile:", err);
        res.status(500).send("An unexpected error occurred.");
    }
    catch (err) {
    }
});

// GET New Post Page
app.get('/WanderScript/posts/new', (req, res) => {
    if (!req.session.user || !req.session.user.email) {
        return res.redirect('/WanderScript/signin?message=Please login to post&info=warning');
    }
    res.render('newPost', { user: req.session.user });
});

// POST New Post Submission
app.post('/WanderScript/posts/new', async (req, res) => {
    const { title, description } = req.body;
    const sessionUser = req.session.user;

    if (!title || !description) {
        return res.render('newPost', {
            message: "Title and description are required.",
            messageType: "error"
        });
    }

    try {
        const [[user]] = await db.promise().query(
            `SELECT userID FROM users WHERE mailID = ?`, [sessionUser.email]
        );

        if (!user) {
            return res.redirect('/WanderScript/signin?message=User not found&info=error');
        }

        await db.promise().query(
            `INSERT INTO posts (postID, userID, title, description, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [uuidv4(), user.userID, title, description]
        );

        res.redirect('/WanderScript/profile');
    } catch (err) {
        console.error("Error creating post:", err);
        res.status(500).send("Failed to create post. Try again.");
    }
});

// GET Edit
app.get('/WanderScript/posts/edit/:id', async (req, res) => {
    const postID = req.params.id;

    try {
        const [[post]] = await db.promise().query(
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
        console.error("Error loading post for editing:", err);
        res.status(500).send("Internal server error.");
    }
});

// PUT Edit
app.put('/WanderScript/posts/edit/:id', async (req, res) => {
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
        await db.promise().query(
            `UPDATE posts SET title = ?, description = ? WHERE postID = ?`,
            [title, description, postID]
        );
        res.render('editPost', {
            post: { _id: postID, title, info: description },
            user: req.session.user,
            message: "Post updated successfully."
        });
    } catch (err) {
        console.error("Error updating post:", err);
        res.status(500).send("Error saving changes.");
    }
});

//Get edit profile
app.get('/WanderScript/profile/edit', async (req, res) => {
    if (!req.session.user || !req.session.user.email) {
        return res.redirect('/WanderScript/signin?message=Please login to edit profile&info=warning');
    }

    try {
        const [[user]] = await db.promise().query(
            `SELECT username, bio, linkedin_link, instagram_link, youtube_link FROM users WHERE mailID = ?`,
            [req.session.user.email]
        );

        if (!user) {
            return res.redirect('/WanderScript/signin?message=User not found&info=error');
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
        console.error("Error loading profile edit page:", err);
        res.status(500).send("Error loading edit profile page.");
    }
});

//Put edit profile
app.put('/WanderScript/profile/edit', async (req, res) => {
    const { username, bio, linkedin, instagram, youtube } = req.body;

    if (!req.session.user || !req.session.user.email) {
        return res.redirect('/WanderScript/signin?message=Please login to edit profile&info=warning');
    }

    try {
        const updateQuery = `
            UPDATE users 
            SET username = ?, bio = ?, linkedin_link = ?, instagram_link = ?, youtube_link = ?
            WHERE mailID = ?
        `;

        await db.promise().query(updateQuery, [
            username, bio, linkedin, instagram, youtube, req.session.user.email
        ]);

        req.session.user.username = username;

        res.redirect('/WanderScript/profile');

    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).send("Error updating profile.");
    }
});

//delete post
app.post('/WanderScript/posts/delete/:id', async (req, res) => {
    const postID = req.params.id;

    if (!req.session.user || !req.session.user.email) {
        return res.redirect('/WanderScript/signin?message=Please login to delete posts&info=warning');
    }

    try {
        const [[user]] = await db.promise().query(
            `SELECT userID FROM users WHERE mailID = ?`,
            [req.session.user.email]
        );

        if (!user) {
            return res.redirect('/WanderScript/signin?message=User not found&info=error');
        }

        const [postRows] = await db.promise().query(
            `SELECT * FROM posts WHERE postID = ? AND userID = ?`,
            [postID, user.userID]
        );

        if (postRows.length === 0) {
            return res.status(403).send("Unauthorized or post not found.");
        }

        await db.promise().query(`DELETE FROM posts WHERE postID = ?`, [postID]);

        await db.promise().query(`DELETE FROM post_upvotes WHERE postID = ?`, [postID]);

        res.redirect('/WanderScript/profile');
    } catch (err) {
        console.error("Error deleting post:", err);
        res.status(500).send("Error deleting post.");
    }
});

//home feed get
app.get('/WanderScript/homefeed', async (req, res) => {
    const currentUser = req.session.user;
    if (!currentUser) {
        return res.redirect('/WanderScript/signin?message=Login to view feed&info=warning');
    }

    const userID = currentUser.userID || currentUser.id;

    try {
        const [allPosts] = await db.promise().query(`
            SELECT 
                p.postID, p.title, p.description,
                p.userID, u.username,
                (SELECT COUNT(*) FROM post_upvotes WHERE postID = p.postID) AS upvotes,
                EXISTS (
                    SELECT 1 FROM post_upvotes 
                    WHERE postID = p.postID AND userID = ?
                ) AS isUpvoted
            FROM posts p
            JOIN users u ON p.userID = u.userID
            WHERE p.userID != ?  
            ORDER BY p.created_at DESC`,
            [userID, userID]);

        const [followingRows] = await db.promise().query(
            `SELECT followingID FROM followers WHERE followerID = ?`,
            [userID]
        );

        const followingIDs = new Set(followingRows.map(row => row.followingID));

        const postsWithFollowFlag = allPosts.map(post => ({
            ...post,
            isFollowing: followingIDs.has(post.userID)
        }));

        res.render('homeFeed', {
            allPosts: postsWithFollowFlag,
            currentUser
        });
    } catch (err) {
        console.error("Error loading home feed:", err);
        res.status(500).send("Server error loading feed.");
    }
});

//follow post
app.post('/WanderScript/follow/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Login required' });
    }

    const followerID = req.session.user.id;
    const followingID = req.params.id;

    if (followerID === followingID) {
        return res.json({ success: false, message: 'Cannot follow yourself' });
    }

    await db.promise().query(
        `INSERT IGNORE INTO followers (followerID, followingID) VALUES (?, ?)`,
        [followerID, followingID]
    );

    res.json({ success: true, isFollowing: true });
});

//unfollow post
app.post('/WanderScript/unfollow/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Login required' });
    }

    const followerID = req.session.user.id;
    const followingID = req.params.id;

    await db.promise().query(
        `DELETE FROM followers WHERE followerID = ? AND followingID = ?`,
        [followerID, followingID]
    );

    res.json({ success: true, isFollowing: false });
});

//upvote post
app.post('/WanderScript/posts/upvote/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Login required' });
    }

    const userID = req.session.user.id;
    const postID = req.params.id;

    try {
        const [[existing]] = await db.promise().query(
            `SELECT * FROM post_upvotes WHERE postID = ? AND userID = ?`,
            [postID, userID]
        );

        let isUpvoted;
        if (existing) {
            await db.promise().query(
                `DELETE FROM post_upvotes WHERE postID = ? AND userID = ?`,
                [postID, userID]
            );
            isUpvoted = false;
        } else {
            await db.promise().query(
                `INSERT INTO post_upvotes (postID, userID) VALUES (?, ?)`,
                [postID, userID]
            );
            isUpvoted = true;
        }

        const [[{ count }]] = await db.promise().query(
            `SELECT COUNT(*) as count FROM post_upvotes WHERE postID = ?`,
            [postID]
        );

        res.json({ success: true, isUpvoted, newUpvoteCount: count });
    } catch (err) {
        console.error("Upvote error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

//other user get
app.get('/WanderScript/user/:id', async (req, res) => {
    const userID = req.params.id;
    const currentUser = req.session.user;

    const [[user]] = await db.promise().query(`SELECT username, bio, youtube_link, linkedin_link, instagram_link FROM users WHERE userID = ?`, [userID]);
    const [[{ followerCount }]] = await db.promise().query(`SELECT COUNT(*) AS followerCount FROM followers WHERE followingID = ?`, [userID]);
    const [[{ totalUpvotes }]] = await db.promise().query(`SELECT COUNT(*) AS totalUpvotes FROM post_upvotes WHERE postID IN (SELECT postID FROM posts WHERE userID = ?)`, [userID]);
    const [posts] = await db.promise().query(
        `SELECT 
           p.postID AS _id,
           p.title,
           p.description AS info,
           (SELECT COUNT(*) FROM post_upvotes WHERE postID = p.postID) AS upvotes,
           EXISTS(
             SELECT 1 FROM post_upvotes 
             WHERE postID = p.postID AND userID = ?
           ) AS isUpvoted
         FROM posts p
         WHERE p.userID = ?
         ORDER BY p.created_at DESC`,
        [currentUser.id, userID]
    );
    const [[isFollowing]] = await db.promise().query(
        `SELECT 1 FROM followers WHERE followerID = ? AND followingID = ?`, [currentUser.id, userID]
    );

    const profileData = {
        _id: userID,
        username: user.username,
        bio: user.bio || 'No bio yet.',
        followers: Array(followerCount).fill('•'),
        totalUpvotes,
        posts,
        isFollowing: Boolean(isFollowing),
        youtube: user.youtube_link,
        linkedin: user.linkedin_link,
        instagram: user.instagram_link
    };

    res.render('otherUser', {
        user: profileData,
        currentUser: currentUser
    });
});

//search box
app.get('/WanderScript/search-users', (req, res) => {
    const search = req.query.q || '';
    const loggedInUserID = req.session.user?.id;

    if (!loggedInUserID) {
        return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const sql = `
        SELECT u.userID, u.username, 
               (SELECT COUNT(*) FROM followers WHERE followingID = u.userID) AS followersCount
        FROM users u
        WHERE u.username LIKE ? AND u.userID != ?
        LIMIT 10
    `;

    db.query(sql, [`%${search}%`, loggedInUserID], (err, results) => {
        if (err) {
            console.error("❌ SQL or DB Error:", err.message);
            return res.status(500).json({ success: false, message: "Server error" });
        }

        res.json({ success: true, users: results });
    });
});

//mail get 
app.get('/WanderScript/user/:id/mail', async (req, res) => {
    const toUserID = req.params.id;

    if (!req.session.user || !req.session.user.email) {
        return res.redirect('/WanderScript/signin?message=Please login first&info=warning');
    }

    const { message, messageType } = req.query; 

    try {
        const [[toUser]] = await db.promise().query(
            `SELECT mailID, username FROM users WHERE userID = ?`,
            [toUserID]
        );

        if (!toUser || !toUser.mailID) {
            return res.status(404).send("Recipient not found");
        }

        const currentUser = req.session.user;

        res.render('mail', {
            toMail: toUser.mailID,
            fromMail: currentUser.email,
            toUserID,
            otherUsername: toUser.username,
            user: {
                username: currentUser.username
            },
            message,      
            messageType     
        });

    } catch (err) {
        console.error("❌ Error loading mail form:", err);
        res.status(500).send("Server error");
    }
});

// POST Mail Handler
app.post('/WanderScript/user/:id/mail', async (req, res) => {
    const { from, to, subject, body } = req.body;
    const username = req.session.user?.username;
    const toUserID = req.params.id;

    if (!from || !to || !subject || !body || !username) {
        return res.render('mail', {
            toMail: to,
            fromMail: from,
            toUserID,
            otherUsername: 'Recipient',
            user: { username },
            subject,
            body,
            message: "All fields are required.",
            messageType: "error"
        });
    }

    const formattedSubject = `${subject} `;
    const formattedBody = `
    || Mail from ${username} (${from}) ||

  ${body}

---

This email was sent via WanderScript but not by WanderScript.
Do not reply to this email unless requested.
    `.trim();

    try {
        await transporter.sendMail({
            from,
            to,
            subject: formattedSubject,
            text: formattedBody
        });

        // Redirect only after success
        res.redirect(`/WanderScript/user/${toUserID}/mail?message=Mail sent successfully!&messageType=success`);

    } catch (error) {
        console.error("❌ Failed to send mail:", error);

        // Refetch the recipient's username in case of error to re-render the form
        const [[toUser]] = await db.promise().query(
            `SELECT username FROM users WHERE userID = ?`,
            [toUserID]
        );

        res.render('mail', {
            toMail: to,
            fromMail: from,
            toUserID,
            otherUsername: toUser?.username || 'Recipient',
            user: { username },
            subject,
            body,
            message: "Failed to send mail. Please try again.",
            messageType: "error"
        });
    }
});

// get user function 
async function getUserById(userID) {
    const [rows] = await db.promise().query(
        `SELECT userID, username FROM users WHERE userID = ?`,
        [userID]
    );
    return rows[0];
}

//dashboard get
app.get('/WanderScript/profile/dashboard', async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.redirect('/WanderScript/signin?message=Login to view dashboard&info=warning');
    }

    const userID = req.session.user.id;

    try {
        const currentUser = await getUserById(userID);

        const [following] = await db.promise().query(`
            SELECT u.userID, u.username FROM followers f
            JOIN users u ON f.followingID = u.userID
            WHERE f.followerID = ?
        `, [userID]);

        const [followers] = await db.promise().query(`
            SELECT u.userID, u.username FROM followers f
            JOIN users u ON f.followerID = u.userID
            WHERE f.followingID = ?
        `, [userID]);

        const [posts] = await db.promise().query(`
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
        console.error("Dashboard error:", err);
        res.status(500).send("Server error while loading dashboard.");
    }
});

//remove follower post
app.post('/WanderScript/remove-follower/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Login required' });
    }

    const followingID = req.session.user.id;
    const followerID = req.params.id;

    await db.promise().query(
        `DELETE FROM followers WHERE followerID = ? AND followingID = ?`,
        [followerID, followingID]
    );

    res.json({ success: true });
});

//post logout
app.post('/WanderScript/logout', (req, res) => {
    req.session.destroy(() => {
        res.status(200).json({ success: true });
    });
});

//delete account
app.delete('/WanderScript/delete-account', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });
    const userID = req.session.user.id;
    await db.promise().query(`DELETE FROM users WHERE userID = ?`, [userID]);
    req.session.destroy(() => res.json({ success: true }));
});

app.listen(port);

// db.query('select *from users;', (req, res) => {
//     console.log(res);
// })

// db.query('delete from users;', (req, res) => {
//     console.log(res);
// })