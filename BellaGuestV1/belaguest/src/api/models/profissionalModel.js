const { pool } = require('../../config/database');

async function createProfissional({ idUsuario = null, nome, telefone, intervaloMinutos = 60, status = 'ATIVO' }) {
  const [result] = await pool.execute(
    'INSERT INTO Profissional (idUsuario, nome, telefone, intervaloMinutos, status) VALUES (?, ?, ?, ?, ?)',
    [idUsuario, nome, telefone, intervaloMinutos, status]
  );

  return { id: result.insertId, idUsuario, nome, telefone, intervaloMinutos, status };
}

async function listProfissionais() {
  const [rows] = await pool.execute('SELECT * FROM Profissional ORDER BY nome ASC');
  return rows;
}

async function findProfissionalById(id) {
  const [rows] = await pool.execute('SELECT * FROM Profissional WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findProfissionalByUserId(idUsuario) {
  const [rows] = await pool.execute('SELECT * FROM Profissional WHERE idUsuario = ?', [idUsuario]);
  return rows[0] || null;
}

async function updateProfissional(id, { idUsuario = null, nome, telefone, intervaloMinutos = 60, status }) {
  await pool.execute(
    'UPDATE Profissional SET idUsuario = ?, nome = ?, telefone = ?, intervaloMinutos = ?, status = ? WHERE id = ?',
    [idUsuario, nome, telefone, intervaloMinutos, status, id]
  );

  return findProfissionalById(id);
}

async function deleteProfissional(id) {
  const [result] = await pool.execute('DELETE FROM Profissional WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function replaceServicosDoProfissional(idProfissional, idsServicos) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM ProfissionalServico WHERE idProfissional = ?', [idProfissional]);

    for (const idServico of idsServicos) {
      await conn.execute(
        'INSERT INTO ProfissionalServico (idProfissional, idServico) VALUES (?, ?)',
        [idProfissional, idServico]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function listServicosDoProfissional(idProfissional) {
  const [rows] = await pool.execute(
    `SELECT s.*
     FROM ProfissionalServico ps
     JOIN Servico s ON s.id = ps.idServico
     WHERE ps.idProfissional = ?
     ORDER BY s.nome ASC`,
    [idProfissional]
  );

  return rows;
}

async function replaceDisponibilidade(idProfissional, disponibilidades) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM DisponibilidadeProfissional WHERE idProfissional = ?', [idProfissional]);

    for (const item of disponibilidades) {
      await conn.execute(
        `INSERT INTO DisponibilidadeProfissional (idProfissional, diaSemana, horarioInicio, horarioFim)
         VALUES (?, ?, ?, ?)`,
        [idProfissional, item.diaSemana, item.horarioInicio, item.horarioFim]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function listDisponibilidade(idProfissional) {
  const [rows] = await pool.execute(
    `SELECT id, idProfissional, diaSemana, horarioInicio, horarioFim
     FROM DisponibilidadeProfissional
     WHERE idProfissional = ?
     ORDER BY diaSemana, horarioInicio`,
    [idProfissional]
  );

  return rows;
}

async function listProfissionaisDisponiveis({ data, horario, idServico }) {
  const [rows] = await pool.execute(
    `SELECT p.*
     FROM Profissional p
     JOIN ProfissionalServico ps ON ps.idProfissional = p.id
     WHERE p.status = 'ATIVO'
       AND ps.idServico = ?
       AND NOT EXISTS (
         SELECT 1
         FROM Agendamento a
         WHERE a.idProfissional = p.id
           AND a.data = ?
           AND a.horario = ?
           AND a.status IN ('PENDENTE', 'CONFIRMADO')
       )
     ORDER BY p.nome ASC`,
    [idServico, data, horario]
  );

  return rows;
}

module.exports = {
  createProfissional,
  listProfissionais,
  findProfissionalById,
  findProfissionalByUserId,
  updateProfissional,
  deleteProfissional,
  replaceServicosDoProfissional,
  listServicosDoProfissional,
  replaceDisponibilidade,
  listDisponibilidade,
  listProfissionaisDisponiveis
};
