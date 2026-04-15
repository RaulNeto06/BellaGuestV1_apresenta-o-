function errorHandler(error, _, res, __) {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    error: true,
    message: error.message || 'Erro interno do servidor.'
  });
}

module.exports = errorHandler;
