const agendamentoService = require('../services/agendamentoService');

async function create(req, res, next) {
  try {
    const result = await agendamentoService.create(req.body, req.user);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await agendamentoService.list(req.query, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await agendamentoService.update(Number(req.params.id), req.body, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function cancel(req, res, next) {
  try {
    const result = await agendamentoService.cancel(Number(req.params.id), req.user);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function addObservacao(req, res, next) {
  try {
    const result = await agendamentoService.addObservacaoComUsuario(
      Number(req.params.id),
      req.body.observacao,
      req.user
    );
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function sugestoes(req, res, next) {
  try {
    const result = await agendamentoService.sugestoes(req.query.data, Number(req.query.idServico));
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function disponibilidade(req, res, next) {
  try {
    const result = await agendamentoService.disponibilidadeDia(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  list,
  update,
  cancel,
  addObservacao,
  sugestoes,
  disponibilidade
};
