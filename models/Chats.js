const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatMessageSchema = new Schema({
  threadID: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageThread' },
  senderID: String,
  receiverID: String,
  content: String,
  createdAt: { type: Date, default: Date.now },
  edited: { type: Boolean, default: false },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage', default: null }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);