const { pool } = require('../../config/database');

async function createCliente({ idUsuario, telefone }) {
  const [result] = await pool.execute(
    'INSERT INTO Cliente (idUsuario, telefone) VALUES (?, ?)',
    [idUsuario, telefone]
  );

  return { id: result.insertId, idUsuario, telefone };
}

async function findClienteByUserId(idUsuario) {
  const [rows] = await pool.execute('SELECT * FROM Cliente WHERE idUsuario = ?', [idUsuario]);
  return rows[0] || null;
}

module.exports = {
  createCliente,
  findClienteByUserId
};
