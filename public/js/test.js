// const nodemailer = require("nodemailer");
// require('dotenv').config();

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//     }
// });

// transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: 'kushalsathyanarayan@gmail.com', 
//     subject: 'Test Email',
//     text: 'Hello from WanderScript!'
// }, (err, info) => {
//     if (err) {
//         return console.error("Send error:", err);
//     }
//     console.log("Email sent:", info.response);
// });

// console.log("ENV EMAIL_USER:", process.env.EMAIL_USER);
// console.log("ENV EMAIL_PASS:", process.env.EMAIL_PASS);