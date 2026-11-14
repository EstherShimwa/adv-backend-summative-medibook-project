const AppError = require('../utils/AppError');

// Translates known database errors into client-facing errors.
const MYSQL_ERRORS = {
  ER_DUP_ENTRY: () => new AppError(409, 'A record with these unique values already exists (e.g. this email is taken)'),
  ER_ROW_IS_REFERENCED_2: () =>
    new AppError(409, 'This record has appointment history and cannot be deleted'),
  ER_NO_REFERENCED_ROW_2: () => new AppError(404, 'A referenced patient or doctor does not exist'),
  ER_CHECK_CONSTRAINT_VIOLATED: (err) => new AppError(422, `Business rule violated: ${err.sqlMessage}`),
};

function notFound(req, res, next) {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;
  if (err.type === 'entity.parse.failed') {
    error = new AppError(400, 'Request body is not valid JSON');
  } else if (MYSQL_ERRORS[err.code]) {
    error = MYSQL_ERRORS[err.code](err);
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message, ...error.details });
  }

  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}

module.exports = { notFound, errorHandler };
