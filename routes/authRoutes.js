// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateSignupInput, validateEmail } = require('../middleware/validationMiddleware');

// GET routes
router.get('/signup', authController.getSignupPage);
router.get('/signin', authController.getSigninPage);
router.get('/forgot-password', authController.getForgotPasswordPage);
router.get('/verify-otp', authController.getVerifyOtpPage);

// POST routes
router.post('/signup', validateSignupInput, authController.signupUser);
router.post('/signin', validateEmail, authController.signinUser);
router.post('/verify-otp', authController.postVerifyOtp);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authController.logoutUser);
router.delete('/delete-account', authController.deleteAccount); 
module.exports = router;