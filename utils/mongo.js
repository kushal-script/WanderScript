// utils/mongo.js
const mongoose = require('mongoose');

const connectMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wanderscript');
        console.log("✅ MongoDB connected for comments and messaging");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1); // Exit process if cannot connect to DB
    }
};

module.exports = connectMongo;