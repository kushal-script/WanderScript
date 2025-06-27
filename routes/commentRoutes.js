// routes/commentRoutes.js
const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { isAuthenticatedApi } = require('../middleware/authMiddleware');

// Add Comment or Reply
router.post('/:postID', isAuthenticatedApi, commentController.addComment);

// Fetch Comments for a Post
router.get('/:postID', commentController.getCommentsForPost); // Publicly accessible or add isAuthenticated if comments require login

// Delete Comment
router.delete('/delete/:id', isAuthenticatedApi, commentController.deleteComment);
// Your original code had a POST for delete comment, if client-side is sending POST for delete, change to router.post
// router.post('/delete/:id', isAuthenticatedApi, commentController.deleteComment);

module.exports = router;