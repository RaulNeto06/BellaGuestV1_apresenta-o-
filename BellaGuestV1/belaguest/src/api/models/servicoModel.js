const { pool } = require('../../config/database');

async function createServico({ nome, descricao, duracaoMinutos, preco }) {
  const [result] = await pool.execute(
    'INSERT INTO Servico (nome, descricao, duracaoMinutos, preco) VALUES (?, ?, ?, ?)',
    [nome, descricao, duracaoMinutos, preco]
  );

  return { id: result.insertId, nome, descricao, duracaoMinutos, preco };
}

async function listServicos() {
  const [rows] = await pool.execute('SELECT * FROM Servico ORDER BY nome ASC');
  return rows;
}

async function findServicoById(id) {
  const [rows] = await pool.execute('SELECT * FROM Servico WHERE id = ?', [id]);
  return rows[0] || null;
}

async function updateServico(id, { nome, descricao, duracaoMinutos, preco }) {
  await pool.execute(
    'UPDATE Servico SET nome = ?, descricao = ?, duracaoMinutos = ?, preco = ? WHERE id = ?',
    [nome, descricao, duracaoMinutos, preco, id]
  );

  return findServicoById(id);
}

async function deleteServico(id) {
  const [result] = await pool.execute('DELETE FROM Servico WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createServico,
  listServicos,
  findServicoById,
  updateServico,
  deleteServico
};
