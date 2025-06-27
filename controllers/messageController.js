// controllers/messageController.js
const Message = require('../models/Message'); // Mongoose Message model (for threads)
const Chats = require('../models/Chats');     // Mongoose Chats model (for individual messages)
const userService = require('../services/userService'); // For fetching usernames

// GET /messages (Show all chats)
exports.getAllChats = async (req, res) => {
    // isAuthenticated middleware should handle initial session check
    const currentUserID = req.session.user.id;

    try {
        const threads = await Message.find({ participants: currentUserID }).sort({ lastMessageTime: -1 });

        let chats = [];
        let totalUnreadCount = 0;

        for (let thread of threads) {
            const otherUserID = thread.participants.find(id => id !== currentUserID);
            const otherUser = await userService.findUserById(otherUserID); // Using userService

            if (otherUser) {
                const unreadCount = await Chats.countDocuments({
                    threadID: thread._id,
                    receiverID: currentUserID,
                    senderID: otherUserID,
                    isRead: false
                });

                totalUnreadCount += unreadCount;

                chats.push({
                    userID: otherUserID,
                    username: otherUser.username,
                    threadID: thread._id,
                    unreadCount: unreadCount
                });
            }
        }

        res.render('messageList', {
            user: req.session.user,
            chats,
            totalUnreadCount
        });
    } catch (err) {
        console.error("❌ Error fetching all chats:", err);
        res.status(500).send("Server error loading messages.");
    }
};

// GET /messages/:userID (Chat with specific user)
exports.getIndividualChat = async (req, res) => {
    // isAuthenticated middleware should handle initial session check
    const currentUserID = req.session.user.id;
    const otherUserID = req.params.userID;

    try {
        const otherUser = await userService.findUserById(otherUserID);
        if (!otherUser) {
            return res.status(404).send("User not found.");
        }

        let thread = await Message.findOne({
            participants: { $all: [currentUserID, otherUserID] }
        });

        let messages = [];
        let threadID = null;

        if (thread) {
            threadID = thread._id;

            messages = await Chats.find({ threadID })
                .populate('replyTo') // Populate replied message if it exists
                .sort({ createdAt: 1 });

            // Mark messages from otherUserID to currentUserID as read
            await Chats.updateMany(
                {
                    threadID: thread._id,
                    receiverID: currentUserID,
                    senderID: otherUserID,
                    isRead: false
                },
                { $set: { isRead: true } }
            );

            // Update unreadBy array in the thread
            const currentUserIDStr = currentUserID.toString();
            thread.unreadBy = thread.unreadBy.map(id => id.toString());

            if (thread.unreadBy.includes(currentUserIDStr)) {
                thread.unreadBy = thread.unreadBy.filter(id => id !== currentUserIDStr);
                await thread.save();
            }
        }

        res.render('messageIndividual', {
            user: req.session.user,
            otherUser: { userID: otherUserID, username: otherUser.username },
            currentUserID,
            otherUserID,
            threadID: threadID,
            messages,
            thread 
        });
    } catch (err) {
        console.error("❌ Error loading individual chat:", err);
        res.status(500).send("Server error loading chat.");
    }
};

// POST /messages/:userID/send (Send Message)
exports.sendMessage = async (req, res) => {
    // isAuthenticatedApi middleware should handle initial session check
    const senderID = req.session.user.id;
    const receiverID = req.params.userID;
    const content = req.body.content?.trim();
    const replyTo = req.body.replyTo || null; // For replies

    if (!content) return res.status(400).send('Message content is required.');

    try {
        let thread = await Message.findOne({ participants: { $all: [senderID, receiverID] } });

        if (!thread) {
            // Create new thread if it doesn't exist
            thread = await Message.create({
                participants: [senderID, receiverID],
                lastMessage: content,
                lastMessageTime: new Date(),
                unreadBy: [receiverID] // Receiver has unread messages
            });
        } else {
            // Update existing thread
            thread.lastMessage = content;
            thread.lastMessageTime = new Date();
            // Add receiver to unreadBy if not already there
            if (!thread.unreadBy.map(id => id.toString()).includes(receiverID.toString())) {
                thread.unreadBy.push(receiverID);
            }
            await thread.save();
        }

        const newMessage = new Chats({
            threadID: thread._id,
            senderID,
            receiverID,
            content,
            replyTo: replyTo, // Mongoose will handle null/ObjectId
            isRead: false // New message is unread by default for the receiver
        });

        await newMessage.save();

        res.redirect(`/WanderScript/messages/${receiverID}`);
    } catch (err) {
        console.error("❌ Error sending message:", err);
        res.status(500).send("Failed to send message.");
    }
};

