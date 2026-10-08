const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const escapeRegex = require('../utils/escapeRegex');
const shapePosts = require('../utils/shapePosts');

// Author fields that are safe to show publicly
const AUTHOR_FIELDS = 'name username avatar';

// Create a post for the logged-in user
exports.createPost = async (req, res) => {
  try {
    const { title, text, image, tags } = req.body;
    const post = await Post.create({ author: req.user.id, title, text, image, tags });
    await post.populate('author', AUTHOR_FIELDS);
    res.status(201).json({ post: await shapePosts(post) });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// List posts, newest first, with pagination.
// Optional filters: ?search=coffee (title, text, tags, author) and ?tag=coffee (exact tag)
exports.getPosts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const filter = {};

    const q = String(req.query.search || '').trim().slice(0, 50);
    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: regex }, { text: regex }, { tags: regex }];

      // Also match posts written by users whose name or username fits
      const authors = await User.find({ $or: [{ username: regex }, { name: regex }] })
        .select('_id')
        .limit(50);
      if (authors.length > 0) {
        filter.$or.push({ author: { $in: authors.map((a) => a._id) } });
      }
    }

    const tag = String(req.query.tag || '').trim().toLowerCase().slice(0, 30);
    if (tag) filter.tags = tag;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', AUTHOR_FIELDS),
      Post.countDocuments(filter),
    ]);

    res.json({
      posts: await shapePosts(posts),
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a single post
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', AUTHOR_FIELDS);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ post: await shapePosts(post) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Edit a post (owner only)
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Never trust the client: compare with the id from the token
    if (!post.author.equals(req.user.id)) {
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }

    const { title, text, image, tags } = req.body;
    if (title !== undefined) post.title = title;
    if (text !== undefined) post.text = text;
    if (image !== undefined) post.image = image;
    if (tags !== undefined) post.tags = tags;
    await post.save();

    await post.populate('author', AUTHOR_FIELDS);
    res.json({ post: await shapePosts(post) });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a post (owner only)
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (!post.author.equals(req.user.id)) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await Comment.deleteMany({ post: post._id }); // remove the post's comments too
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Builds a handler that adds or removes the user from "likes" or "saves"
const toggleInList = (field) => async (req, res) => {
  try {
    const userId = req.user.id;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const active = post[field].some((id) => id.equals(userId));

    // $pull / $addToSet are atomic, so two quick taps cannot create duplicates
    const update = active
      ? { $pull: { [field]: userId } }
      : { $addToSet: { [field]: userId } };
    const updated = await Post.findByIdAndUpdate(post._id, update, { new: true });

    res.json({ active: !active, count: updated[field].length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleLike = toggleInList('likes');
exports.toggleSave = toggleInList('saves');

// Posts the logged-in user has saved
exports.getSavedPosts = async (req, res) => {
  try {
    const posts = await Post.find({ saves: req.user.id })
      .sort({ createdAt: -1 })
      .populate('author', AUTHOR_FIELDS);
    res.json({ posts: await shapePosts(posts) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
