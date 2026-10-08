const router = require('express').Router();
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../validators/auth.schema');
const { register, login, logout, me } = require('../controllers/auth.controller');

// POST /api/auth/register
router.post('/register', validate(registerSchema), register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), login);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me (protected: needs a valid token)
router.get('/me', auth, me);

module.exports = router;