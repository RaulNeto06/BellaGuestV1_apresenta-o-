const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const HttpError = require('./httpError');
const userModel = require('../models/userModel');
const clienteModel = require('../models/clienteModel');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function register({ nome, email, senha, tipoUsuario, telefone }) {
  const normalizedEmail = normalizeEmail(email);
  const targetRole = tipoUsuario || 'CLIENTE';

  if (targetRole !== 'CLIENTE') {
    throw new HttpError('Cadastro público disponível apenas para clientes.', 403);
  }

  const existing = await userModel.findUserByEmail(normalizedEmail);
  if (existing) {
    throw new HttpError('E-mail já cadastrado.', 409);
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const newUser = await userModel.createUser({
    nome: String(nome).trim(),
    email: normalizedEmail,
    senha: senhaHash,
    tipoUsuario: 'CLIENTE'
  });

  await clienteModel.createCliente({ idUsuario: newUser.id, telefone: String(telefone).trim() });

  return newUser;
}

async function login({ email, senha }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userModel.findUserByEmail(normalizedEmail);
  if (!user) {
    throw new HttpError('Credenciais inválidas.', 401);
  }

  const validPassword = await bcrypt.compare(senha, user.senha);
  if (!validPassword) {
    throw new HttpError('Credenciais inválidas.', 401);
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      tipoUsuario: user.tipoUsuario
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipoUsuario: user.tipoUsuario
    }
  };
}

async function me(userId) {
  const user = await userModel.findUserById(userId);
  if (!user) {
    throw new HttpError('Usuário não encontrado.', 404);
  }

  return user;
}

module.exports = {
  register,
  login,
  me
};
