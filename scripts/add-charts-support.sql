-- Criar view para estatísticas de dívidas (opcional, melhora performance)
CREATE OR REPLACE VIEW debt_statistics AS
SELECT 
  d.user_id,
  d.type,
  d.status,
  COUNT(*) as count,
  SUM(d.original_amount) as total_original,
  SUM(d.remaining_amount) as total_remaining,
  AVG(d.remaining_amount) as avg_remaining,
  p.name as person_name,
  d.person_id
FROM debts d
JOIN people p ON d.person_id = p.id
GROUP BY d.user_id, d.type, d.status, p.name, d.person_id;

-- Criar índices para melhorar performance dos gráficos
CREATE INDEX IF NOT EXISTS idx_debts_user_type_status ON debts(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_debts_created_month ON debts(user_id, DATE_TRUNC('month', created_at));

-- Comentário: Esta view e índices vão acelerar as consultas dos gráficos
