import rateLimit from 'express-rate-limit';

// Standard rate limiter to prevent flooding of API requests
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per 15 minutes
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
  max: 25, // limit each IP to 25 authentication attempts per 15 minutes (slightly higher than 10 to prevent user frustration but still protect against brute-force)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please retry in 15 minutes.'
  }
});

export default apiLimiter;

