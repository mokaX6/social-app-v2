const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    // Reference to the user who wrote the post (not a copy of their data)
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Required when creating (enforced by the zod schema); old posts may have none
    title: { type: String, trim: true, maxlength: 100, default: '' },
    text: { type: String, trim: true, maxlength: 1000, default: '' },
    image: { type: String, default: '' },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],

    // Lists of user ids who liked or saved the post
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
