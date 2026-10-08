const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Options for the cookie that stores the login token
const cookieOptions = {
  httpOnly: true, // JavaScript in the browser cannot read this cookie
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

exports.register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    // The pre('save') hook in the model hashes this value before saving
    const user = new User({
      name,
      username,
      email,
      passwordHash: password,
    });
    await user.save();

    res.status(201).json({
      message: 'Account created',
      user: { id: user._id, name: user.name, username: user.username },
    });
  } catch (err) {
    // 11000 = duplicate key (username or email already exists)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Username or email already in use' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // passwordHash is hidden by default, so we ask for it explicitly
    const user = await User.findOne({ username }).select('+passwordHash');

    // Same message for both cases so attackers cannot discover valid usernames
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Sign a token that only contains the user id
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    res.cookie('token', token, cookieOptions);

    res.json({
      message: 'Logged in',
      user: { id: user._id, name: user.name, username: user.username },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Returns the currently logged-in user
exports.me = async (req, res) => {
  try {
    // req.user.id is set by the auth middleware
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logging out = deleting the token cookie
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
};