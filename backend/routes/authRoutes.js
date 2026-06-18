import express from 'express';
import { login, register, refresh, logout, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest, loginValidationRules, userValidationRules } from '../middleware/requestValidator.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply stricter rate limits to authentication endpoints
router.post('/register', authLimiter, validateRequest(userValidationRules), register);
router.post('/login', authLimiter, validateRequest(loginValidationRules), login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
