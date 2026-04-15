CREATE TABLE IF NOT EXISTS Usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  tipoUsuario ENUM('CLIENTE', 'FUNCIONARIO', 'ADMINISTRADOR') NOT NULL
);

CREATE TABLE IF NOT EXISTS Cliente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idUsuario INT NOT NULL UNIQUE,
  telefone VARCHAR(20) NOT NULL,
  dataCadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cliente_usuario FOREIGN KEY (idUsuario) REFERENCES Usuario(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Administrador (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idUsuario INT NOT NULL UNIQUE,
  CONSTRAINT fk_admin_usuario FOREIGN KEY (idUsuario) REFERENCES Usuario(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Profissional (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idUsuario INT UNIQUE,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  intervaloMinutos INT NOT NULL DEFAULT 60,
  status ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
  CONSTRAINT fk_profissional_usuario FOREIGN KEY (idUsuario) REFERENCES Usuario(id) ON DELETE SET NULL
);

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Profissional'
    AND COLUMN_NAME = 'intervaloMinutos'
);

SET @sql_col := IF(
  @col_exists = 0,
  'ALTER TABLE Profissional ADD COLUMN intervaloMinutos INT NOT NULL DEFAULT 60',
  'SELECT 1'
);

PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

CREATE TABLE IF NOT EXISTS Servico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT,
  duracaoMinutos INT NOT NULL,
  preco DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS ProfissionalServico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idProfissional INT NOT NULL,
  idServico INT NOT NULL,
  UNIQUE KEY uq_profissional_servico (idProfissional, idServico),
  CONSTRAINT fk_ps_profissional FOREIGN KEY (idProfissional) REFERENCES Profissional(id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_servico FOREIGN KEY (idServico) REFERENCES Servico(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS DisponibilidadeProfissional (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idProfissional INT NOT NULL,
  diaSemana TINYINT NOT NULL,
  horarioInicio TIME NOT NULL,
  horarioFim TIME NOT NULL,
  CONSTRAINT fk_dp_profissional FOREIGN KEY (idProfissional) REFERENCES Profissional(id) ON DELETE CASCADE,
  CONSTRAINT chk_dia_semana CHECK (diaSemana BETWEEN 0 AND 6),
  CONSTRAINT chk_intervalo_horario CHECK (horarioFim > horarioInicio)
);

CREATE TABLE IF NOT EXISTS Agendamento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data DATE NOT NULL,
  horario TIME NOT NULL,
  status ENUM('PENDENTE', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
  idCliente INT NOT NULL,
  idServico INT NOT NULL,
  idProfissional INT NOT NULL,
  CONSTRAINT fk_ag_cliente FOREIGN KEY (idCliente) REFERENCES Cliente(id),
  CONSTRAINT fk_ag_servico FOREIGN KEY (idServico) REFERENCES Servico(id),
  CONSTRAINT fk_ag_profissional FOREIGN KEY (idProfissional) REFERENCES Profissional(id)
);

CREATE TABLE IF NOT EXISTS AgendamentoObservacao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idAgendamento INT NOT NULL,
  observacao TEXT NOT NULL,
  criadoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_observacao_agendamento FOREIGN KEY (idAgendamento) REFERENCES Agendamento(id) ON DELETE CASCADE
);

CREATE INDEX idx_agendamento_data_horario ON Agendamento (data, horario);
CREATE INDEX idx_agendamento_profissional ON Agendamento (idProfissional, data, horario);

INSERT INTO Usuario (nome, email, senha, tipoUsuario)
VALUES ('Admin BelaGuest', 'admin@belaguest.com', '$2a$10$VAaw7QPhiy1Zy0CWhguIIeO/RAqJkrjaIRoX3KjDRextSDhpXk1OC', 'ADMINISTRADOR')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  senha = VALUES(senha),
  tipoUsuario = VALUES(tipoUsuario);

INSERT INTO Usuario (nome, email, senha, tipoUsuario)
VALUES ('Joao Cliente', 'cliente@belaguest.com', '$2a$10$VAaw7QPhiy1Zy0CWhguIIeO/RAqJkrjaIRoX3KjDRextSDhpXk1OC', 'CLIENTE')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  senha = VALUES(senha),
  tipoUsuario = VALUES(tipoUsuario);

INSERT INTO Usuario (nome, email, senha, tipoUsuario)
VALUES ('Maria Funcionario', 'funcionaria@belaguest.com', '$2a$10$VAaw7QPhiy1Zy0CWhguIIeO/RAqJkrjaIRoX3KjDRextSDhpXk1OC', 'FUNCIONARIO')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  senha = VALUES(senha),
  tipoUsuario = VALUES(tipoUsuario);

INSERT INTO Administrador (idUsuario)
SELECT u.id
FROM Usuario u
WHERE u.email = 'admin@belaguest.com'
  AND NOT EXISTS (SELECT 1 FROM Administrador a WHERE a.idUsuario = u.id);

INSERT INTO Cliente (idUsuario, telefone)
SELECT u.id, '11988888888'
FROM Usuario u
WHERE u.email = 'cliente@belaguest.com'
  AND NOT EXISTS (SELECT 1 FROM Cliente c WHERE c.idUsuario = u.id);

INSERT INTO Profissional (idUsuario, nome, telefone, intervaloMinutos, status)
SELECT u.id, 'Maria Funcionario', '11999999999', 60, 'ATIVO'
FROM Usuario u
WHERE u.email = 'funcionaria@belaguest.com'
  AND NOT EXISTS (SELECT 1 FROM Profissional p WHERE p.idUsuario = u.id);

-- Serviços padrão
INSERT INTO Servico (nome, descricao, duracaoMinutos, preco)
VALUES
  ('Manicure', 'Manicure completo', 30, 50.00),
  ('Pedicure', 'Pedicure completo', 40, 60.00),
  ('Cabelo', 'Corte e penteado', 60, 80.00)
ON DUPLICATE KEY UPDATE id=id;