// PATCH /messages/:msgID (Edit Message)
exports.editMessage = async (req, res) => {
    // isAuthenticatedApi middleware should handle initial session check
    const currentUserID = req.session.user.id;
    const { msgID } = req.params;
    const { content } = req.body;

    try {
        const message = await Chats.findById(msgID);
        if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

        if (String(message.senderID) !== String(currentUserID)) {
            return res.status(403).json({ success: false, message: 'You can only edit your own messages.' });
        }

        const hoursElapsed = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursElapsed > 1) { // 1 hour limit
            return res.status(403).json({ success: false, message: 'Edit time expired (messages can only be edited within 1 hour).' });
        }

        message.content = content;
        message.edited = true;
        message.isRead = false; // Mark as unread for the receiver on edit

        await message.save();

        // Update the thread's unread status for the receiver if this was the last message
        const thread = await Message.findById(message.threadID);
        if (thread) {
            const receiverID = message.receiverID;
            if (!thread.unreadBy.map(id => id.toString()).includes(receiverID.toString())) {
                thread.unreadBy.push(receiverID);
                await thread.save();
            }
        }

        return res.json({ success: true, updated: message, message: 'Message updated successfully.' });
    } catch (err) {
        console.error("❌ Error editing message:", err);
        res.status(500).json({ success: false, message: 'Server error editing message.' });
    }
};

// DELETE /messages/:msgID (Delete Message)
exports.deleteMessage = async (req, res) => {
    // isAuthenticatedApi middleware should handle initial session check
    const currentUserID = req.session.user.id;
    const { msgID } = req.params;

    try {
        const message = await Chats.findById(msgID);
        if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

        if (String(message.senderID) !== String(currentUserID)) {
            return res.status(403).json({ success: false, message: 'You can only delete your own messages.' });
        }

        const hoursElapsed = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursElapsed > 1) { // 1 hour limit
            return res.status(403).json({ success: false, message: 'Delete time expired (messages can only be deleted within 1 hour).' });
        }

        await Chats.findByIdAndDelete(msgID);

        return res.json({ success: true, deletedID: msgID, message: 'Message deleted successfully.' });
    } catch (err) {
        console.error("❌ Error deleting message:", err);
        res.status(500).json({ success: false, message: 'Server error deleting message.' });
    }
};

// POST /messages/mark-read/:userID
exports.markMessagesAsRead = async (req, res) => {
    // isAuthenticatedApi middleware should handle initial session check
    const currentUserID = req.session.user.id;
    const otherID = req.params.userID;

    try {
        const thread = await Message.findOne({ participants: { $all: [currentUserID, otherID] } });

        if (thread) {
            // Remove currentUserID from unreadBy list in the thread
            thread.unreadBy = thread.unreadBy.filter(id => id.toString() !== currentUserID.toString());
            await thread.save();

            // Mark all messages from otherID to currentUserID in this thread as read
            await Chats.updateMany(
                { threadID: thread._id, receiverID: currentUserID, senderID: otherID, isRead: false },
                { $set: { isRead: true } }
            );
        }
        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Error marking messages as read:", error);
        res.status(500).json({ success: false, message: "Server error marking messages as read." });
    }
};

// POST /messages/mark-unread/:userID
exports.markMessagesAsUnread = async (req, res) => {
    // isAuthenticatedApi middleware should handle initial session check
    const currentUserID = req.session.user.id;
    const otherID = req.params.userID;

    try {
        const thread = await Message.findOne({ participants: { $all: [currentUserID, otherID] } });

        if (thread) {
            // Add currentUserID to unreadBy list in the thread if not already there
            if (!thread.unreadBy.map(id => id.toString()).includes(currentUserID.toString())) {
                thread.unreadBy.push(currentUserID);
            }
            await thread.save();

            // Mark all messages from otherID to currentUserID in this thread as unread
            // This operation might be less common, consider if you truly need to reverse 'read' status
            await Chats.updateMany(
                { threadID: thread._id, receiverID: currentUserID, senderID: otherID, isRead: true },
                { $set: { isRead: false } }
            );
        }
        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Error marking messages as unread:", error);
        res.status(500).json({ success: false, message: "Server error marking messages as unread." });
    }
};

// DELETE /messages/delete/:userID (Delete entire chat thread)
exports.deleteChatThread = async (req, res) => {
    // isAuthenticatedApi middleware should handle initial session check
    const currentUserID = req.session.user.id;
    const otherID = req.params.userID;

    try {
        const thread = await Message.findOne({
            participants: { $all: [currentUserID, otherID], $size: 2 } // Ensure it's a 2-person chat
        });

        if (thread) {
            await Chats.deleteMany({ threadID: thread._id }); // Delete all individual messages
            await Message.deleteOne({ _id: thread._id });      // Then delete the thread itself
        } else {
            return res.status(404).json({ success: false, message: 'Chat thread not found.' });
        }

        return res.sendStatus(200); // 200 OK
    } catch (err) {
        console.error("❌ Error deleting chat:", err);
        return res.status(500).json({ success: false, error: 'Failed to delete chat.' });
    }
};