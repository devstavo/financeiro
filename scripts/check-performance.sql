-- Script para verificar a performance do banco de dados

-- 1. Verificar índices criados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('debts', 'people', 'debt_payments')
ORDER BY tablename, indexname;

-- 2. Verificar estatísticas das tabelas
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables 
WHERE tablename IN ('debts', 'people', 'debt_payments');

-- 3. Testar a view de estatísticas
SELECT 
  user_id,
  type,
  status,
  debt_count,
  total_original,
  total_remaining
FROM debt_statistics
LIMIT 10;

-- 4. Verificar queries mais lentas (se houver)
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE query LIKE '%debts%' OR query LIKE '%people%'
ORDER BY mean_time DESC
LIMIT 5;

-- 5. Tamanho das tabelas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('debts', 'people', 'debt_payments', 'users')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
