const express = require('express');
const profissionalController = require('../controllers/profissionalController');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');
const { profissionalValidator, idParamValidator, minhaDisponibilidadeValidator } = require('../validators/validators');

const router = express.Router();

router.get('/', authMiddleware, profissionalController.list);
router.get('/me', authMiddleware, roleMiddleware(['FUNCIONARIO']), profissionalController.me);
router.patch(
  '/me/disponibilidade',
  authMiddleware,
  roleMiddleware(['FUNCIONARIO']),
  minhaDisponibilidadeValidator,
  validateRequest,
  profissionalController.updateMyAvailability
);
router.get('/me/servicos', authMiddleware, roleMiddleware(['FUNCIONARIO']), profissionalController.getMyServices);
router.patch(
  '/me/servicos',
  authMiddleware,
  roleMiddleware(['FUNCIONARIO']),
  validateRequest,
  profissionalController.updateMyServices
);
router.get('/:id', authMiddleware, idParamValidator, validateRequest, profissionalController.detail);
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['ADMINISTRADOR']),
  profissionalValidator,
  validateRequest,
  profissionalController.create
);
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMINISTRADOR']),
  idParamValidator,
  profissionalValidator,
  validateRequest,
  profissionalController.update
);
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMINISTRADOR']),
  idParamValidator,
  validateRequest,
  profissionalController.remove
);

module.exports = router;
