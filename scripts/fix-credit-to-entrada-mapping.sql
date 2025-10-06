-- ================================================
-- FIX: Corrigir Mapeamento Crédito → Entrada
-- ================================================
-- Este script recria as regras de conciliação com o mapeamento correto:
-- CRÉDITO (OFX) → ENTRADA (Sistema) → Recebimentos
-- DÉBITO (OFX) → DESPESA (Sistema) → Pagamentos

-- 1. Deletar todas as regras existentes para começar do zero
DELETE FROM reconciliation_rules WHERE active = true;

-- 2. Criar regras ESPECÍFICAS para CRÉDITOS → ENTRADAS
INSERT INTO reconciliation_rules (
  user_id, 
  rule_name, 
  bank_description_pattern, 
  transaction_description, 
  transaction_type, 
  auto_reconcile, 
  active, 
  use_original_description
) VALUES
  -- REGRAS PARA RECEBIMENTOS (CRÉDITOS)
  ((SELECT id FROM users LIMIT 1), 'PIX Recebido', 'PIX RECEBIDO', 'PIX Recebido', 'entrada', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'PIX Crédito', 'PIX REC', 'PIX Recebido', 'entrada', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'PIX Entrada', 'PIX ENTRADA', 'PIX Recebido', 'entrada', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Depósito', 'DEPOSITO', 'Depósito', 'entrada', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'TED Recebido', 'TED RECEBIDO', 'TED Recebido', 'entrada', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Transferência Recebida', 'TRANSFERENCIA RECEBIDA', 'Transferência Recebida', 'entrada', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Crédito Bancário', 'CREDITO', 'Crédito', 'entrada', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Salário', 'SALARIO', 'Salário', 'entrada', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Recebimento', 'RECEBIMENTO', 'Recebimento', 'entrada', true, true, true),
  -- REGRA CATCH-ALL PARA TODOS OS CRÉDITOS (MAIS IMPORTANTE)
  ((SELECT id FROM users LIMIT 1), '🎯 QUALQUER CRÉDITO', '', 'Recebimento', 'entrada', true, true, true);

-- 3. Criar regras ESPECÍFICAS para DÉBITOS → DESPESAS
INSERT INTO reconciliation_rules (
  user_id, 
  rule_name, 
  bank_description_pattern, 
  transaction_description, 
  transaction_type, 
  auto_reconcile, 
  active, 
  use_original_description
) VALUES
  -- REGRAS PARA PAGAMENTOS (DÉBITOS)
  ((SELECT id FROM users LIMIT 1), 'PIX Enviado', 'PIX ENVIADO', 'PIX Enviado', 'despesa', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'PIX Débito', 'PIX DES', 'PIX Enviado', 'despesa', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Saque ATM', 'SAQUE', 'Saque', 'despesa', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Cartão de Crédito', 'CARTAO', 'Cartão de Crédito', 'despesa', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Transferência Enviada', 'TRANSFERENCIA', 'Transferência', 'despesa', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'TED Enviado', 'TED', 'TED Enviado', 'despesa', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Débito Automático', 'DEB AUTOMATICO', 'Débito Automático', 'despesa', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Tarifa Bancária', 'TARIFA', 'Tarifa Bancária', 'despesa', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Pagamento', 'PAGAMENTO', 'Pagamento', 'despesa', true, true, true),
  ((SELECT id FROM users LIMIT 1), 'Compra Débito', 'COMPRA DEBITO', 'Compra no Débito', 'despesa', true, true, true),
  -- REGRA CATCH-ALL PARA TODOS OS DÉBITOS
  ((SELECT id FROM users LIMIT 1), '🎯 QUALQUER DÉBITO', '', 'Pagamento', 'despesa', true, true, true);

-- 4. Verificar o que foi criado
SELECT 
  '✅ VERIFICAÇÃO FINAL' as status,
  transaction_type,
  COUNT(*) as total_regras,
  COUNT(CASE WHEN bank_description_pattern = '' THEN 1 END) as catch_all_rules
FROM reconciliation_rules
WHERE active = true
GROUP BY transaction_type
ORDER BY transaction_type;

-- 5. Mostrar todas as regras criadas
SELECT 
  rule_name,
  bank_description_pattern,
  transaction_type,
  CASE WHEN bank_description_pattern = '' THEN '🎯 CATCH-ALL' ELSE '📋 ESPECÍFICA' END as tipo_regra
FROM reconciliation_rules
WHERE active = true
ORDER BY transaction_type, CASE WHEN bank_description_pattern = '' THEN 1 ELSE 0 END, rule_name;
