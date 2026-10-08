const { z } = require('zod');

// Create: text is required and must match the model's max length
const createCommentSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, 'Comment cannot be empty')
      .max(500, 'Comment is too long'),
  })
  .strict(); // reject any unexpected fields

module.exports = { createCommentSchema };;