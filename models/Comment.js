const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    postID: { type: String, required: true },
    userID: { type: String, required: true },
    username: { type: String, required: true },
    commentText: { type: String, required: true },
    parentID: { type: String, default: null }, // for replies
    likes: { type: [String], default: [] }, // array of userIDs who liked
    createdAt: { type: Date, default: Date.now }
  });

module.exports = mongoose.model('Comment', commentSchema);