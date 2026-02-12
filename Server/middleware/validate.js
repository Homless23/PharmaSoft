const { validationResult } = require('express-validator');

/**
 * Standardized interceptor to check for validation errors
 * before they reach the controller logic.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format the first error into our global error structure
    const extractedErrors = errors.array().map(err => err.msg);
    return res.status(400).json({
      success: false,
      error: extractedErrors[0] // Return the primary error for the Global Alert system
    });
  }
  next();
};

module.exports = validate;