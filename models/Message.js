const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  senderID: String,         // MySQL userID
  receiverID: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);