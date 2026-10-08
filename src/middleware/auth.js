const jwt = require('jsonwebtoken');

// Protects routes: only requests with a valid token can pass
module.exports = (req, res, next) => {
  const token = req.cookies.token;

  // No cookie means the user never logged in
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Throws if the token was tampered with or has expired
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Controllers read the logged-in user id from here
    req.user = { id: payload.id };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};