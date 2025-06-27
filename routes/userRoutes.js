// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const postController = require('../controllers/postController');
const { isAuthenticated, isAuthenticatedApi } = require('../middleware/authMiddleware');
const { validateMailInput } = require('../middleware/validationMiddleware'); 

// User Profile & Dashboard
router.get('/profile', isAuthenticated, userController.getUserProfile);
router.get('/profile/edit', isAuthenticated, userController.getEditProfilePage);
router.put('/profile/edit', isAuthenticated, userController.updateProfile);
router.get('/profile/dashboard', isAuthenticated, userController.getUserDashboard);

// Other User Profiles
router.get('/user/:id', isAuthenticated, userController.getOtherUserProfile); // :id is targetUserID

// Follow/Unfollow
router.post('/follow/:id', isAuthenticatedApi, userController.followUser);
router.post('/unfollow/:id', isAuthenticatedApi, userController.unfollowUser);
router.post('/remove-follower/:id', isAuthenticatedApi, userController.removeFollower);

// Search Users
router.get('/search-users', isAuthenticatedApi, userController.searchUsers);

// Mail to other user
router.get('/user/:id/mail', isAuthenticated, userController.getMailPage);
router.post('/user/:id/mail', isAuthenticated, validateMailInput, userController.sendMailToUser);

// Home Feed
router.get('/homefeed', isAuthenticated, postController.getHomeFeed);

module.exports = router;