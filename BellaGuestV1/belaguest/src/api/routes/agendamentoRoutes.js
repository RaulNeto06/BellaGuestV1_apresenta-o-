const express = require('express');
const agendamentoController = require('../controllers/agendamentoController');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');
const {
  agendamentoCreateValidator,
  agendamentoUpdateValidator,
  idParamValidator,
  observacaoValidator,
  sugestoesValidator,
  disponibilidadeValidator
} = require('../validators/validators');

const router = express.Router();

router.get('/', authMiddleware, agendamentoController.list);
router.get('/sugestoes', authMiddleware, sugestoesValidator, validateRequest, agendamentoController.sugestoes);
router.get('/disponibilidade', authMiddleware, disponibilidadeValidator, validateRequest, agendamentoController.disponibilidade);

router.post(
  '/',
  authMiddleware,
  roleMiddleware(['CLIENTE']),
  agendamentoCreateValidator,
  validateRequest,
  agendamentoController.create
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['ADMINISTRADOR', 'FUNCIONARIO', 'CLIENTE']),
  idParamValidator,
  agendamentoUpdateValidator,
  validateRequest,
  agendamentoController.update
);

router.patch(
  '/:id/cancelar',
  authMiddleware,
  roleMiddleware(['ADMINISTRADOR', 'FUNCIONARIO', 'CLIENTE']),
  idParamValidator,
  validateRequest,
  agendamentoController.cancel
);

router.post(
  '/:id/observacoes',
  authMiddleware,
  roleMiddleware(['ADMINISTRADOR', 'FUNCIONARIO']),
  idParamValidator,
  observacaoValidator,
  validateRequest,
  agendamentoController.addObservacao
);

module.exports = router;
