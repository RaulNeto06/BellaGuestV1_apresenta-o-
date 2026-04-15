function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.tipoUsuario)) {
      return res.status(403).json({ message: 'Acesso negado para este perfil.' });
    }

    return next();
  };
}

module.exports = roleMiddleware;
