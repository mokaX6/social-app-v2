const { z } = require('zod');
const { uploadedImage } = require('./common');

const title = z.string().trim().min(1, 'Title is required').max(100, 'Title is too long');
const text = z.string().trim().max(1000, 'Text is too long');
const tags = z
  .array(z.string().trim().toLowerCase().min(1).max(30))
  .max(5, 'Maximum 5 tags');

// Create: a title is required, everything else is optional
const createPostSchema = z
  .object({
    title,
    text: text.optional(),
    image: uploadedImage.optional(),
    tags: tags.optional(),
  })
  .strict(); // reject any unexpected fields

// Update: any of the fields, but at least one must be sent
const updatePostSchema = z
  .object({ title, text, image: uploadedImage, tags })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nothing to update',
  });

module.exports = { createPostSchema, updatePostSchema };
