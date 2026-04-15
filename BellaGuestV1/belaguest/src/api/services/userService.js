const bcrypt = require('bcryptjs');
const { pool } = require('../../config/database');
const HttpError = require('./httpError');
const userModel = require('../models/userModel');
const clienteModel = require('../models/clienteModel');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function listAdminUsers() {
  return userModel.listUsersAdmin();
}

async function updateUserByAdmin(id, payload, actor) {
  const target = await userModel.findUserByIdWithPassword(id);
  if (!target) {
    throw new HttpError('Usuário não encontrado.', 404);
  }

  const nome = payload.nome ? String(payload.nome).trim() : target.nome;
  const email = payload.email ? normalizeEmail(payload.email) : target.email;
  const tipoUsuario = payload.tipoUsuario || target.tipoUsuario;

  const emailOwner = await userModel.findUserByEmail(email);
  if (emailOwner && emailOwner.id !== id) {
    throw new HttpError('E-mail já cadastrado.', 409);
  }

  if (target.id === actor.id && tipoUsuario !== 'ADMINISTRADOR') {
    throw new HttpError('Você não pode remover seu próprio perfil de administrador.', 400);
  }

  const senha = payload.senha ? await bcrypt.hash(payload.senha, 10) : target.senha;

  await userModel.updateUser(id, {
    nome,
    email,
    tipoUsuario,
    senha
  });

  if (tipoUsuario === 'CLIENTE') {
    const cliente = await clienteModel.findClienteByUserId(id);
    const telefone = payload.telefone ? String(payload.telefone).trim() : cliente?.telefone;

    if (!telefone) {
      throw new HttpError('Telefone é obrigatório para usuário CLIENTE.', 400);
    }

    if (cliente) {
      await pool.execute('UPDATE Cliente SET telefone = ? WHERE idUsuario = ?', [telefone, id]);
    } else {
      await clienteModel.createCliente({ idUsuario: id, telefone });
    }
  }

  if (tipoUsuario === 'ADMINISTRADOR') {
    await pool.execute(
      `INSERT INTO Administrador (idUsuario)
       SELECT ?
       WHERE NOT EXISTS (SELECT 1 FROM Administrador WHERE idUsuario = ?)`,
      [id, id]
    );
  } else {
    await pool.execute('DELETE FROM Administrador WHERE idUsuario = ?', [id]);
  }

  return userModel.findUserById(id);
}

module.exports = {
  listAdminUsers,
  updateUserByAdmin
};
