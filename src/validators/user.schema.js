const { z } = require('zod');
const { uploadedImage } = require('./common');

// Every field is optional, but at least one must be sent
const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(50),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(20)
      .regex(/^[a-z0-9_]+$/, 'Username can only contain letters, numbers, and _'),
    email: z.string().trim().toLowerCase().email('Invalid email'),
    bio: z.string().trim().max(160, 'Bio is too long'),
    avatar: uploadedImage,
    cover: uploadedImage,
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nothing to update',
  });

module.exports = { updateProfileSchema };