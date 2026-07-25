// Centralized error handler - keeps controllers free of repeated try/catch boilerplate style
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[error]', err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid id: ${err.value}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate value', fields: err.keyValue });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
