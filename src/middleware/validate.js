// Runs a zod schema against the request body
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  // Stop here if the data does not match the schema
  if (!result.success) {
    return res.status(400).json({
      message: 'Invalid data',
      errors: result.error.issues.map((i) => i.message),
    });
  }

  // Replace the body with the cleaned data, then continue
  req.body = result.data;
  next();
};

module.exports = validate;