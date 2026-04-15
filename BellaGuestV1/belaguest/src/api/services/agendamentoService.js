const agendamentoModel = require('../models/agendamentoModel');
const clienteModel = require('../models/clienteModel');
const profissionalModel = require('../models/profissionalModel');
const servicoModel = require('../models/servicoModel');
const HttpError = require('./httpError');
const { getIO } = require('../../config/socket');

function timeToMinutes(value) {
  const [hour, minute] = String(value).split(':').map(Number);
  return (hour * 60) + minute;
}

function minutesToTime(value) {
  const hours = String(Math.floor(value / 60)).padStart(2, '0');
  const minutes = String(value % 60).padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

function buildSlotsFromDisponibilidade(disponibilidades, dayOfWeek, intervaloMinutos) {
  const slots = [];
  const seen = new Set();

  for (const slot of disponibilidades) {
    if (slot.diaSemana !== dayOfWeek) {
      continue;
    }

    const startMinutes = timeToMinutes(slot.horarioInicio);
    const endMinutes = timeToMinutes(slot.horarioFim);

    for (let current = startMinutes; current + intervaloMinutos <= endMinutes; current += intervaloMinutos) {
      const horario = minutesToTime(current);
      if (!seen.has(horario)) {
        seen.add(horario);
        slots.push(horario);
      }
    }
  }

  return slots.sort();
}

function getDayFromDate(dateString) {
  const day = new Date(`${dateString}T00:00:00`).getDay();
  return day;
}

function isBetweenTime(target, start, end) {
  return target >= start && target < end;
}

async function validarDisponibilidadeProfissional(idProfissional, data, horario) {
  const profissional = await profissionalModel.findProfissionalById(idProfissional);
  const disponibilidade = await profissionalModel.listDisponibilidade(idProfissional);
  if (!disponibilidade.length) {
    return false;
  }

  const day = getDayFromDate(data);
  const slots = buildSlotsFromDisponibilidade(disponibilidade, day, Number(profissional?.intervaloMinutos) || 60);
  return slots.includes(String(horario).length === 5 ? `${horario}:00` : horario);
}

async function escolherProfissionalDisponivel({ data, horario, idServico }) {
  const candidatos = await profissionalModel.listProfissionaisDisponiveis({ data, horario, idServico });

  for (const profissional of candidatos) {
    const isDisponivel = await validarDisponibilidadeProfissional(profissional.id, data, horario);
    if (isDisponivel) {
      return profissional;
    }
  }

  return null;
}

async function resolverClienteId(user) {
  if (user.tipoUsuario !== 'CLIENTE') {
    throw new HttpError('Apenas clientes podem criar reservas diretas.', 403);
  }

  const cliente = await clienteModel.findClienteByUserId(user.id);
  if (!cliente) {
    throw new HttpError('Perfil de cliente não encontrado.', 404);
  }

  return cliente.id;
}

async function resolverProfissionalId(user) {
  if (user.tipoUsuario !== 'FUNCIONARIO') {
    throw new HttpError('Apenas funcionários podem usar este fluxo.', 403);
  }

  const profissional = await profissionalModel.findProfissionalByUserId(user.id);
  if (!profissional) {
    throw new HttpError('Funcionário sem vínculo com profissional.', 404);
  }

  return profissional.id;
}

async function create(payload, user) {
  const idCliente = await resolverClienteId(user);

  const servico = await servicoModel.findServicoById(payload.idServico);
  if (!servico) {
    throw new HttpError('Serviço não encontrado.', 404);
  }

  let idProfissional = payload.idProfissional;

  if (!idProfissional || String(idProfissional).toUpperCase() === 'ANY') {
    const profissional = await escolherProfissionalDisponivel({
      data: payload.data,
      horario: payload.horario,
      idServico: payload.idServico
    });

    if (!profissional) {
      throw new HttpError('Nenhum profissional disponível para este horário.', 409);
    }

    idProfissional = profissional.id;
  }

  const profissional = await profissionalModel.findProfissionalById(idProfissional);
  if (!profissional || profissional.status !== 'ATIVO') {
    throw new HttpError('Profissional inválido ou inativo.', 400);
  }

  const ofereceServico = (await profissionalModel.listServicosDoProfissional(idProfissional))
    .some((item) => item.id === payload.idServico);

  if (!ofereceServico) {
    throw new HttpError('Este profissional não oferece o serviço selecionado.', 400);
  }

  const disponivelNoHorario = await validarDisponibilidadeProfissional(idProfissional, payload.data, payload.horario);
  if (!disponivelNoHorario) {
    throw new HttpError('Profissional indisponível neste horário.', 409);
  }

  const hasConflito = await agendamentoModel.existsConflitoProfissional({
    data: payload.data,
    horario: payload.horario,
    idProfissional
  });

  if (hasConflito) {
    throw new HttpError('Já existe agendamento para este profissional no horário selecionado.', 409);
  }

  const agendamento = await agendamentoModel.createAgendamento({
    data: payload.data,
    horario: payload.horario,
    status: 'CONFIRMADO',
    idCliente,
    idServico: payload.idServico,
    idProfissional
  });

  getIO().emit('agendamento:created', agendamento);

  return agendamento;
}

async function list(filters, user) {
  const normalized = { ...filters };

  if (user.tipoUsuario === 'CLIENTE') {
    normalized.idCliente = await resolverClienteId(user);
  }

  if (user.tipoUsuario === 'FUNCIONARIO') {
    normalized.idProfissional = await resolverProfissionalId(user);
  }

  return agendamentoModel.listAgendamentos(normalized);
}

async function update(id, payload, user) {
  const existing = await agendamentoModel.findAgendamentoById(id);
  if (!existing) {
    throw new HttpError('Agendamento não encontrado.', 404);
  }

  if (user.tipoUsuario === 'CLIENTE') {
    const idCliente = await resolverClienteId(user);
    if (existing.idCliente !== idCliente) {
      throw new HttpError('Você não pode editar este agendamento.', 403);
    }
  }

  if (user.tipoUsuario === 'FUNCIONARIO') {
    const idProfissional = await resolverProfissionalId(user);
    if (existing.idProfissional !== idProfissional) {
      throw new HttpError('Você não pode editar agendamentos de outro profissional.', 403);
    }

    if (payload.idProfissional !== idProfissional) {
      throw new HttpError('Funcionário não pode alterar o profissional do agendamento.', 403);
    }
  }

  const hasConflito = await agendamentoModel.existsConflitoProfissional({
    data: payload.data,
    horario: payload.horario,
    idProfissional: payload.idProfissional,
    ignoreId: id
  });

  if (hasConflito) {
    throw new HttpError('Conflito de horário com outro agendamento.', 409);
  }

  const updated = await agendamentoModel.updateAgendamento(id, payload);
  getIO().emit('agendamento:updated', updated);
  return updated;
}

async function cancel(id, user) {
  const existing = await agendamentoModel.findAgendamentoById(id);
  if (!existing) {
    throw new HttpError('Agendamento não encontrado.', 404);
  }

  if (user.tipoUsuario === 'CLIENTE') {
    const idCliente = await resolverClienteId(user);
    if (existing.idCliente !== idCliente) {
      throw new HttpError('Você não pode cancelar este agendamento.', 403);
    }
  }

  if (user.tipoUsuario === 'FUNCIONARIO') {
    const idProfissional = await resolverProfissionalId(user);
    if (existing.idProfissional !== idProfissional) {
      throw new HttpError('Você não pode cancelar agendamentos de outro profissional.', 403);
    }
  }

  const updated = await agendamentoModel.updateAgendamento(id, {
    data: existing.data,
    horario: existing.horario,
    status: 'CANCELADO',
    idServico: existing.idServico,
    idProfissional: existing.idProfissional
  });

  getIO().emit('agendamento:cancelled', updated);
  return updated;
}

async function addObservacao(id, observacao) {
  const existing = await agendamentoModel.findAgendamentoById(id);
  if (!existing) {
    throw new HttpError('Agendamento não encontrado.', 404);
  }

  return agendamentoModel.addObservacao({ idAgendamento: id, observacao });
}

async function addObservacaoComUsuario(id, observacao, user) {
  const existing = await agendamentoModel.findAgendamentoById(id);
  if (!existing) {
    throw new HttpError('Agendamento não encontrado.', 404);
  }

  if (user.tipoUsuario === 'FUNCIONARIO') {
    const idProfissional = await resolverProfissionalId(user);
    if (existing.idProfissional !== idProfissional) {
      throw new HttpError('Você não pode comentar agendamentos de outro profissional.', 403);
    }
  }

  return agendamentoModel.addObservacao({ idAgendamento: id, observacao });
}

async function sugestoes(data, idServico) {
  const profissionais = (await profissionalModel.listProfissionais()).filter((item) => item.status === 'ATIVO');
  const sugestoesDisponiveis = [];

  const diaSemana = getDayFromDate(data);
  const candidateSet = new Set();

  for (const profissional of profissionais) {
    const disponibilidades = await profissionalModel.listDisponibilidade(profissional.id);
    const slots = buildSlotsFromDisponibilidade(
      disponibilidades,
      diaSemana,
      Number(profissional.intervaloMinutos) || 60
    );

    slots.forEach((slot) => candidateSet.add(slot));
  }

  const horariosOrdenados = Array.from(candidateSet).sort();

  for (const horario of horariosOrdenados) {
    const disponivel = await escolherProfissionalDisponivel({ data, horario, idServico });
    if (disponivel) {
      sugestoesDisponiveis.push({
        horario,
        profissional: {
          id: disponivel.id,
          nome: disponivel.nome
        }
      });
    }
  }

  return {
    data,
    totalProfissionais: profissionais.length,
    sugestoes: sugestoesDisponiveis
  };
}

async function disponibilidadeDia({ data, idServico, idProfissional }) {
  if (!data) {
    throw new HttpError('A data é obrigatória para consulta de disponibilidade.', 400);
  }

  const allProfissionais = await profissionalModel.listProfissionais();
  let profissionais = allProfissionais.filter((item) => item.status === 'ATIVO');

  if (idProfissional) {
    profissionais = profissionais.filter((item) => item.id === Number(idProfissional));
  }

  const agendamentosDia = await agendamentoModel.listAgendamentos({ data });
  const agendaPorProfissional = [];

  for (const profissional of profissionais) {
    const servicosDoProfissional = await profissionalModel.listServicosDoProfissional(profissional.id);
    const disponibilidades = await profissionalModel.listDisponibilidade(profissional.id);

    if (idServico && !servicosDoProfissional.some((item) => item.id === Number(idServico))) {
      continue;
    }

    const diaSemana = getDayFromDate(data);
    const horariosDia = buildSlotsFromDisponibilidade(
      disponibilidades,
      diaSemana,
      Number(profissional.intervaloMinutos) || 60
    );

    const slots = horariosDia.map((horario) => {

      const reserva = agendamentosDia.find(
        (ag) => ag.idProfissional === profissional.id && ag.horario === horario && ag.status !== 'CANCELADO'
      );

      return {
        horario,
        status: reserva ? 'OCUPADO' : 'LIVRE',
        servicos: servicosDoProfissional,
        agendamento: reserva || null
      };
    });

    agendaPorProfissional.push({
      profissional,
      slots
    });
  }

  return {
    data,
    filtros: {
      idServico: idServico ? Number(idServico) : null,
      idProfissional: idProfissional ? Number(idProfissional) : null
    },
    agenda: agendaPorProfissional
  };
}

module.exports = {
  create,
  list,
  update,
  cancel,
  addObservacao,
  addObservacaoComUsuario,
  sugestoes,
  disponibilidadeDia
};
