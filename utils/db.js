// utils/db.js
const mysql = require('mysql2/promise'); // Use mysql2/promise for async/await

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10, // Adjust based on your expected load
    queueLimit: 0
});

module.exports = pool;