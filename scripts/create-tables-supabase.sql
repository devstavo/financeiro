-- Criar tabela de usuários (mesmo sendo só você, é boa prática)
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de transações
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(10) CHECK (type IN ('entrada', 'despesa')) NOT NULL,
  transaction_date DATE NOT NULL,
  month_year VARCHAR(7) NOT NULL, -- formato: 2024-01
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de meses fechados
CREATE TABLE closed_months (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL, -- formato: 2024-01
  total_entradas DECIMAL(10,2) DEFAULT 0,
  total_despesas DECIMAL(10,2) DEFAULT 0,
  saldo_total DECIMAL(10,2) DEFAULT 0,
  closed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- Inserir usuário padrão (ita/ita)
INSERT INTO users (username, password_hash) 
VALUES ('ita', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'); -- senha: ita

-- Criar índices para performance
CREATE INDEX idx_transactions_user_month ON transactions(user_id, month_year);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_closed_months_user ON closed_months(user_id);
