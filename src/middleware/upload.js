const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// uploads/ lives next to server.js
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// The extension comes from this list, never from the user's file name
const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Random name so files cannot overwrite each other or be guessed
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(16).toString('hex') + EXTENSIONS[file.mimetype]),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2MB, one file
  fileFilter: (req, file, cb) => {
    if (!EXTENSIONS[file.mimetype]) {
      return cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed'));
    }
    cb(null, true);
  },
});

// Wrapper so upload errors become clean 400 responses
module.exports = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2MB or smaller' : err.message;
      return res.status(400).json({ message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    next();
  });
};
