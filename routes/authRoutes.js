// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateSignupInput, validateEmail } = require('../middleware/validationMiddleware');
// Multer is initialized globally in app.js with upload.none(),
// so no need to import it specifically per route file unless for file uploads.
// If you need specific multer behavior, you can import and initialize it here.

// GET routes
router.get('/signup', authController.getSignupPage);
router.get('/signin', authController.getSigninPage);
router.get('/forgot-password', authController.getForgotPasswordPage);
router.get('/verify-otp', authController.getVerifyOtpPage);

// POST routes
router.post('/signup', validateSignupInput, authController.signupUser);
router.post('/signin', validateEmail, authController.signinUser);
router.post('/verify-otp', authController.postVerifyOtp); // upload.none() is global in app.js
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authController.logoutUser);
router.delete('/delete-account', authController.deleteAccount); // Moved here from app.js, more user-centric

module.exports = router;