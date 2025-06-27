// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { isAuthenticated, isAuthenticatedApi } = require('../middleware/authMiddleware');

// Get all chat threads for the current user
router.get('/', isAuthenticated, messageController.getAllChats);

// Get individual chat messages with a specific user
router.get('/:userID', isAuthenticated, messageController.getIndividualChat);

// Send a new message
router.post('/:userID/send', isAuthenticatedApi, messageController.sendMessage);

// Edit a message
router.patch('/:msgID', isAuthenticatedApi, messageController.editMessage);

// Delete a message
router.delete('/:msgID', isAuthenticatedApi, messageController.deleteMessage);

// Mark messages as read/unread in a specific thread
router.post('/mark-read/:userID', isAuthenticatedApi, messageController.markMessagesAsRead);
router.post('/mark-unread/:userID', isAuthenticatedApi, messageController.markMessagesAsUnread);

// Delete an entire chat thread
router.delete('/delete/:userID', isAuthenticatedApi, messageController.deleteChatThread);

module.exports = router;