-- ================================================
-- Criar tabela de saldo acumulado por mês
-- ================================================

CREATE TABLE IF NOT EXISTS month_balance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month_year TEXT NOT NULL, -- formato: YYYY-MM
  opening_balance DECIMAL(10, 2) DEFAULT 0, -- saldo inicial do mês
  closing_balance DECIMAL(10, 2) DEFAULT 0, -- saldo final do mês
  total_income DECIMAL(10, 2) DEFAULT 0, -- Total de entradas
  total_expenses DECIMAL(10, 2) DEFAULT 0, -- Total de despesas
  ofx_balance DECIMAL(10, 2),
  difference DECIMAL(10, 2),
  is_closed BOOLEAN DEFAULT FALSE, -- Mês fechado?
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, month_year)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_month_balance_user ON month_balance(user_id);
CREATE INDEX IF NOT EXISTS idx_month_balance_month ON month_balance(month_year);
CREATE INDEX IF NOT EXISTS idx_month_balance_user_month ON month_balance(user_id, month_year);

-- Função para atualizar saldo do mês automaticamente
CREATE OR REPLACE FUNCTION update_month_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar ou inserir saldo do mês
  INSERT INTO month_balance (user_id, month_year, total_income, total_expenses, closing_balance)
  SELECT 
    NEW.user_id,
    NEW.month_year,
    COALESCE(SUM(CASE WHEN type = 'entrada' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'entrada' THEN amount ELSE -amount END), 0)
  FROM transactions
  WHERE user_id = NEW.user_id AND month_year = NEW.month_year
  ON CONFLICT (user_id, month_year) 
  DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expenses = EXCLUDED.total_expenses,
    closing_balance = EXCLUDED.closing_balance,
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar saldo quando transação for inserida/atualizada/deletada
DROP TRIGGER IF EXISTS trigger_update_month_balance ON transactions;
CREATE TRIGGER trigger_update_month_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_month_balance();

-- Trigger para atualizar updated_at antes de qualquer atualização na tabela month_balance
CREATE OR REPLACE FUNCTION update_month_balance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER month_balance_updated_at
  BEFORE UPDATE ON month_balance
  FOR EACH ROW
  EXECUTE FUNCTION update_month_balance_updated_at();

-- Função para calcular a diferença quando ofx_balance é atualizado
CREATE OR REPLACE FUNCTION calculate_ofx_difference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ofx_balance IS NOT NULL THEN
    NEW.difference = NEW.closing_balance - NEW.ofx_balance;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular a diferença antes de inserir ou atualizar na tabela month_balance
CREATE TRIGGER month_balance_ofx_difference
  BEFORE INSERT OR UPDATE ON month_balance
  FOR EACH ROW
  EXECUTE FUNCTION calculate_ofx_difference();

-- Inicializar saldos para meses existentes
INSERT INTO month_balance (user_id, month_year, total_income, total_expenses, closing_balance)
SELECT 
  user_id,
  month_year,
  COALESCE(SUM(CASE WHEN type = 'entrada' THEN amount ELSE 0 END), 0) as total_income,
  COALESCE(SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0) as total_expenses,
  COALESCE(SUM(CASE WHEN type = 'entrada' THEN amount ELSE -amount END), 0) as closing_balance
FROM transactions
GROUP BY user_id, month_year
ON CONFLICT (user_id, month_year) DO NOTHING;

COMMENT ON TABLE month_balance IS 'Armazena saldos de abertura e fechamento de cada mês';
COMMENT ON COLUMN month_balance.opening_balance IS 'Saldo de abertura (= saldo de fechamento do mês anterior)';
COMMENT ON COLUMN month_balance.closing_balance IS 'Saldo de fechamento (abertura + entradas - despesas)';
COMMENT ON COLUMN month_balance.ofx_balance IS 'Saldo importado do OFX para comparação';
COMMENT ON COLUMN month_balance.difference IS 'Diferença entre closing_balance e ofx_balance';
