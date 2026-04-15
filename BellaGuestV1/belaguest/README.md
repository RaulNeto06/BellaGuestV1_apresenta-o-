# BelaGuest API

Sistema profissional de agendamento para salão de beleza com arquitetura MVC, Node.js + Express, MySQL e Docker, preparado para evolução para API REST pública.

## Arquitetura

```text
/belaguest
│
├── /src
│   ├── /controllers
│   ├── /models
│   ├── /services
│   ├── /routes
│   ├── /middlewares
│   └── /config
│
├── /database
│   └── init.sql
├── docker-compose.yml
├── Dockerfile
├── .env
├── package.json
└── README.md
```

### Regras aplicadas
- Controllers apenas recebem requisições e delegam para Services.
- Services concentram regras de negócio.
- Models isolam acesso ao banco de dados.
- Rotas não contêm regra de negócio.
- Configuração por `dotenv` com troca de ambiente/banco via variáveis.

## Variáveis de ambiente

Use o arquivo `.env.example` como base:

```env
DB_HOST=mysql
DB_USER=belaguest_user
DB_PASSWORD=belaguest_pass
DB_NAME=belaguest
PORT=3000
JWT_SECRET=super_secret_change_me
JWT_EXPIRES_IN=1d
```

## Como executar

### Docker (recomendado)

```bash
docker compose up --build
```

API: `http://localhost:3000`

Interface web: `http://localhost:3000`

### Local

```bash
npm install
npm run dev
```

## Banco de dados

O script `database/init.sql` cria as tabelas:
- `Usuario`
- `Cliente`
- `Administrador`
- `Profissional`
- `Servico`
- `Agendamento`
- `ProfissionalServico`
- `DisponibilidadeProfissional`
- `AgendamentoObservacao`

Também cria um administrador padrão:
- email: `admin@belaguest.com`
- senha: `admin123`

## Endpoints principais (`/api/v1`)

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Serviços
- `GET /servicos`
- `POST /servicos` (ADMIN)
- `PUT /servicos/:id` (ADMIN)
- `DELETE /servicos/:id` (ADMIN)

### Profissionais
- `GET /profissionais`
- `GET /profissionais/me` (FUNCIONARIO)
- `GET /profissionais/:id`
- `POST /profissionais` (ADMIN)
- `PUT /profissionais/:id` (ADMIN)
- `DELETE /profissionais/:id` (ADMIN)

### Agendamentos
- `GET /agendamentos`
- `GET /agendamentos/sugestoes?data=YYYY-MM-DD&idServico=1`
- `GET /agendamentos/disponibilidade?data=YYYY-MM-DD&idServico=1&idProfissional=2`
- `POST /agendamentos` (CLIENTE)
- `PUT /agendamentos/:id` (ADMIN/FUNCIONARIO/CLIENTE com regra de acesso)
- `PATCH /agendamentos/:id/cancelar`
- `POST /agendamentos/:id/observacoes` (ADMIN/FUNCIONARIO)

### Dashboard
- `GET /dashboard/resumo` (ADMIN)

## Regras de negócio de agendamento
- Bloqueio de conflito: não permite dois agendamentos no mesmo horário para o mesmo profissional.
- Opção “qualquer profissional disponível”: alocação automática de profissional livre e apto ao serviço.
- Validação de disponibilidade por dia da semana e faixa de horário.
- Cada agendamento ocupa o slot completo.
- Emissão de eventos em tempo real via `socket.io`:
  - `agendamento:created`
  - `agendamento:updated`
  - `agendamento:cancelled`

## UX e evolução de produto
Base pronta para evolução com front-end responsivo (desktop/mobile) com:
- calendário mensal interativo;
- status visual de horários (livre/ocupado/bloqueado);
- filtros por profissional/serviço;
- alertas em tempo real;
- sugestões inteligentes de horários para clientes.

## Interface web já implementada
- Login e cadastro na mesma tela.
- Área de cliente: calendário mensal, filtro por profissional/serviço, reserva de horários e aba de meus agendamentos.
- Área de funcionário: perfil, visão de calendário e agendamentos do dia com marcação de presença/cancelamento/observações, sempre vinculados ao próprio profissional.
- Área de administrador: dashboard, CRUD de profissionais e serviços, visão geral de reservas e calendário operacional.

## Vínculo funcionário-profissional
- O profissional pode ser vinculado a um usuário funcionário pelo campo `idUsuario` no cadastro de profissional.
- Após vínculo, o funcionário passa a operar apenas a própria agenda (visualização e ações).

## Observações
- O projeto já está preparado para deploy futuro em ambientes externos com configuração por variáveis de ambiente.
- A camada de API está organizada para futura abertura pública com versionamento (`/api/v1`).
