const state = {
  token: localStorage.getItem('bg_token') || '',
  user: JSON.parse(localStorage.getItem('bg_user') || 'null'),
  selectedDate: new Date().toISOString().slice(0, 10),
  monthPointer: new Date(),
  currentTab: null,
  servicos: [],
  profissionais: [],
  selectedAdminProfissionalId: '',
  agendamentosDiaCache: [],
  socket: null
};

let funcionarioProfissionalCache = null;

const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const viewArea = document.getElementById('viewArea');
const roleTabs = document.getElementById('roleTabs');
const alertBox = document.getElementById('alert');
const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeSubtitle = document.getElementById('welcomeSubtitle');

function showAlert(message, type = 'info') {
  alertBox.classList.remove('hidden', 'info', 'success', 'warning', 'error');
  alertBox.classList.add(type);
  
  const icons = {
    info: 'fa-info-circle',
    success: 'fa-check-circle',
    warning: 'fa-exclamation-triangle',
    error: 'fa-times-circle'
  };
  
  alertBox.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
  
  // Auto-hide after 5 seconds for success messages
  if (type === 'success' || type === 'info') {
    setTimeout(() => clearAlert(), 5000);
  }
}

function clearAlert() {
  alertBox.classList.add('hidden');
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(`/api/v1${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Erro na requisição');
  }

  return data;
}

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('bg_token', token);
  localStorage.setItem('bg_user', JSON.stringify(user));
}

function clearSession() {
  state.token = '';
  state.user = null;
  localStorage.removeItem('bg_token');
  localStorage.removeItem('bg_user');
}

async function bootstrapData() {
  state.servicos = await api('/servicos');
  state.profissionais = await api('/profissionais');
}

function setupSocket() {
  if (state.socket) state.socket.disconnect();
  state.socket = io();
  ['agendamento:created', 'agendamento:updated', 'agendamento:cancelled'].forEach((eventName) => {
    state.socket.on(eventName, () => {
      showAlert('Agenda atualizada em tempo real.');
      renderCurrentTab();
    });
  });
}

function getTabsByRole() {
  const role = state.user?.tipoUsuario;
  if (role === 'CLIENTE') return [
    { name: 'Calendário', icon: 'fa-calendar-alt' },
    { name: 'Meus Agendamentos', icon: 'fa-list-check' }
  ];
  if (role === 'FUNCIONARIO') return [
    { name: 'Editar Perfil', icon: 'fa-user-edit' },
    { name: 'Meu Calendário', icon: 'fa-calendar-days' },
    { name: 'Agendamentos do Dia', icon: 'fa-clock' }
  ];
  return [
    { name: 'Dashboard', icon: 'fa-chart-line' },
    { name: 'Usuários', icon: 'fa-users' },
    { name: 'Profissionais', icon: 'fa-user-tie' },
    { name: 'Serviços', icon: 'fa-scissors' },
    { name: 'Reservas', icon: 'fa-calendar-check' },
    { name: 'Meu Calendário', icon: 'fa-calendar-days' }
  ];
}

function renderRoleTabs() {
  const tabs = getTabsByRole();
  const tabNames = tabs.map(t => t.name);
  if (!state.currentTab || !tabNames.includes(state.currentTab)) state.currentTab = tabs[0].name;

  roleTabs.innerHTML = tabs
    .map((tab) => `<button class="tab ${tab.name === state.currentTab ? 'active' : ''}" data-tab="${tab.name}"><i class="fas ${tab.icon}"></i> ${tab.name}</button>`)
    .join('');

  roleTabs.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.currentTab = btn.dataset.tab;
      clearAlert();
      renderRoleTabs();
      renderCurrentTab();
    });
  });
}

function formatDateDisplay(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR');
}

function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = '<div class="row row-between mb-2"><button class="btn btn-sm" id="prevMonth"><i class="fas fa-chevron-left"></i></button>';
  html += `<strong style="font-family: var(--font-display); font-size: 18px; color: var(--pink-700);">${date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>`;
  html += '<button class="btn btn-sm" id="nextMonth"><i class="fas fa-chevron-right"></i></button></div>';
  html += '<div class="calendar mt-2">';

  ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach((d) => {
    html += `<div class="calendar-header">${d}</div>`;
  });

  for (let i = 0; i < startWeekday; i += 1) {
    html += '<div class="day muted">-</div>';
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = new Date(year, month, day).toISOString().slice(0, 10);
    const selected = state.selectedDate === dateStr ? 'selected' : '';
    html += `<button class="day ${selected}" data-date="${dateStr}">${day}</button>`;
  }

  html += '</div>';
  return html;
}

function buildServiceOptions(includeAny = true) {
  const base = includeAny ? '<option value="">Todos os serviços</option>' : '';
  return base + state.servicos.map((s) => `<option value="${s.id}">${s.nome}</option>`).join('');
}

function buildProfessionalOptions(includeAny = true) {
  const base = includeAny ? '<option value="">Todos os profissionais</option>' : '';
  return base + state.profissionais.map((p) => `<option value="${p.id}">${p.nome}</option>`).join('');
}

async function renderClienteCalendario() {
  viewArea.innerHTML = `
    <div class="grid-2">
      <div class="card client-calendar-card">
        <h3><i class="fas fa-calendar-alt"></i> Calendário</h3>
        ${renderCalendar(state.monthPointer)}
      </div>
      <div class="card client-slots-card">
        <h3><i class="fas fa-clock"></i> Horários Disponíveis</h3>
        <p class="muted mb-2"><i class="fas fa-info-circle"></i> Data selecionada: ${formatDateDisplay(state.selectedDate)}</p>
        <div class="row mb-2 client-filters-row">
          <select id="filtroServico" style="flex:1">${buildServiceOptions()}</select>
          <select id="filtroProfissional" style="flex:1">${buildProfessionalOptions()}</select>
        </div>
        <div id="slotsWrap" class="muted"><i class="fas fa-hand-pointer"></i> Selecione um serviço para ver horários disponíveis.</div>
      </div>
    </div>
  `;

  bindCalendarControls();
  document.getElementById('filtroServico').addEventListener('change', loadDisponibilidadeCliente);
  document.getElementById('filtroProfissional').addEventListener('change', loadDisponibilidadeCliente);

  await loadDisponibilidadeCliente();
}

async function loadDisponibilidadeCliente() {
  const idServico = document.getElementById('filtroServico').value;
  const idProfissional = document.getElementById('filtroProfissional').value;

  const query = new URLSearchParams({ data: state.selectedDate });
  if (idServico) query.set('idServico', idServico);
  if (idProfissional) query.set('idProfissional', idProfissional);

  const data = await api(`/agendamentos/disponibilidade?${query.toString()}`);

  const html = data.agenda
    .map((item) => {
      const slots = item.slots
        .map((slot) => {
          const statusIcon = slot.status === 'LIVRE' ? 'fa-check-circle' : slot.status === 'OCUPADO' ? 'fa-times-circle' : 'fa-ban';
          const statusColor = slot.status === 'LIVRE' ? 'var(--success)' : slot.status === 'OCUPADO' ? 'var(--danger)' : 'var(--warning)';
          const btn = slot.status === 'LIVRE'
            ? `<button class="btn btn-primary btn-sm reservar-btn" data-profissional="${item.profissional.id}" data-horario="${slot.horario}"><i class="fas fa-calendar-plus"></i> Reservar</button>`
            : '';

          const servicos = slot.servicos.map((s) => s.nome).join(', ') || 'Sem serviços vinculados';
          return `
            <div class="slot ${slot.status}">
              <div class="row row-between">
                <strong><i class="fas ${statusIcon}" style="color:${statusColor}"></i> ${slot.horario.slice(0, 5)}</strong>
                <span class="badge badge-${slot.status === 'LIVRE' ? 'success' : slot.status === 'OCUPADO' ? 'danger' : 'warning'}">${slot.status}</span>
              </div>
              <div class="muted mt-1"><i class="fas fa-cut"></i> ${servicos}</div>
              ${btn ? `<div class="mt-1">${btn}</div>` : ''}
            </div>
          `;
        })
        .join('');

      return `<div class="card mt-2"><h4><i class="fas fa-user-tie" style="color:var(--pink-500)"></i> ${item.profissional.nome}</h4>${slots}</div>`;
    })
    .join('');

  const wrap = document.getElementById('slotsWrap');
  wrap.classList.remove('muted');
  wrap.innerHTML = html || '<div class="muted text-center mt-2"><i class="fas fa-search"></i> Nenhum horário encontrado com os filtros atuais.</div>';

  wrap.querySelectorAll('.reservar-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const selectedServico = document.getElementById('filtroServico').value;
      if (!selectedServico) {
        showAlert('Selecione um serviço para reservar.', 'error');
        return;
      }

      await api('/agendamentos', {
        method: 'POST',
        body: JSON.stringify({
          data: state.selectedDate,
          horario: btn.dataset.horario,
          idServico: Number(selectedServico),
          idProfissional: Number(btn.dataset.profissional)
        })
      });

      showAlert('Reserva criada com sucesso!', 'success');
      await loadDisponibilidadeCliente();
    });
  });
}

async function renderMeusAgendamentos() {
  const list = await api('/agendamentos');
  
  const getStatusBadge = (status) => {
    const badges = {
      'CONFIRMADO': '<span class="badge badge-success"><i class="fas fa-check"></i> Confirmado</span>',
      'CONCLUIDO': '<span class="badge badge-pink"><i class="fas fa-star"></i> Concluído</span>',
      'CANCELADO': '<span class="badge badge-danger"><i class="fas fa-times"></i> Cancelado</span>'
    };
    return badges[status] || `<span class="badge">${status}</span>`;
  };

  viewArea.innerHTML = `
    <div class="card">
      <h3><i class="fas fa-list-check"></i> Meus Agendamentos</h3>
      ${list.length === 0 ? '<p class="muted text-center mt-2"><i class="fas fa-inbox"></i> Você ainda não possui agendamentos.</p>' : `
      <div class="table-wrap mt-2">
        <table class="table">
          <thead>
            <tr>
              <th><i class="fas fa-calendar"></i> Data</th>
              <th><i class="fas fa-clock"></i> Horário</th>
              <th><i class="fas fa-cut"></i> Serviço</th>
              <th><i class="fas fa-user"></i> Profissional</th>
              <th><i class="fas fa-info-circle"></i> Status</th>
              <th><i class="fas fa-cog"></i> Ação</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((a) => `
              <tr>
                <td>${formatDateDisplay(a.data)}</td>
                <td>${String(a.horario).slice(0, 5)}</td>
                <td>${a.nomeServico}</td>
                <td>${a.nomeProfissional}</td>
                <td>${getStatusBadge(a.status)}</td>
                <td>${a.status !== 'CANCELADO' ? `<button class="btn btn-danger btn-sm cancelar-cli" data-id="${a.id}"><i class="fas fa-times"></i> Cancelar</button>` : '<span class="muted">-</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `}
    </div>
  `;

  viewArea.querySelectorAll('.cancelar-cli').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
        await api(`/agendamentos/${btn.dataset.id}/cancelar`, { method: 'PATCH' });
        showAlert('Agendamento cancelado com sucesso!', 'success');
        renderMeusAgendamentos();
      }
    });
  });
}

async function renderFuncionarioPerfil() {
  try {
    funcionarioProfissionalCache = await api('/profissionais/me');
  } catch {
    funcionarioProfissionalCache = null;
  }

  viewArea.innerHTML = `
    <div class="card">
      <h3><i class="fas fa-user-edit"></i> Meu Perfil</h3>
      <div class="grid-2 mt-2">
        <div class="card" style="background: var(--pink-50);">
          <h4><i class="fas fa-user" style="color:var(--pink-500)"></i> Dados Pessoais</h4>
          <p class="mt-1"><strong>Nome:</strong> ${state.user.nome}</p>
          <p class="mt-1"><strong>E-mail:</strong> ${state.user.email}</p>
          <p class="mt-1"><strong>Perfil:</strong> <span class="badge badge-pink">${state.user.tipoUsuario}</span></p>
        </div>
        <div class="card" style="background: var(--pink-50);">
          <h4><i class="fas fa-briefcase" style="color:var(--pink-500)"></i> Vínculo Profissional</h4>
          ${funcionarioProfissionalCache ? `
            <p class="mt-1"><strong>Profissional:</strong> ${funcionarioProfissionalCache.nome}</p>
            <p class="mt-1"><strong>Especialidade:</strong> ${funcionarioProfissionalCache.especialidade}</p>
            <p class="mt-1"><strong>Status:</strong> <span class="badge badge-success">${funcionarioProfissionalCache.status}</span></p>
          ` : `
            <p class="muted mt-1"><i class="fas fa-exclamation-triangle"></i> Não vinculado a nenhum profissional.</p>
            <p class="muted">Entre em contato com um administrador.</p>
          `}
        </div>
      </div>
    </div>
  `;
}

async function renderFuncionarioCalendario() {
  if (state.user?.tipoUsuario === 'ADMINISTRADOR') {
    return renderAdminCalendario();
  }

  let info;

  try {
    info = await api('/profissionais/me');
    funcionarioProfissionalCache = info;
  } catch (error) {
    viewArea.innerHTML = `
      <div class="card">
        <h3><i class="fas fa-calendar-days"></i> Meu Calendário</h3>
        <div class="mt-2" style="text-align:center; padding: 40px;">
          <i class="fas fa-unlink" style="font-size:48px; color:var(--gray-300)"></i>
          <p class="muted mt-2">${error.message}</p>
          <p class="muted">Peça para um administrador vincular este usuário a um profissional.</p>
        </div>
      </div>
    `;
    return;
  }

  viewArea.innerHTML = `
    <div class="card">
      <h3><i class="fas fa-calendar-days"></i> Meu Calendário</h3>
      <div class="row mt-2">
        <input id="funcDia" type="date" value="${state.selectedDate}" style="flex:1" />
        <button class="btn btn-primary" id="funcAtualizar"><i class="fas fa-sync"></i> Atualizar</button>
      </div>
      <div class="card mt-2" style="background:var(--pink-50)">
        <h4><i class="fas fa-sliders" style="color:var(--pink-500)"></i> Configurar Agenda de Atendimento</h4>
        <div class="row mt-2">
          <label style="min-width: 220px; display:flex; align-items:center; gap:8px;"><strong>Intervalo entre atendimentos (min)</strong></label>
          <input id="intervaloMinutos" type="number" min="1" max="1439" value="${info.intervaloMinutos || 60}" style="max-width:180px" />
        </div>
        <div class="row mt-2">
          <select id="diaSemana" style="flex:1">
            <option value="0">Domingo</option>
            <option value="1">Segunda</option>
            <option value="2">Terça</option>
            <option value="3">Quarta</option>
            <option value="4">Quinta</option>
            <option value="5">Sexta</option>
            <option value="6">Sábado</option>
          </select>
          <input id="horaInicio" type="time" min="00:00" max="23:59" step="60" style="flex:1" />
          <input id="horaFim" type="time" min="00:00" max="23:59" step="60" style="flex:1" />
          <button class="btn" id="addFaixa"><i class="fas fa-plus"></i> Adicionar faixa</button>
        </div>
        <div id="listaFaixas" class="mt-2"></div>
        <div class="row mt-2">
          <button class="btn btn-primary" id="salvarAgenda"><i class="fas fa-save"></i> Salvar agenda</button>
        </div>
      </div>
      <div id="funcCalendarSlots" class="mt-2"></div>
    </div>
  `;

  let disponibilidadeDraft = Array.isArray(info.disponibilidades) ? [...info.disponibilidades] : [];

  function renderDraftDisponibilidades() {
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const html = disponibilidadeDraft.length
      ? disponibilidadeDraft
          .map((item, index) => `
            <div class="row row-between mt-1" style="padding:10px 12px; border:1px solid var(--gray-200); border-radius: var(--radius); background: var(--white);">
              <span><strong>${diasSemana[item.diaSemana]}</strong> • ${String(item.horarioInicio).slice(0, 5)} - ${String(item.horarioFim).slice(0, 5)}</span>
              <button class="btn btn-danger btn-sm rem-faixa" data-index="${index}"><i class="fas fa-trash"></i></button>
            </div>
          `)
          .join('')
      : '<p class="muted"><i class="fas fa-info-circle"></i> Nenhuma faixa cadastrada.</p>';

    document.getElementById('listaFaixas').innerHTML = html;
    document.querySelectorAll('.rem-faixa').forEach((btn) => {
      btn.addEventListener('click', () => {
        disponibilidadeDraft = disponibilidadeDraft.filter((_, idx) => idx !== Number(btn.dataset.index));
        renderDraftDisponibilidades();
      });
    });
  }

  async function loadFuncionarioCalendario() {
    const selectedDate = document.getElementById('funcDia').value;
    state.selectedDate = selectedDate;
    const disponibilidadeDia = await api(
      `/agendamentos/disponibilidade?data=${selectedDate}&idProfissional=${info.id}`
    );

    const servicos = info.servicos.map((s) => `<span class="badge badge-pink">${s.nome}</span>`).join(' ') || '<span class="muted">Nenhum serviço vinculado</span>';
    
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const disponibilidade = info.disponibilidades
      .map((d) => `<div class="row mt-1"><span class="badge">${diasSemana[d.diaSemana]}</span> ${String(d.horarioInicio).slice(0, 5)} - ${String(d.horarioFim).slice(0, 5)}</div>`)
      .join('') || '<span class="muted">Sem disponibilidade configurada</span>';

    const slots = disponibilidadeDia.agenda?.[0]?.slots || [];
    const slotsHtml = slots.map((slot) => {
      const statusIcon = slot.status === 'LIVRE' ? 'fa-check-circle' : slot.status === 'OCUPADO' ? 'fa-times-circle' : 'fa-ban';
      const statusColor = slot.status === 'LIVRE' ? 'var(--success)' : slot.status === 'OCUPADO' ? 'var(--danger)' : 'var(--warning)';
      return `
        <div class="slot ${slot.status}">
          <strong><i class="fas ${statusIcon}" style="color:${statusColor}"></i> ${slot.horario.slice(0, 5)}</strong>
          <span class="badge badge-${slot.status === 'LIVRE' ? 'success' : slot.status === 'OCUPADO' ? 'danger' : 'warning'}" style="margin-left:8px">${slot.status}</span>
        </div>
      `;
    }).join('') || '<div class="muted text-center"><i class="fas fa-calendar-xmark"></i> Nenhum slot para o dia.</div>';

    document.getElementById('funcCalendarSlots').innerHTML = `
      <div class="grid-2">
        <div class="card" style="background:var(--pink-50)">
          <h4><i class="fas fa-user-tie" style="color:var(--pink-500)"></i> ${info.nome}</h4>
          <p class="muted">${info.especialidade}</p>
          <div class="mt-2"><strong>Serviços:</strong><br>${servicos}</div>
        </div>
        <div class="card" style="background:var(--pink-50)">
          <h4><i class="fas fa-clock" style="color:var(--pink-500)"></i> Disponibilidade</h4>
          ${disponibilidade}
        </div>
      </div>
      <div class="card mt-2">
        <h4><i class="fas fa-calendar-check" style="color:var(--pink-500)"></i> Horários do Dia</h4>
        ${slotsHtml}
      </div>
    `;
  }

  document.getElementById('addFaixa').addEventListener('click', () => {
    const diaSemana = Number(document.getElementById('diaSemana').value);
    const horarioInicio = document.getElementById('horaInicio').value;
    const horarioFim = document.getElementById('horaFim').value;

    if (!horarioInicio || !horarioFim) {
      showAlert('Informe horário inicial e final da faixa.', 'warning');
      return;
    }

    if (horarioFim <= horarioInicio) {
      showAlert('O horário final precisa ser maior que o inicial.', 'error');
      return;
    }

    disponibilidadeDraft.push({
      diaSemana,
      horarioInicio: `${horarioInicio}:00`,
      horarioFim: `${horarioFim}:00`
    });
    renderDraftDisponibilidades();
  });

  document.getElementById('salvarAgenda').addEventListener('click', async () => {
    try {
      const intervaloMinutos = Number(document.getElementById('intervaloMinutos').value);
      await api('/profissionais/me/disponibilidade', {
        method: 'PATCH',
        body: JSON.stringify({
          intervaloMinutos,
          disponibilidades: disponibilidadeDraft
        })
      });
      showAlert('Agenda atualizada com sucesso!', 'success');
      info = await api('/profissionais/me');
      funcionarioProfissionalCache = info;
      disponibilidadeDraft = Array.isArray(info.disponibilidades) ? [...info.disponibilidades] : [];
      renderDraftDisponibilidades();
      await loadFuncionarioCalendario();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  });

  document.getElementById('funcAtualizar').addEventListener('click', loadFuncionarioCalendario);
  renderDraftDisponibilidades();
  await loadFuncionarioCalendario();
}

async function renderAdminCalendario() {
  if (!state.profissionais.length) {
    await bootstrapData();
  }

  const profissionaisAtivos = state.profissionais.filter((item) => item.status === 'ATIVO');
  const selectedId = state.selectedAdminProfissionalId || String(profissionaisAtivos[0]?.id || '');
  state.selectedAdminProfissionalId = selectedId;

  viewArea.innerHTML = `
    <div class="card">
      <h3><i class="fas fa-calendar-days"></i> Agenda dos Profissionais</h3>
      <div class="row mt-2">
        <select id="adminProfissional" style="flex:1">
          ${profissionaisAtivos.map((p) => `<option value="${p.id}" ${String(p.id) === selectedId ? 'selected' : ''}>${p.nome}</option>`).join('')}
        </select>
        <input id="adminDia" type="date" value="${state.selectedDate}" style="flex:1" />
        <button class="btn btn-primary" id="adminAtualizar"><i class="fas fa-search"></i> Ver agenda</button>
      </div>
      <div id="adminCalendarSlots" class="mt-2"></div>
    </div>
  `;

  async function loadAdminCalendario() {
    const selectedDate = document.getElementById('adminDia').value;
    const idProfissional = Number(document.getElementById('adminProfissional').value);
    state.selectedDate = selectedDate;
    state.selectedAdminProfissionalId = String(idProfissional);

    const [info, disponibilidadeDia, agendamentosDia] = await Promise.all([
      api(`/profissionais/${idProfissional}`),
      api(`/agendamentos/disponibilidade?data=${selectedDate}&idProfissional=${idProfissional}`),
      api(`/agendamentos?data=${selectedDate}&idProfissional=${idProfissional}`)
    ]);

    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const disponibilidade = info.disponibilidades
      .map((d) => `<div class="row mt-1"><span class="badge">${diasSemana[d.diaSemana]}</span> ${String(d.horarioInicio).slice(0, 5)} - ${String(d.horarioFim).slice(0, 5)}</div>`)
      .join('') || '<span class="muted">Sem disponibilidade configurada</span>';

    const slots = disponibilidadeDia.agenda?.[0]?.slots || [];
    const slotsHtml = slots.map((slot) => {
      const statusIcon = slot.status === 'LIVRE' ? 'fa-check-circle' : slot.status === 'OCUPADO' ? 'fa-times-circle' : 'fa-ban';
      const statusColor = slot.status === 'LIVRE' ? 'var(--success)' : slot.status === 'OCUPADO' ? 'var(--danger)' : 'var(--warning)';
      return `
        <div class="slot ${slot.status}">
          <strong><i class="fas ${statusIcon}" style="color:${statusColor}"></i> ${slot.horario.slice(0, 5)}</strong>
          <span class="badge badge-${slot.status === 'LIVRE' ? 'success' : slot.status === 'OCUPADO' ? 'danger' : 'warning'}" style="margin-left:8px">${slot.status}</span>
        </div>
      `;
    }).join('') || '<div class="muted text-center"><i class="fas fa-calendar-xmark"></i> Nenhum slot para o dia.</div>';

    const tabelaAgendamentos = agendamentosDia.length
      ? `
        <div class="table-wrap mt-2">
          <table class="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Horário</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${agendamentosDia.map((a) => `
                <tr>
                  <td>${a.nomeCliente}</td>
                  <td>${a.nomeServico}</td>
                  <td>${String(a.horario).slice(0, 5)}</td>
                  <td>${a.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
      : '<p class="muted mt-2"><i class="fas fa-info-circle"></i> Sem agendamentos para este dia.</p>';

    document.getElementById('adminCalendarSlots').innerHTML = `
      <div class="grid-2">
        <div class="card" style="background:var(--pink-50)">
          <h4><i class="fas fa-user-tie" style="color:var(--pink-500)"></i> ${info.nome}</h4>
          <p class="muted">${info.especialidade}</p>
          <p class="mt-1"><strong>Intervalo:</strong> ${info.intervaloMinutos || 60} min</p>
          <div class="mt-2"><strong>Disponibilidade semanal</strong><br>${disponibilidade}</div>
        </div>
        <div class="card" style="background:var(--pink-50)">
          <h4><i class="fas fa-calendar-check" style="color:var(--pink-500)"></i> Horários do Dia</h4>
          ${slotsHtml}
        </div>
      </div>
      <div class="card mt-2">
        <h4><i class="fas fa-list" style="color:var(--pink-500)"></i> Agendamentos do Funcionário</h4>
        ${tabelaAgendamentos}
      </div>
    `;
  }

  document.getElementById('adminAtualizar').addEventListener('click', loadAdminCalendario);
  await loadAdminCalendario();
}

async function renderAgendamentosDia() {
  let profissional;
  try {
    profissional = await api('/profissionais/me');
    funcionarioProfissionalCache = profissional;
  } catch (error) {
    viewArea.innerHTML = `
      <div class="card">
        <h3><i class="fas fa-clock"></i> Agendamentos do Dia</h3>
        <div class="mt-2" style="text-align:center; padding: 40px;">
          <i class="fas fa-unlink" style="font-size:48px; color:var(--gray-300)"></i>
          <p class="muted mt-2">${error.message}</p>
        </div>
      </div>
    `;
    return;
  }

  viewArea.innerHTML = `
    <div class="card">
      <h3><i class="fas fa-clock"></i> Agendamentos do Dia</h3>
      <div class="row mt-2">
        <input id="diaRef" type="date" value="${state.selectedDate}" style="flex:1" />
        <span class="badge badge-pink"><i class="fas fa-user-tie"></i> ${profissional.nome}</span>
        <button class="btn btn-primary" id="buscarDia"><i class="fas fa-search"></i> Buscar</button>
      </div>
      <div id="diaTable" class="mt-2"></div>
    </div>
  `;

  document.getElementById('buscarDia').addEventListener('click', loadAgendamentosDia);
  await loadAgendamentosDia();
}

async function loadAgendamentosDia() {
  const data = document.getElementById('diaRef').value;
  state.selectedDate = data;
  const query = new URLSearchParams({ data });
  const list = await api(`/agendamentos?${query.toString()}`);
  state.agendamentosDiaCache = list;

  const getStatusBadge = (status) => {
    const badges = {
      'CONFIRMADO': '<span class="badge badge-success"><i class="fas fa-check"></i> Confirmado</span>',
      'CONCLUIDO': '<span class="badge badge-pink"><i class="fas fa-star"></i> Concluído</span>',
      'CANCELADO': '<span class="badge badge-danger"><i class="fas fa-times"></i> Cancelado</span>'
    };
    return badges[status] || `<span class="badge">${status}</span>`;
  };

  document.getElementById('diaTable').innerHTML = list.length === 0 
    ? '<div class="muted text-center mt-2"><i class="fas fa-calendar-xmark"></i> Nenhum agendamento para este dia.</div>'
    : `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th><i class="fas fa-user"></i> Cliente</th>
            <th><i class="fas fa-cut"></i> Serviço</th>
            <th><i class="fas fa-clock"></i> Horário</th>
            <th><i class="fas fa-info-circle"></i> Status</th>
            <th><i class="fas fa-cog"></i> Ações</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((a) => `
            <tr>
              <td>${a.nomeCliente}</td>
              <td>${a.nomeServico}</td>
              <td><strong>${String(a.horario).slice(0, 5)}</strong></td>
              <td>${getStatusBadge(a.status)}</td>
              <td>
                <div class="row">
                  ${a.status === 'CONFIRMADO' ? `
                    <button class="btn btn-success btn-sm presente" data-id="${a.id}"><i class="fas fa-check"></i> Presença</button>
                    <button class="btn btn-danger btn-sm cancelar" data-id="${a.id}"><i class="fas fa-times"></i> Cancelar</button>
                  ` : '<span class="muted">Sem ações</span>'}
                  <button class="btn btn-sm obs" data-id="${a.id}"><i class="fas fa-comment"></i> Obs</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll('.presente').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await updateStatus(btn.dataset.id, 'CONCLUIDO');
      } catch (error) {
        showAlert(error.message, 'error');
      }
    });
  });

  document.querySelectorAll('.cancelar').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/agendamentos/${btn.dataset.id}/cancelar`, { method: 'PATCH' });
        showAlert('Reserva cancelada.', 'success');
        await loadAgendamentosDia();
      } catch (error) {
        showAlert(error.message, 'error');
      }
    });
  });

  document.querySelectorAll('.obs').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const observacao = window.prompt('Digite a observação:');
      if (!observacao) return;
      try {
        await api(`/agendamentos/${btn.dataset.id}/observacoes`, {
          method: 'POST',
          body: JSON.stringify({ observacao })
        });
        showAlert('Observação registrada.', 'success');
      } catch (error) {
        showAlert(error.message, 'error');
      }
    });
  });
}

async function updateStatus(id, status) {
  const existing = state.agendamentosDiaCache.find((a) => a.id === Number(id));
  if (!existing) return;

  await api(`/agendamentos/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      data: existing.data,
      horario: existing.horario,
      status,
      idServico: existing.idServico,
      idProfissional: existing.idProfissional
    })
  });

  showAlert('Status atualizado.', 'success');
  await loadAgendamentosDia();
}

