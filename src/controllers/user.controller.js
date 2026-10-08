const User = require('../models/User');
const Post = require('../models/Post');
const escapeRegex = require('../utils/escapeRegex');
const shapePosts = require('../utils/shapePosts');

// What anyone is allowed to see on a public profile (no email)
const PUBLIC_FIELDS = 'name username avatar cover bio createdAt';
const AUTHOR_FIELDS = 'name username avatar';

// Public profile + the user's latest posts
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase(),
    }).select(PUBLIC_FIELDS);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('author', AUTHOR_FIELDS);

    res.json({ user, posts: await shapePosts(posts) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update the logged-in user's own profile
exports.updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Only these fields can be changed here (the schema already rejects others)
    const allowed = ['name', 'username', 'email', 'bio', 'avatar', 'cover'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    }
    await user.save();

    res.json({ user });
  } catch (err) {
    // 11000 = duplicate key (username or email already taken)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Username or email already in use' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password (requires the current one)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ message: 'New password must be different from the current one' });
    }

    // Must use save() so the pre('save') hook hashes it
    user.passwordHash = newPassword;
    await user.save();

    res.json({ message: 'Password changed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search users by name or username: GET /api/users?search=moka
exports.searchUsers = async (req, res) => {
  try {
    const q = String(req.query.search || '').trim().slice(0, 30);
    if (!q) return res.json({ users: [] });

    const regex = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ $or: [{ username: regex }, { name: regex }] })
      .select('name username avatar bio')
      .limit(20);

    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
