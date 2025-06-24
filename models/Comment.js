const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  postID: {
    type: String,  // UUID or MySQL postID string
    required: true
  },
  userID: {
    type: String, // UUID or MySQL userID string
    required: true
  },
  username: {
    type: String,
    required: true
  },
  commentText: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Comment', commentSchema);