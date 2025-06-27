// routes/commentRoutes.js
const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { isAuthenticatedApi } = require('../middleware/authMiddleware');

// Add Comment or Reply
router.post('/:postID', isAuthenticatedApi, commentController.addComment);

// Fetch Comments for a Post
router.get('/:postID', commentController.getCommentsForPost); 

// Delete Comment
router.delete('/delete/:id', isAuthenticatedApi, commentController.deleteComment);


module.exports = router;