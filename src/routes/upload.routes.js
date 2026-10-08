const router = require('express').Router();
const auth = require('../middleware/auth');
const uploadImage = require('../middleware/upload');

// POST /api/uploads (form-data, field name: "image")
// auth runs first so anonymous users cannot fill the disk
router.post('/', auth, uploadImage, (req, res) => {
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;