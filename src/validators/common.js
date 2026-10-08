const { z } = require('zod');

// Accepts only images uploaded through our own /api/uploads endpoint.
// An empty string means "no image" (used to remove an image).
const uploadedImage = z.union([
  z.literal(''),
  z.string().regex(/^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp|gif)$/, 'Invalid image path'),
]);

module.exports = { uploadedImage };
