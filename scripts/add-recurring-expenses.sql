-- Criar tabela de gastos fixos/recorrentes
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_category ON recurring_expenses(category);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON recurring_expenses(is_active);

-- Comentários
COMMENT ON TABLE recurring_expenses IS 'Gastos fixos mensais como escola, faculdade, gasolina, etc';
COMMENT ON COLUMN recurring_expenses.category IS 'Categoria do gasto: escola, transporte, saúde, etc';
COMMENT ON COLUMN recurring_expenses.day_of_month IS 'Dia do mês em que o gasto ocorre (1-31)';
COMMENT ON COLUMN recurring_expenses.is_active IS 'Se o gasto ainda está ativo ou foi cancelado';
