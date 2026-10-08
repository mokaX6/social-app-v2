const router = require('express').Router();
const mongoose = require('mongoose');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { createPostSchema, updatePostSchema } = require('../validators/post.schema');
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleSave,
  getSavedPosts,
} = require('../controllers/post.controller');

// Reject malformed ids early (otherwise MongoDB throws a cast error)
router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid post id' });
  }
  next();
});

router.get('/', getPosts);
router.get('/saved', auth, getSavedPosts); // must come before '/:id'
router.get('/:id', getPost);

router.post('/', auth, validate(createPostSchema), createPost);
router.patch('/:id', auth, validate(updatePostSchema), updatePost);
router.delete('/:id', auth, deletePost);

router.post('/:id/like', auth, toggleLike);
router.post('/:id/save', auth, toggleSave);

module.exports = router;