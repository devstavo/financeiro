-- Criar tabela de pessoas (devedores/credores)
CREATE TABLE people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de dívidas
CREATE TABLE debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  original_amount DECIMAL(10,2) NOT NULL,
  remaining_amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(10) CHECK (type IN ('a_receber', 'a_pagar')) NOT NULL, -- a_receber = alguém me deve, a_pagar = eu devo para alguém
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de pagamentos de dívidas
CREATE TABLE debt_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_people_user ON people(user_id);
CREATE INDEX idx_debts_user ON debts(user_id);
CREATE INDEX idx_debts_person ON debts(person_id);
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX idx_debt_payments_transaction ON debt_payments(transaction_id);

-- Inserir algumas pessoas de exemplo
INSERT INTO people (user_id, name, phone, notes) 
SELECT id, 'João Silva', '(11) 99999-9999', 'Amigo do trabalho'
FROM users WHERE username = 'ita';

INSERT INTO people (user_id, name, phone, notes) 
SELECT id, 'Maria Santos', '(11) 88888-8888', 'Vizinha'
FROM users WHERE username = 'ita';

-- Inserir algumas dívidas de exemplo
INSERT INTO debts (user_id, person_id, description, original_amount, remaining_amount, type, due_date)
SELECT u.id, p.id, 'Empréstimo para emergência', 500.00, 500.00, 'a_receber', '2024-02-15'
FROM users u, people p 
WHERE u.username = 'ita' AND p.name = 'João Silva' AND p.user_id = u.id;

INSERT INTO debts (user_id, person_id, description, original_amount, remaining_amount, type, due_date)
SELECT u.id, p.id, 'Conta do restaurante dividida', 80.00, 80.00, 'a_pagar', '2024-01-30'
FROM users u, people p 
WHERE u.username = 'ita' AND p.name = 'Maria Santos' AND p.user_id = u.id;
