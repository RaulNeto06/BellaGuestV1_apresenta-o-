const { pool } = require('../../config/database');

async function createUser({ nome, email, senha, tipoUsuario }) {
  const [result] = await pool.execute(
    'INSERT INTO Usuario (nome, email, senha, tipoUsuario) VALUES (?, ?, ?, ?)',
    [nome, email, senha, tipoUsuario]
  );

  return { id: result.insertId, nome, email, tipoUsuario };
}

async function findUserByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM Usuario WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await pool.execute(
    'SELECT id, nome, email, tipoUsuario FROM Usuario WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function listUsersAdmin() {
  const [rows] = await pool.execute(
    `SELECT
       u.id,
       u.nome,
       u.email,
       u.tipoUsuario,
       c.telefone AS telefoneCliente,
       p.id AS idProfissional,
       p.nome AS nomeProfissional,
       p.status AS statusProfissional
     FROM Usuario u
     LEFT JOIN Cliente c ON c.idUsuario = u.id
     LEFT JOIN Profissional p ON p.idUsuario = u.id
     ORDER BY u.nome ASC`
  );

  return rows;
}

async function findUserByIdWithPassword(id) {
  const [rows] = await pool.execute('SELECT * FROM Usuario WHERE id = ?', [id]);
  return rows[0] || null;
}

async function updateUser(id, { nome, email, tipoUsuario, senha }) {
  await pool.execute(
    'UPDATE Usuario SET nome = ?, email = ?, tipoUsuario = ?, senha = ? WHERE id = ?',
    [nome, email, tipoUsuario, senha, id]
  );

  return findUserById(id);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  listUsersAdmin,
  findUserByIdWithPassword,
  updateUser
};
