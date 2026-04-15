const express = require('express');
const servicoController = require('../controllers/servicoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');
const { servicoValidator, idParamValidator } = require('../validators/validators');

const router = express.Router();

router.get('/', authMiddleware, servicoController.list);
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['ADMINISTRADOR']),
  servicoValidator,
  validateRequest,
  servicoController.create
);
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMINISTRADOR']),
  idParamValidator,
  servicoValidator,
  validateRequest,
  servicoController.update
);
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMINISTRADOR']),
  idParamValidator,
  validateRequest,
  servicoController.remove
);

module.exports = router;
