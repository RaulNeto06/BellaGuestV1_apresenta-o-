const HttpError = require('./httpError');
const profissionalModel = require('../models/profissionalModel');
const userModel = require('../models/userModel');

async function validarVinculoUsuario(idUsuario) {
  if (!idUsuario) {
    return null;
  }

  const user = await userModel.findUserById(idUsuario);
  if (!user) {
    throw new HttpError('Usuário informado para vínculo não existe.', 404);
  }

  if (user.tipoUsuario !== 'FUNCIONARIO') {
    throw new HttpError('Apenas usuários do tipo FUNCIONARIO podem ser vinculados ao profissional.', 400);
  }

  return idUsuario;
}

async function create(payload) {
  const idUsuario = await validarVinculoUsuario(payload.idUsuario);

  const profissional = await profissionalModel.createProfissional({
    idUsuario,
    nome: payload.nome,
    telefone: payload.telefone,
    intervaloMinutos: payload.intervaloMinutos || 60,
    status: payload.status || 'ATIVO'
  });

  if (Array.isArray(payload.idsServicos)) {
    await profissionalModel.replaceServicosDoProfissional(profissional.id, payload.idsServicos);
  }

  if (Array.isArray(payload.disponibilidades)) {
    await profissionalModel.replaceDisponibilidade(profissional.id, payload.disponibilidades);
  }

  return detail(profissional.id);
}

async function list() {
  return profissionalModel.listProfissionais();
}

async function detail(id) {
  const profissional = await profissionalModel.findProfissionalById(id);
  if (!profissional) {
    throw new HttpError('Profissional não encontrado.', 404);
  }

  const [servicos, disponibilidades] = await Promise.all([
    profissionalModel.listServicosDoProfissional(id),
    profissionalModel.listDisponibilidade(id)
  ]);

  return {
    ...profissional,
    servicos,
    disponibilidades
  };
}

async function detailByUserId(idUsuario) {
  const profissional = await profissionalModel.findProfissionalByUserId(idUsuario);
  if (!profissional) {
    throw new HttpError('Não há perfil profissional vinculado para este usuário.', 404);
  }

  return detail(profissional.id);
}

async function update(id, payload) {
  const existing = await profissionalModel.findProfissionalById(id);
  if (!existing) {
    throw new HttpError('Profissional não encontrado.', 404);
  }

  const idUsuario = await validarVinculoUsuario(
    payload.idUsuario !== undefined ? payload.idUsuario : existing.idUsuario
  );

  await profissionalModel.updateProfissional(id, {
    idUsuario,
    nome: payload.nome,
    telefone: payload.telefone,
    intervaloMinutos: payload.intervaloMinutos || existing.intervaloMinutos || 60,
    status: payload.status
  });

  if (Array.isArray(payload.idsServicos)) {
    await profissionalModel.replaceServicosDoProfissional(id, payload.idsServicos);
  }

  if (Array.isArray(payload.disponibilidades)) {
    await profissionalModel.replaceDisponibilidade(id, payload.disponibilidades);
  }

  return detail(id);
}

async function remove(id) {
  const deleted = await profissionalModel.deleteProfissional(id);
  if (!deleted) {
    throw new HttpError('Profissional não encontrado.', 404);
  }

  return { message: 'Profissional removido com sucesso.' };
}

async function updateAvailabilityByUserId(idUsuario, payload) {
  const profissional = await profissionalModel.findProfissionalByUserId(idUsuario);
  if (!profissional) {
    throw new HttpError('Não há perfil profissional vinculado para este usuário.', 404);
  }

  await profissionalModel.updateProfissional(profissional.id, {
    idUsuario: profissional.idUsuario,
    nome: profissional.nome,
    telefone: profissional.telefone,
    intervaloMinutos: payload.intervaloMinutos || profissional.intervaloMinutos,
    status: profissional.status
  });

  await profissionalModel.replaceDisponibilidade(profissional.id, payload.disponibilidades);

  return detail(profissional.id);
}

async function updateServicosByUserId(idUsuario, idsServicos) {
  const profissional = await profissionalModel.findProfissionalByUserId(idUsuario);
  if (!profissional) {
    throw new HttpError('Não há perfil profissional vinculado para este usuário.', 404);
  }

  await profissionalModel.replaceServicosDoProfissional(profissional.id, idsServicos);

  return detail(profissional.id);
}

module.exports = {
  create,
  list,
  detail,
  detailByUserId,
  update,
  updateAvailabilityByUserId,
  updateServicosByUserId,
  remove
};