async function renderDashboard() {
  const resumo = await api('/dashboard/resumo');
  viewArea.innerHTML = `
    <div class="card mb-2">
      <h3><i class="fas fa-chart-line"></i> Dashboard</h3>
      <p class="muted">Visão geral dos agendamentos do salão</p>
    </div>
    <div class="grid-4">
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--pink-100); color: var(--pink-600);">
          <i class="fas fa-calendar-check"></i>
        </div>
        <div class="stat-value">${resumo.indicadores.total}</div>
        <div class="stat-label">Total de Reservas</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--success-light); color: var(--success);">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-value">${resumo.indicadores.confirmados}</div>
        <div class="stat-label">Confirmados</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--info-light); color: var(--info);">
          <i class="fas fa-star"></i>
        </div>
        <div class="stat-value">${resumo.indicadores.concluidos}</div>
        <div class="stat-label">Concluídos</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--danger-light); color: var(--danger);">
          <i class="fas fa-times-circle"></i>
        </div>
        <div class="stat-value">${resumo.indicadores.cancelados}</div>
        <div class="stat-label">Cancelados</div>
      </div>
    </div>
    <div class="card mt-2">
      <h3><i class="fas fa-chart-pie"></i> Relatório</h3>
      <div class="row mt-2">
        <div class="card" style="flex:1; background: ${resumo.indicadores.taxaCancelamento > 20 ? 'var(--danger-light)' : 'var(--success-light)'}; text-align:center;">
          <p class="muted">Taxa de Cancelamento</p>
          <p style="font-size:32px; font-weight:bold; color: ${resumo.indicadores.taxaCancelamento > 20 ? 'var(--danger)' : 'var(--success)'};">${resumo.indicadores.taxaCancelamento}%</p>
        </div>
      </div>
      <p class="muted mt-2"><i class="fas fa-info-circle"></i> Este painel mostra métricas gerais. Filtre por data e profissional para relatórios detalhados.</p>
    </div>
  `;
}

