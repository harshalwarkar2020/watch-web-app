// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid request body' });
  }

  console.error(err);
  return res.status(500).json({ error: 'internal server error' });
}

module.exports = { errorHandler };
