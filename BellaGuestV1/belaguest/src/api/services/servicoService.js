const HttpError = require('./httpError');
const servicoModel = require('../models/servicoModel');

async function create(payload) {
  return servicoModel.createServico(payload);
}

async function list() {
  return servicoModel.listServicos();
}

async function update(id, payload) {
  const existing = await servicoModel.findServicoById(id);
  if (!existing) {
    throw new HttpError('Serviço não encontrado.', 404);
  }

  return servicoModel.updateServico(id, payload);
}

async function remove(id) {
  const deleted = await servicoModel.deleteServico(id);
  if (!deleted) {
    throw new HttpError('Serviço não encontrado.', 404);
  }

  return { message: 'Serviço removido com sucesso.' };
}

module.exports = {
  create,
  list,
  update,
  remove
};