async function renderAdminServicos() {
  viewArea.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <h3><i class="fas fa-plus-circle"></i> Novo Serviço</h3>
        <form id="svcForm" class="form mt-2">
          <div class="input-group">
            <i class="fas fa-tag"></i>
            <input name="nome" placeholder="Nome do serviço" required />
          </div>
          <div class="input-group">
            <i class="fas fa-align-left"></i>
            <input name="descricao" placeholder="Descrição" required />
          </div>
          <div class="input-group">
            <i class="fas fa-clock"></i>
            <input name="duracaoMinutos" type="number" placeholder="Duração (minutos)" required />
          </div>
          <div class="input-group">
            <i class="fas fa-dollar-sign"></i>
            <input name="preco" type="number" step="0.01" placeholder="Preço (R$)" required />
          </div>
          <button class="btn btn-primary btn-block" type="submit"><i class="fas fa-save"></i> Salvar Serviço</button>
        </form>
      </div>
      <div class="card" id="svcList"></div>
    </div>
  `;

  document.getElementById('svcForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api('/servicos', {
      method: 'POST',
      body: JSON.stringify({
        nome: fd.get('nome'),
        descricao: fd.get('descricao'),
        duracaoMinutos: Number(fd.get('duracaoMinutos')),
        preco: Number(fd.get('preco'))
      })
    });
    showAlert('Serviço criado com sucesso!', 'success');
    e.target.reset();
    await bootstrapData();
    renderAdminServicos();
  });

  document.getElementById('svcList').innerHTML = `
    <h3><i class="fas fa-scissors"></i> Serviços Cadastrados</h3>
    ${state.servicos.length === 0 ? '<p class="muted text-center mt-2"><i class="fas fa-inbox"></i> Nenhum serviço cadastrado.</p>' : `
    <div class="table-wrap mt-2">
      <table class="table">
        <thead>
          <tr>
            <th><i class="fas fa-tag"></i> Nome</th>
            <th><i class="fas fa-clock"></i> Duração</th>
            <th><i class="fas fa-dollar-sign"></i> Preço</th>
            <th><i class="fas fa-cog"></i> Ação</th>
          </tr>
        </thead>
        <tbody>${state.servicos.map((s) => `
          <tr>
            <td><strong>${s.nome}</strong><br><small class="muted">${s.descricao}</small></td>
            <td><span class="badge">${s.duracaoMinutos} min</span></td>
            <td><strong style="color:var(--success)">R$ ${Number(s.preco).toFixed(2)}</strong></td>
            <td><button class="btn btn-danger btn-sm del-svc" data-id="${s.id}"><i class="fas fa-trash"></i></button></td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
    `}
  `;

  document.querySelectorAll('.del-svc').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (confirm('Tem certeza que deseja excluir este serviço?')) {
        await api(`/servicos/${btn.dataset.id}`, { method: 'DELETE' });
        showAlert('Serviço removido.', 'success');
        await bootstrapData();
        renderAdminServicos();
      }
    });
  });
}

