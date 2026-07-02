import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

// Standard rate limiter to prevent flooding of API requests
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 2000 : 200, // limit each IP to 2000 in dev or 200 in prod
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many API requests from this IP address. Please retry in 15 minutes.'
  }
});

// Stricter rate limiter for authentication routes (login, register, reset, refresh)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 25, // limit each IP to 25 authentication attempts per 15 minutes (slightly higher than 10 to prevent user frustration but still protect against brute-force)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please retry in 15 minutes.'
  }
});

export default apiLimiter;

