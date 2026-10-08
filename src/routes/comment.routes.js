const router = require('express').Router();
const mongoose = require('mongoose');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { createCommentSchema } = require('../validators/comment.schema');
const {
  getComments,
  createComment,
  deleteComment,
} = require('../controllers/comment.controller');

// Reject malformed ids early (otherwise MongoDB throws a cast error)
const checkId = (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  next();
};
router.param('postId', checkId);
router.param('id', checkId);

// Mounted at /api in server.js
router.get('/posts/:postId/comments', getComments);
router.post('/posts/:postId/comments', auth, validate(createCommentSchema), createComment);
router.delete('/comments/:id', auth, deleteComment);

module.exports = router;