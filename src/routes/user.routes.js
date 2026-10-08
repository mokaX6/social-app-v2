const router = require('express').Router();
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { updateProfileSchema } = require('../validators/user.schema');
const { changePasswordSchema } = require('../validators/auth.schema');
const {
  searchUsers,
  getProfile,
  updateMe,
  changePassword,
} = require('../controllers/user.controller');

// GET /api/users?search=moka
router.get('/', searchUsers);

// PATCH /api/users/me (edit my profile)
router.patch('/me', auth, validate(updateProfileSchema), updateMe);

// PATCH /api/users/me/password
router.patch('/me/password', auth, validate(changePasswordSchema), changePassword);

// GET /api/users/:username (public). Keep it last so it never swallows other routes
router.get('/:username', getProfile);

module.exports = router;