async function renderAdminProfissionais() {
  let profissionalSelecionadoDetalhe = null;

  viewArea.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <h3><i class="fas fa-user-plus"></i> Novo Profissional</h3>
        <form id="profForm" class="form mt-2">
          <div class="input-group">
            <i class="fas fa-id-badge"></i>
            <input name="idUsuario" type="number" placeholder="ID do Usuário Funcionário (opcional)" />
          </div>
          <div class="input-group">
            <i class="fas fa-user"></i>
            <input name="nome" placeholder="Nome completo" required />
          </div>
          <div class="input-group">
            <i class="fas fa-star"></i>
            <input name="especialidade" placeholder="Especialidade" required />
          </div>
          <div class="input-group">
            <i class="fas fa-phone"></i>
            <input name="telefone" placeholder="Telefone" required />
          </div>
          <div class="input-group">
            <i class="fas fa-hourglass-half"></i>
            <input name="intervaloMinutos" type="number" min="1" max="1439" value="60" placeholder="Intervalo entre atendimentos (min)" required />
          </div>
          <div class="input-group">
            <i class="fas fa-toggle-on"></i>
            <select name="status">
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </div>
          <button class="btn btn-primary btn-block" type="submit"><i class="fas fa-save"></i> Salvar Profissional</button>
        </form>
      </div>
      <div class="card" id="profList"></div>
    </div>
  `;

  document.getElementById('profForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(e.target);
      await api('/profissionais', {
        method: 'POST',
        body: JSON.stringify({
          idUsuario: fd.get('idUsuario') ? Number(fd.get('idUsuario')) : null,
          nome: fd.get('nome'),
          especialidade: fd.get('especialidade'),
          telefone: fd.get('telefone'),
          intervaloMinutos: Number(fd.get('intervaloMinutos')),
          status: fd.get('status')
        })
      });
      showAlert('Profissional criado com sucesso!', 'success');
      e.target.reset();
      await bootstrapData();
      renderAdminProfissionais();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  });

  document.getElementById('profList').innerHTML = `
    <h3><i class="fas fa-user-tie"></i> Profissionais Cadastrados</h3>
    ${state.profissionais.length === 0 ? '<p class="muted text-center mt-2"><i class="fas fa-inbox"></i> Nenhum profissional cadastrado.</p>' : `
    <div class="table-wrap mt-2">
      <table class="table">
        <thead>
          <tr>
            <th><i class="fas fa-user"></i> Nome</th>
            <th><i class="fas fa-link"></i> Usuário</th>
            <th><i class="fas fa-star"></i> Especialidade</th>
            <th><i class="fas fa-hourglass-half"></i> Intervalo</th>
            <th><i class="fas fa-toggle-on"></i> Status</th>
            <th><i class="fas fa-cog"></i> Ação</th>
          </tr>
        </thead>
        <tbody>${state.profissionais.map((p) => `
          <tr>
            <td><strong>${p.nome}</strong></td>
            <td>${p.idUsuario ? `<span class="badge badge-pink">ID: ${p.idUsuario}</span>` : '<span class="muted">-</span>'}</td>
            <td>${p.especialidade}</td>
            <td><span class="badge">${p.intervaloMinutos || 60} min</span></td>
            <td><span class="badge badge-${p.status === 'ATIVO' ? 'success' : 'warning'}">${p.status}</span></td>
            <td><button class="btn btn-danger btn-sm del-prof" data-id="${p.id}"><i class="fas fa-trash"></i></button></td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
    `}
    <div class="card mt-2">
      <h3><i class="fas fa-link"></i> Serviços por Funcionário</h3>
      ${state.profissionais.length === 0
        ? '<p class="muted mt-2">Cadastre um profissional para vincular serviços.</p>'
        : `
      <div class="row mt-2">
        <select id="profServicoTarget" style="flex:1">
          <option value="">Selecione um profissional</option>
          ${state.profissionais.map((p) => `<option value="${p.id}">${p.nome}${p.idUsuario ? ` (ID usuário ${p.idUsuario})` : ''}</option>`).join('')}
        </select>
        <button class="btn" id="carregarServicosProf" type="button"><i class="fas fa-rotate"></i> Carregar</button>
      </div>
      <form id="profServicosForm" class="mt-2">
        <div id="profServicosChecks" class="service-checklist muted">Selecione um profissional e clique em carregar.</div>
        <button class="btn btn-primary mt-2" id="salvarServicosProf" type="submit" disabled><i class="fas fa-save"></i> Salvar serviços</button>
      </form>
      `}
    </div>
  `;

  document.querySelectorAll('.del-prof').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (confirm('Tem certeza que deseja excluir este profissional?')) {
        await api(`/profissionais/${btn.dataset.id}`, { method: 'DELETE' });
        showAlert('Profissional removido.', 'success');
        await bootstrapData();
        renderAdminProfissionais();
      }
    });
  });

  if (!state.profissionais.length) {
    return;
  }

  const profTarget = document.getElementById('profServicoTarget');
  const carregarBtn = document.getElementById('carregarServicosProf');
  const checksWrap = document.getElementById('profServicosChecks');
  const salvarBtn = document.getElementById('salvarServicosProf');

  async function carregarServicosDoProfissional() {
    const idProfissional = Number(profTarget.value);
    if (!idProfissional) {
      showAlert('Selecione um profissional.', 'warning');
      return;
    }

    try {
      const detalhe = await api(`/profissionais/${idProfissional}`);
      profissionalSelecionadoDetalhe = detalhe;
      const idsMarcados = new Set((detalhe.servicos || []).map((s) => Number(s.id)));

      if (!state.servicos.length) {
        checksWrap.classList.add('muted');
        checksWrap.innerHTML = 'Nenhum serviço cadastrado no sistema.';
        salvarBtn.disabled = true;
        return;
      }

      checksWrap.classList.remove('muted');
      checksWrap.innerHTML = state.servicos
        .map((s) => `
          <label class="service-item">
            <input type="checkbox" name="idsServicos" value="${s.id}" ${idsMarcados.has(Number(s.id)) ? 'checked' : ''} />
            <span>${s.nome}</span>
          </label>
        `)
        .join('');

      salvarBtn.disabled = false;
    } catch (error) {
      showAlert(error.message, 'error');
    }
  }

  carregarBtn.addEventListener('click', carregarServicosDoProfissional);

  document.getElementById('profServicosForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!profissionalSelecionadoDetalhe) {
      showAlert('Carregue um profissional antes de salvar.', 'warning');
      return;
    }

    const idsServicos = Array.from(
      checksWrap.querySelectorAll('input[name="idsServicos"]:checked')
    ).map((input) => Number(input.value));

    try {
      await api(`/profissionais/${profissionalSelecionadoDetalhe.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          idUsuario: profissionalSelecionadoDetalhe.idUsuario || null,
          nome: profissionalSelecionadoDetalhe.nome,
          especialidade: profissionalSelecionadoDetalhe.especialidade || 'Geral',
          telefone: profissionalSelecionadoDetalhe.telefone,
          intervaloMinutos: profissionalSelecionadoDetalhe.intervaloMinutos || 60,
          status: profissionalSelecionadoDetalhe.status || 'ATIVO',
          idsServicos
        })
      });

      showAlert('Serviços do profissional atualizados.', 'success');
      await bootstrapData();
      await renderAdminProfissionais();
      document.getElementById('profServicoTarget').value = String(profissionalSelecionadoDetalhe.id);
      document.getElementById('carregarServicosProf').click();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  });
}

async function renderAdminUsuarios() {
  const users = await api('/usuarios');

  viewArea.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <h3><i class="fas fa-user-cog"></i> Editar Usuário</h3>
        <form id="userEditForm" class="form mt-2">
          <div class="input-group">
            <i class="fas fa-users"></i>
            <select id="usuarioSelect" required>
              <option value="">Selecione um usuário</option>
              ${users.map((user) => `<option value="${user.id}">${user.nome} • ${user.email}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <i class="fas fa-user"></i>
            <input name="nome" id="usrNome" placeholder="Nome completo" required />
          </div>
          <div class="input-group">
            <i class="fas fa-envelope"></i>
            <input name="email" id="usrEmail" type="email" placeholder="E-mail" required />
          </div>
          <div class="input-group">
            <i class="fas fa-user-tag"></i>
            <select name="tipoUsuario" id="usrTipo" required>
              <option value="CLIENTE">CLIENTE</option>
              <option value="FUNCIONARIO">FUNCIONARIO</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
            </select>
          </div>
          <div class="input-group">
            <i class="fas fa-phone"></i>
            <input name="telefone" id="usrTelefone" placeholder="Telefone (obrigatório para cliente)" />
          </div>
          <div class="input-group">
            <i class="fas fa-lock"></i>
            <input name="senha" id="usrSenha" type="password" minlength="6" placeholder="Nova senha (opcional)" />
          </div>
          <button class="btn btn-primary btn-block" type="submit"><i class="fas fa-save"></i> Salvar Alterações</button>
        </form>
      </div>
      <div class="card">
        <h3><i class="fas fa-list"></i> Usuários do Sistema</h3>
        ${users.length === 0 ? '<p class="muted text-center mt-2"><i class="fas fa-inbox"></i> Nenhum usuário encontrado.</p>' : `
        <div class="table-wrap mt-2">
          <table class="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Função</th>
                <th>Dados</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              ${users.map((user) => `
                <tr>
                  <td><strong>${user.nome}</strong></td>
                  <td>${user.email}</td>
                  <td><span class="badge badge-pink">${user.tipoUsuario}</span></td>
                  <td>
                    ${user.telefoneCliente ? `<small class="muted">Tel: ${user.telefoneCliente}</small><br>` : ''}
                    ${user.nomeProfissional ? `<small class="muted">Profissional: ${user.nomeProfissional}</small>` : '<small class="muted">-</small>'}
                  </td>
                  <td>
                    <button class="btn btn-sm btn-primary sel-user" data-id="${user.id}"><i class="fas fa-pen"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        `}
      </div>
    </div>
  `;

  function fillFormByUser(id) {
    const target = users.find((item) => item.id === Number(id));
    if (!target) return;
    document.getElementById('usuarioSelect').value = String(target.id);
    document.getElementById('usrNome').value = target.nome || '';
    document.getElementById('usrEmail').value = target.email || '';
    document.getElementById('usrTipo').value = target.tipoUsuario || 'CLIENTE';
    document.getElementById('usrTelefone').value = target.telefoneCliente || '';
    document.getElementById('usrSenha').value = '';
  }

  document.getElementById('usuarioSelect').addEventListener('change', (event) => {
    fillFormByUser(event.target.value);
  });

  document.querySelectorAll('.sel-user').forEach((button) => {
    button.addEventListener('click', () => {
      fillFormByUser(button.dataset.id);
      showAlert('Usuário carregado para edição.', 'info');
    });
  });

  document.getElementById('userEditForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const userId = Number(document.getElementById('usuarioSelect').value);

    if (!userId) {
      showAlert('Selecione um usuário para editar.', 'warning');
      return;
    }

    const payload = {
      nome: document.getElementById('usrNome').value,
      email: document.getElementById('usrEmail').value,
      tipoUsuario: document.getElementById('usrTipo').value,
      telefone: document.getElementById('usrTelefone').value || undefined,
      senha: document.getElementById('usrSenha').value || undefined
    };

    try {
      await api(`/usuarios/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showAlert('Usuário atualizado com sucesso.', 'success');
      await renderAdminUsuarios();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  });
}

async function renderAdminReservas() {
  const list = await api('/agendamentos');

  const getStatusBadge = (status) => {
    const badges = {
      'CONFIRMADO': '<span class="badge badge-success"><i class="fas fa-check"></i> Confirmado</span>',
      'CONCLUIDO': '<span class="badge badge-pink"><i class="fas fa-star"></i> Concluído</span>',
      'CANCELADO': '<span class="badge badge-danger"><i class="fas fa-times"></i> Cancelado</span>'
    };
    return badges[status] || `<span class="badge">${status}</span>`;
  };

  viewArea.innerHTML = `
    <div class="card">
      <h3><i class="fas fa-calendar-check"></i> Gerenciar Reservas</h3>
      ${list.length === 0 ? '<p class="muted text-center mt-2"><i class="fas fa-inbox"></i> Nenhuma reserva encontrada.</p>' : `
      <div class="table-wrap mt-2">
        <table class="table">
          <thead>
            <tr>
              <th><i class="fas fa-calendar"></i> Data</th>
              <th><i class="fas fa-clock"></i> Hora</th>
              <th><i class="fas fa-user"></i> Cliente</th>
              <th><i class="fas fa-cut"></i> Serviço</th>
              <th><i class="fas fa-user-tie"></i> Profissional</th>
              <th><i class="fas fa-info-circle"></i> Status</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((a) => `<tr>
              <td>${formatDateDisplay(a.data)}</td>
              <td><strong>${String(a.horario).slice(0, 5)}</strong></td>
              <td>${a.nomeCliente}</td>
              <td>${a.nomeServico}</td>
              <td>${a.nomeProfissional}</td>
              <td>${getStatusBadge(a.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      `}
    </div>
  `;
}

function bindCalendarControls() {
  document.getElementById('prevMonth').addEventListener('click', () => {
    state.monthPointer = new Date(state.monthPointer.getFullYear(), state.monthPointer.getMonth() - 1, 1);
    renderCurrentTab();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    state.monthPointer = new Date(state.monthPointer.getFullYear(), state.monthPointer.getMonth() + 1, 1);
    renderCurrentTab();
  });

  viewArea.querySelectorAll('[data-date]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedDate = btn.dataset.date;
      renderCurrentTab();
    });
  });
}

async function renderCurrentTab() {
  if (!state.user) return;

  const role = state.user.tipoUsuario;

  if (role === 'CLIENTE') {
    if (state.currentTab === 'Calendário') return renderClienteCalendario();
    if (state.currentTab === 'Meus Agendamentos') return renderMeusAgendamentos();
  }

  if (role === 'FUNCIONARIO') {
    if (state.currentTab === 'Editar Perfil') return renderFuncionarioPerfil();
    if (state.currentTab === 'Meu Calendário') return renderFuncionarioCalendario();
    if (state.currentTab === 'Agendamentos do Dia') return renderAgendamentosDia();
  }

  if (role === 'ADMINISTRADOR') {
    if (state.currentTab === 'Dashboard') return renderDashboard();
    if (state.currentTab === 'Usuários') return renderAdminUsuarios();
    if (state.currentTab === 'Profissionais') return renderAdminProfissionais();
    if (state.currentTab === 'Serviços') return renderAdminServicos();
    if (state.currentTab === 'Reservas') return renderAdminReservas();
    if (state.currentTab === 'Meu Calendário') return renderAdminCalendario();
  }
}

async function enterApp() {
  authSection.classList.add('hidden');
  appSection.classList.remove('hidden');
  welcomeTitle.textContent = `Olá, ${state.user.nome}`;
  welcomeSubtitle.textContent = `Perfil: ${state.user.tipoUsuario}`;
  await bootstrapData();
  setupSocket();
  renderRoleTabs();
  await renderCurrentTab();
}

function bindAuth() {
  document.querySelectorAll('[data-auth-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-auth-tab]').forEach((item) => item.classList.remove('active'));
      btn.classList.add('active');

      document.getElementById('loginForm').classList.toggle('hidden', btn.dataset.authTab !== 'login');
      document.getElementById('registerForm').classList.toggle('hidden', btn.dataset.authTab !== 'register');
    });
  });

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    try {
      const fd = new FormData(e.target);
      const data = await api('/auth/login', {
        method: 'POST',
        headers: {},
        body: JSON.stringify({
          email: String(fd.get('email')).trim().toLowerCase(),
          senha: fd.get('senha')
        })
      });
      saveSession(data.token, data.user);
      await enterApp();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  });

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    try {
      const fd = new FormData(e.target);
      await api('/auth/register', {
        method: 'POST',
        headers: {},
        body: JSON.stringify({
          nome: String(fd.get('nome')).trim(),
          email: String(fd.get('email')).trim().toLowerCase(),
          senha: fd.get('senha'),
          telefone: '11999999999',
          tipoUsuario: 'CLIENTE'
        })
      });
      showAlert('Cadastro realizado com sucesso! Faça login para continuar.', 'success');
      document.querySelector('[data-auth-tab="login"]').click();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearSession();
    if (state.socket) state.socket.disconnect();
    appSection.classList.add('hidden');
    authSection.classList.remove('hidden');
    showAlert('Sessão finalizada. Até logo!', 'success');
  });
}

(async function init() {
  bindAuth();
  if (state.token && state.user) {
    try {
      await api('/auth/me');
      await enterApp();
    } catch {
      clearSession();
    }
  }
})();
