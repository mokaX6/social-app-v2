const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    // The post this comment belongs to
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    // Reference to the user who wrote the comment (not a copy of their data)
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      required: [true, 'Comment cannot be empty'],
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Speeds up "get all comments of a post, oldest first"
commentSchema.index({ post: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);