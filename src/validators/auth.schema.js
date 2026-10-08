const { z } = require('zod');

// Password rules: 8+ chars, upper, lower, number, and a symbol
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long') // bcrypt ignores anything past 72 bytes
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^a-zA-Z0-9]/, 'Password must include a symbol like ! @ #');

const registerSchema = z
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
    password: strongPassword,
  })
  .strict(); // reject any unexpected fields

// Login only checks that the fields exist; strength rules apply at register
const loginSchema = z
  .object({
    username: z.string().trim().toLowerCase().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: strongPassword,
  })
  .strict();

module.exports = { registerSchema, loginSchema, changePasswordSchema };