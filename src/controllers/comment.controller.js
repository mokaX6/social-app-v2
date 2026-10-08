const Comment = require('../models/Comment');
const Post = require('../models/Post');

// Author fields that are safe to show publicly
const AUTHOR_FIELDS = 'name username avatar';

// List the comments of a post, oldest first
exports.getComments = async (req, res) => {
  try {
    const postExists = await Post.exists({ _id: req.params.postId });
    if (!postExists) return res.status(404).json({ message: 'Post not found' });

    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate('author', AUTHOR_FIELDS);

    res.json({ comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a comment to a post (logged-in users only)
exports.createComment = async (req, res) => {
  try {
    const postExists = await Post.exists({ _id: req.params.postId });
    if (!postExists) return res.status(404).json({ message: 'Post not found' });

    // post comes from the URL and author from the token, never from the body
    const comment = await Comment.create({
      post: req.params.postId,
      author: req.user.id,
      text: req.body.text,
    });
    await comment.populate('author', AUTHOR_FIELDS);

    res.status(201).json({ comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a comment (its author only)
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (!comment.author.equals(req.user.id)) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};