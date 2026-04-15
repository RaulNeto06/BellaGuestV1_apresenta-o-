const { body, param, query } = require('express-validator');

const registerValidator = [
  body('nome').isString().isLength({ min: 3, max: 120 }),
  body('email').isEmail(),
  body('senha').isLength({ min: 6 }),
  body('tipoUsuario').optional().isIn(['CLIENTE']),
  body('telefone').isString().isLength({ min: 8, max: 20 })
];

const loginValidator = [
  body('email').isEmail(),
  body('senha').isString().isLength({ min: 6 })
];

const servicoValidator = [
  body('nome').isString().isLength({ min: 2, max: 120 }),
  body('descricao').optional().isString(),
  body('duracaoMinutos').isInt({ min: 10, max: 480 }),
  body('preco').isFloat({ min: 0 })
];

const profissionalValidator = [
  body('idUsuario').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('nome').isString().isLength({ min: 3, max: 120 }),
  body('especialidade').isString().isLength({ min: 2, max: 120 }),
  body('telefone').isString().isLength({ min: 8, max: 20 }),
  body('intervaloMinutos').optional().isInt({ min: 1, max: 1439 }),
  body('status').optional().isIn(['ATIVO', 'INATIVO']),
  body('idsServicos').optional().isArray(),
  body('idsServicos.*').optional().isInt({ min: 1 }),
  body('disponibilidades').optional().isArray(),
  body('disponibilidades.*.diaSemana').optional().isInt({ min: 0, max: 6 }),
  body('disponibilidades.*.horarioInicio').optional().matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  body('disponibilidades.*.horarioFim').optional().matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
];

const agendamentoCreateValidator = [
  body('data').isISO8601({ strict: true, strictSeparator: true }),
  body('horario').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  body('idServico').isInt({ min: 1 }),
  body('idProfissional').optional().custom((value) => {
    if (value === null || value === undefined) {
      return true;
    }

    if (String(value).toUpperCase() === 'ANY') {
      return true;
    }

    return Number.isInteger(Number(value));
  })
];

const agendamentoUpdateValidator = [
  body('data').isISO8601({ strict: true, strictSeparator: true }),
  body('horario').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  body('status').isIn(['PENDENTE', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO']),
  body('idServico').isInt({ min: 1 }),
  body('idProfissional').isInt({ min: 1 })
];

const idParamValidator = [param('id').isInt({ min: 1 })];

const observacaoValidator = [body('observacao').isString().isLength({ min: 2, max: 800 })];

const sugestoesValidator = [
  query('data').isISO8601({ strict: true, strictSeparator: true }),
  query('idServico').isInt({ min: 1 })
];

const disponibilidadeValidator = [
  query('data').isISO8601({ strict: true, strictSeparator: true }),
  query('idServico').optional().isInt({ min: 1 }),
  query('idProfissional').optional().isInt({ min: 1 })
];

const minhaDisponibilidadeValidator = [
  body('intervaloMinutos').isInt({ min: 1, max: 1439 }),
  body('disponibilidades').isArray({ min: 1 }),
  body('disponibilidades.*.diaSemana').isInt({ min: 0, max: 6 }),
  body('disponibilidades.*.horarioInicio').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  body('disponibilidades.*.horarioFim').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
];

const usuarioUpdateValidator = [
  body('nome').optional().isString().isLength({ min: 3, max: 120 }),
  body('email').optional().isEmail(),
  body('tipoUsuario').optional().isIn(['CLIENTE', 'FUNCIONARIO', 'ADMINISTRADOR']),
  body('telefone').optional().isString().isLength({ min: 8, max: 20 }),
  body('senha').optional().isString().isLength({ min: 6 })
];

module.exports = {
  registerValidator,
  loginValidator,
  servicoValidator,
  profissionalValidator,
  agendamentoCreateValidator,
  agendamentoUpdateValidator,
  idParamValidator,
  observacaoValidator,
  sugestoesValidator,
  disponibilidadeValidator,
  minhaDisponibilidadeValidator,
  usuarioUpdateValidator
};
