const rateLimit = require('express-rate-limit');

const message = (text) => ({ message: text });

// Strict limit for login and register (stops password guessing)
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many attempts, please try again later'),
});

// General limit for the whole API
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many requests, please slow down'),
});