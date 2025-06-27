# WanderScript

## License

This project is licensed under the MIT License - see the [LICENSE](/WanderScript/LICENSE) file for details.

### Key Features:

* **User Profiles:** Create and personalize your profile with a bio, track your posts, upvotes, followers, and who you are following. Easily edit your profile to keep it updated.
* **Global and Personalized Feeds:** Dive into the "Global Feed" to explore a wide range of posts from across the platform, or focus on content from users you follow.
* **Dynamic Posts:** Share your thoughts, ideas, or updates through posts. Engage with content by upvoting posts and leaving comments.
* **Search Box:** Explore fellow users on platform.
* **Interactive Messaging:** Stay connected with direct messages. The platform supports real-time chat, allowing you to send, receive, edit, and delete messages, as well as mark them as read or unread. You can also reply directly to specific messages within a conversation.
* **Follower System:** Build your network by following other users and gain followers yourself. Manage your connections easily from your dashboard, with options to unfollow or remove followers.
* **Secure Authentication:** Experience a secure login process with traditional username/email and password options, or leverage OTP (One-Time Password) verification for enhanced security. Features like password reset ensure account recovery.
* **Engaging Interactions:** Participate in discussions by commenting on posts and replying to specific comments. Upvote content you find valuable to show your appreciation.
* **Dashboard Management:** A dedicated dashboard provides a quick overview of your network, allowing you to manage who you follow and who follows you, and offers options like account logout and deletion.

## WanderScript Folder Structure

WanderScript/  
├── controllers/  
│ ├── authController.js  
│ ├── commentController.js  
│ ├── messageController.js  
│ ├── postController.js  
│ └── userController.js  
├── middleware/  
│ ├── authMiddleware.js  
│ └── validationMiddleware.js  
├── models/  
│ ├── Chats.js  
│ ├── Comment.js  
│ ├── Message.js  
│ └── Post.js  
├── node_modules/  
├── public/  
│ ├── css/  
│ ├── auth.css  
│ ├── editPost.css  
│ ├── editProfile.css  
│ ├── homeFeed.css  
│ ├── mail.css  
│ ├── messageIndividual.css  
│ ├── messageList.css  
│ ├── newPost.css  
│ ├── otpVerification.css  
│ └── profile.css  
├── routes/  
│ ├── authRoutes.js  
│ ├── commentRoutes.js  
│ ├── messageRoutes.js  
│ ├── postRoutes.js  
│ └── userRoutes.js  
├── services/  
│ ├── emailService.js  
│ └── userService.js  
├── utils/  
│ ├── db.js  
│ ├── helpers.js  
│ └── mongo.js  
├── views/  
│ ├── includes/  
│ ├── alert.ejs  
│ ├── currentUser.ejs  
│ ├── editPost.ejs  
│ ├── editProfile.ejs  
│ ├── forgotPassword.ejs  
│ ├── homeFeed.ejs  
│ ├── loading.ejs  
│ ├── mail.ejs  
│ ├── messageIndividual.ejs  
│ ├── messageList.ejs  
│ ├── newPost.ejs  
│ ├── otherUser.ejs  
│ ├── otpVerification.ejs  
│ ├── pageNotFound.ejs  
│ ├── signIn.ejs  
│ ├── signUp.ejs  
│ └── useDashboard.ejs  
├── .env  
├── .gitignore  
├── app.js  
├── package.json  
├── package-lock.json  
├── README.md  
└── server.js (ignore)  

## NPM Packages Used

* `dotenv`: For loading environment variables from a `.env` file.
* `express`: The web framework for Node.js.
* `mysql2`: A MySQL client for Node.js.
* `path`: Node.js built-in module for working with file and directory paths.
* `bcrypt`: For hashing passwords securely.
* `express-session`: Middleware for managing user sessions.
* `uuid`: For generating unique IDs (specifically `v4` for UUIDs).
* `method-override`: For enabling `PUT` and `DELETE` HTTP methods in forms.
* `nodemailer`: For sending emails (e.g., for OTP verification, password resets).
* `validator`: For string validation and sanitization.
* `mongoose`: An ODM (Object Data Modeling) library for MongoDB.
* `multer`: Middleware for handling `multipart/form-data`, primarily used for file uploads.
* `nodemon`: A development utility that monitors for changes in your Node.js application's source code and automatically restarts the server when changes are detected. (Not a runtime dependency, but crucial for development workflow. To manually stop `nodemon`, use `Ctrl + C` in the terminal.)

## Technologies Used

* **Frontend:** EJS (templating engine), HTML, CSS, JavaScript
* **Backend:** Node.js, Express.js
* **Databases:**
    * MySQL (for user data, posts, and core relational data)
    * MongoDB (for dynamic data like comments and real-time messaging)
* **Authentication/Security:** `bcrypt` (password hashing), `express-session` (session management), `nodemailer` (email/OTP), `uuid` (unique IDs), `validator` (input validation)
* **File Uploads:** `multer`
* **Development Tools:** `nodemon`, `dotenv`

## Future Enhancements

* **Voice/Video Calling:** Integration of real-time voice and video communication via WebRTC and Socket.IO.
* **Custom Chat Themes:** Allow users to personalize their chat interface with different themes.
* **Light/Dark Theme Toggle:** Implement a toggle in the user dashboard for light and dark mode preferences.
* **App Styling Enhancements:** Continuous improvements to the overall UI/UX and styling of the application.

**Dual Database Architecture:** Leverages **MySQL** for core user data and relationships (profiles, followers, posts) and **MongoDB** for flexible, real-time data like comments and direct messages, showcasing an understanding of database selection for optimal performance.

## Contact

Feel free to connect with me for any questions, feedback, or collaborations!

* **LinkedIn:** [Kushal S](https://www.linkedin.com/in/kushal-s-rv-university/)
* **GitHub:** [kushal-script](https://github.com/kushal-script)
* **Email:** kushalsathyanarayan@gmail.com