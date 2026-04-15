const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');
const { idParamValidator, usuarioUpdateValidator } = require('../validators/validators');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware(['ADMINISTRADOR']), userController.list);
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMINISTRADOR']),
  idParamValidator,
  usuarioUpdateValidator,
  validateRequest,
  userController.update
);

module.exports = router;
