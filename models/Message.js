const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  participants: {
    type: [String], // [senderID, receiverID] using MySQL user IDs
    required: true,
  },
  lastMessage: {
    type: String,
    default: '',
  },
  lastMessageTime: {
    type: Date,
    default: Date.now,
  },
  unreadBy: {
    type: [String], // userIDs who haven't read the last message
    default: [],
  }
});

module.exports = mongoose.model('MessageThread', messageSchema);