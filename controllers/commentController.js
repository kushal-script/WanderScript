// controllers/commentController.js
const Comment = require('../models/Comment'); // Mongoose Comment model
const { userOwnsPost } = require('../middleware/authMiddleware'); // Reusing helper from authMiddleware

// Internal helper to nest comments 
function nestComments(comments) {
    const map = {};
    const roots = [];

    comments.forEach(c => {
        const comment = c.toObject();
        comment.replies = [];
        map[comment._id] = comment;
    });

    comments.forEach(c => {
        const comment = map[c._id];
        if (comment.parentID) {
            if (map[comment.parentID]) {
                map[comment.parentID].replies.push(comment);
            }
        } else {
            roots.push(comment);
        }
    });

    return roots;
}

// Internal helper to recursively delete comments
async function deleteCommentWithReplies(commentID) {
    const replies = await Comment.find({ parentID: commentID });
    for (const reply of replies) {
        await deleteCommentWithReplies(reply._id);
    }
    await Comment.findByIdAndDelete(commentID);
}

// POST /comments/:postID (Add Comment or Reply)
exports.addComment = async (req, res) => {
    // isAuthenticatedApi middleware should handle the initial session check
    const { content, parentID } = req.body;
    const { postID } = req.params;

    try {
        const newComment = new Comment({
            postID,
            userID: req.session.user.id,
            username: req.session.user.username,
            commentText: content,
            parentID: parentID || null
        });

        await newComment.save();
        res.status(200).json({ success: true, message: 'Comment added successfully.' });
    } catch (err) {
        console.error("❌ Error saving comment:", err);
        res.status(500).json({ success: false, message: "Server error adding comment." });
    }
};

// GET /comments/:postID (Fetch Comments)
exports.getCommentsForPost = async (req, res) => {
    try {
        const flatComments = await Comment.find({ postID: req.params.postID }).sort({ createdAt: 1 });
        const nestedComments = nestComments(flatComments);
        res.json({ success: true, comments: nestedComments });
    } catch (err) {
        console.error("❌ Error fetching comments:", err);
        res.status(500).json({ success: false, message: "Failed to fetch comments." });
    }
};

// DELETE /comments/delete/:id 
exports.deleteComment = async (req, res) => {
    // isAuthenticatedApi middleware should handle the initial session check
    try {
        const commentID = req.params.id;
        const comment = await Comment.findById(commentID);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });

        const userID = req.session.user.id;
        const postID = comment.postID;

        // Check if current user is comment owner OR post owner
        const isCommentOwner = String(comment.userID) === String(userID);
        const isPostOwner = await userOwnsPost(postID, userID); // Reusing helper

        if (!isCommentOwner && !isPostOwner) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You can only delete your own comments or comments on your posts.' });
        }

        await deleteCommentWithReplies(commentID); // Recursive deletion

        res.json({ success: true, message: 'Comment and its replies deleted successfully.' });
    } catch (err) {
        console.error('❌ Error deleting comment:', err);
        res.status(500).json({ success: false, message: 'Server error deleting comment.' });
    }
};