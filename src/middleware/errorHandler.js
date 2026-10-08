// Unknown routes
exports.notFound = (req, res) => {
  res.status(404).json({ message: 'Route not found' });
};

// Catches any error that was not handled inside a controller
exports.errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large' });
  }
  console.error(err);
  res.status(500).json({ message: 'Server error' });
};