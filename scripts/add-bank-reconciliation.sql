-- Criar tabela para armazenar extratos bancários importados
CREATE TABLE bank_statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bank_name VARCHAR(100) NOT NULL DEFAULT 'Bradesco',
  account_number VARCHAR(50),
  statement_date DATE NOT NULL,
  balance DECIMAL(10,2),
  file_name VARCHAR(255),
  imported_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela para transações bancárias individuais do extrato
CREATE TABLE bank_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_id UUID REFERENCES bank_statements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type VARCHAR(10) CHECK (transaction_type IN ('debit', 'credit')) NOT NULL,
  reference_number VARCHAR(100),
  category VARCHAR(100),
  reconciled BOOLEAN DEFAULT FALSE,
  reconciled_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela para regras de conciliação automática
CREATE TABLE reconciliation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  bank_description_pattern VARCHAR(255) NOT NULL, -- Padrão para buscar na descrição bancária
  transaction_description VARCHAR(255) NOT NULL, -- Descrição que será usada na transação
  transaction_type VARCHAR(10) CHECK (transaction_type IN ('entrada', 'despesa')) NOT NULL,
  auto_reconcile BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_bank_statements_user ON bank_statements(user_id);
CREATE INDEX idx_bank_transactions_statement ON bank_transactions(statement_id);
CREATE INDEX idx_bank_transactions_user ON bank_transactions(user_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_reconciled ON bank_transactions(reconciled);
CREATE INDEX idx_reconciliation_rules_user ON reconciliation_rules(user_id);

-- Inserir algumas regras de conciliação padrão para o Bradesco
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type)
SELECT id, 'Salário', '%SALARIO%', 'Salário', 'entrada'
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type)
SELECT id, 'PIX Recebido', '%PIX RECEBIDO%', 'PIX Recebido', 'entrada'
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type)
SELECT id, 'PIX Enviado', '%PIX ENVIADO%', 'PIX Enviado', 'despesa'
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type)
SELECT id, 'TED/DOC', '%TED%', 'Transferência TED', 'despesa'
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type)
SELECT id, 'Cartão de Crédito', '%CARTAO%', 'Cartão de Crédito', 'despesa'
FROM users WHERE username = 'ita';

-- Comentários
COMMENT ON TABLE bank_statements IS 'Armazena extratos bancários importados via OFX';
COMMENT ON TABLE bank_transactions IS 'Transações individuais dos extratos bancários';
COMMENT ON TABLE reconciliation_rules IS 'Regras para conciliação automática de transações';
