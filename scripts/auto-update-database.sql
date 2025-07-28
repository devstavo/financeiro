-- Script de atualização automática do banco de dados
-- Execute este script no SQL Editor do Supabase para otimizar os gráficos

-- 1. Criar view para estatísticas de dívidas (melhora performance dos gráficos)
CREATE OR REPLACE VIEW debt_statistics AS
SELECT 
  d.user_id,
  d.type,
  d.status,
  COUNT(*) as debt_count,
  SUM(d.original_amount) as total_original,
  SUM(d.remaining_amount) as total_remaining,
  AVG(d.remaining_amount) as avg_remaining,
  p.name as person_name,
  d.person_id,
  DATE_TRUNC('month', d.created_at) as created_month
FROM debts d
JOIN people p ON d.person_id = p.id
GROUP BY d.user_id, d.type, d.status, p.name, d.person_id, DATE_TRUNC('month', d.created_at);

-- 2. Criar índices para melhorar performance dos gráficos
CREATE INDEX IF NOT EXISTS idx_debts_user_type_status ON debts(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_debts_created_month ON debts(user_id, DATE_TRUNC('month', created_at));
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debts_remaining_amount ON debts(remaining_amount) WHERE status = 'pendente';

-- 3. Criar função para estatísticas rápidas (opcional)
CREATE OR REPLACE FUNCTION get_debt_summary(p_user_id UUID)
RETURNS TABLE(
  total_receivable DECIMAL,
  total_payable DECIMAL,
  net_balance DECIMAL,
  overdue_count INTEGER,
  pending_count INTEGER,
  paid_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'a_receber' AND status = 'pendente' THEN remaining_amount ELSE 0 END), 0) as total_receivable,
    COALESCE(SUM(CASE WHEN type = 'a_pagar' AND status = 'pendente' THEN remaining_amount ELSE 0 END), 0) as total_payable,
    COALESCE(SUM(CASE WHEN type = 'a_receber' AND status = 'pendente' THEN remaining_amount ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN type = 'a_pagar' AND status = 'pendente' THEN remaining_amount ELSE 0 END), 0) as net_balance,
    COUNT(CASE WHEN status = 'pendente' AND due_date < CURRENT_DATE THEN 1 END)::INTEGER as overdue_count,
    COUNT(CASE WHEN status = 'pendente' THEN 1 END)::INTEGER as pending_count,
    COUNT(CASE WHEN status = 'pago' THEN 1 END)::INTEGER as paid_count
  FROM debts 
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Comentários para documentação
COMMENT ON VIEW debt_statistics IS 'View otimizada para gráficos e relatórios de dívidas';
COMMENT ON FUNCTION get_debt_summary IS 'Função para obter resumo rápido das dívidas de um usuário';

-- 5. Verificar se tudo foi criado corretamente
SELECT 'debt_statistics view created' as status
WHERE EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'debt_statistics');

SELECT 'get_debt_summary function created' as status
WHERE EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_debt_summary');

-- 6. Exemplo de uso da função (opcional - apenas para teste)
-- SELECT * FROM get_debt_summary('seu-user-id-aqui');

-- Mensagem de sucesso
SELECT '✅ Banco de dados atualizado com sucesso para suportar gráficos!' as message;
