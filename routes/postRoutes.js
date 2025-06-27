// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { isAuthenticated, isAuthenticatedApi, isPostOwner } = require('../middleware/authMiddleware');
const { validatePostInput } = require('../middleware/validationMiddleware');

// New Post
router.get('/new', isAuthenticated, postController.getNewPostPage);
router.post('/new', isAuthenticated, validatePostInput, postController.createPost);

// Edit Post
router.get('/edit/:id', isAuthenticated, isPostOwner, postController.getEditPostPage); 

router.put('/edit/:id', isAuthenticated, isPostOwner, validatePostInput, postController.updatePost);

// Delete Post
router.delete('/delete/:id', isAuthenticatedApi, isPostOwner, postController.deletePost);

// Upvote/Unupvote Post
router.post('/upvote/:id', isAuthenticatedApi, postController.upvotePost);

module.exports = router;