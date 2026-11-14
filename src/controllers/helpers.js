const AppError = require('../utils/AppError');
const { parseId } = require('../utils/validators');

// Reads a positive integer id from req.params, or throws a 400.
function requireId(value, label = 'id') {
  const id = parseId(value);
  if (id === null) throw new AppError(400, `${label} must be a positive whole number`);
  return id;
}

function throwIfInvalid(errors) {
  if (errors.length > 0) throw new AppError(400, 'Validation failed', { errors });
}

module.exports = { requireId, throwIfInvalid };
