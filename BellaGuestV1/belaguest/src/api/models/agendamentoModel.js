const { pool } = require('../../config/database');

async function createAgendamento({ data, horario, status, idCliente, idServico, idProfissional }) {
  const [result] = await pool.execute(
    `INSERT INTO Agendamento (data, horario, status, idCliente, idServico, idProfissional)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data, horario, status, idCliente, idServico, idProfissional]
  );

  return findAgendamentoById(result.insertId);
}

async function findAgendamentoById(id) {
  const [rows] = await pool.execute(
    `SELECT a.*, c.idUsuario, u.nome AS nomeCliente, s.nome AS nomeServico, p.nome AS nomeProfissional
     FROM Agendamento a
     JOIN Cliente c ON c.id = a.idCliente
     JOIN Usuario u ON u.id = c.idUsuario
     JOIN Servico s ON s.id = a.idServico
     JOIN Profissional p ON p.id = a.idProfissional
     WHERE a.id = ?`,
    [id]
  );

  return rows[0] || null;
}

async function existsConflitoProfissional({ data, horario, idProfissional, ignoreId = null }) {
  const params = [data, horario, idProfissional];
  let query = `SELECT id FROM Agendamento
               WHERE data = ? AND horario = ? AND idProfissional = ?
                 AND status IN ('PENDENTE', 'CONFIRMADO')`;

  if (ignoreId) {
    query += ' AND id <> ?';
    params.push(ignoreId);
  }

  const [rows] = await pool.execute(query, params);
  return rows.length > 0;
}

async function listAgendamentos({ data, idProfissional, idCliente, status }) {
  const filters = [];
  const values = [];

  if (data) {
    filters.push('a.data = ?');
    values.push(data);
  }

  if (idProfissional) {
    filters.push('a.idProfissional = ?');
    values.push(idProfissional);
  }

  if (idCliente) {
    filters.push('a.idCliente = ?');
    values.push(idCliente);
  }

  if (status) {
    filters.push('a.status = ?');
    values.push(status);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT a.*, u.nome AS nomeCliente, s.nome AS nomeServico, p.nome AS nomeProfissional
     FROM Agendamento a
     JOIN Cliente c ON c.id = a.idCliente
     JOIN Usuario u ON u.id = c.idUsuario
     JOIN Servico s ON s.id = a.idServico
     JOIN Profissional p ON p.id = a.idProfissional
     ${whereClause}
     ORDER BY a.data ASC, a.horario ASC`,
    values
  );

  return rows;
}

async function updateAgendamento(id, { data, horario, status, idServico, idProfissional }) {
  await pool.execute(
    `UPDATE Agendamento
     SET data = ?, horario = ?, status = ?, idServico = ?, idProfissional = ?
     WHERE id = ?`,
    [data, horario, status, idServico, idProfissional, id]
  );

  return findAgendamentoById(id);
}

async function addObservacao({ idAgendamento, observacao }) {
  await pool.execute(
    'INSERT INTO AgendamentoObservacao (idAgendamento, observacao) VALUES (?, ?)',
    [idAgendamento, observacao]
  );

  const [rows] = await pool.execute(
    'SELECT * FROM AgendamentoObservacao WHERE idAgendamento = ? ORDER BY criadoEm DESC',
    [idAgendamento]
  );

  return rows;
}

module.exports = {
  createAgendamento,
  findAgendamentoById,
  existsConflitoProfissional,
  listAgendamentos,
  updateAgendamento,
  addObservacao
};
