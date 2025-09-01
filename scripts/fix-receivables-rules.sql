-- Limpar regras existentes e criar novas mais específicas para recebimentos
DELETE FROM reconciliation_rules WHERE user_id IN (SELECT id FROM users WHERE username = 'ita');

-- REGRAS PARA RECEBIMENTOS (ENTRADAS) - Mais específicas
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Salário', 'SALARIO', 'Salário', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Recebido', 'PIX RECEBIDO', 'PIX Recebido', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Crédito', 'PIX REC', 'PIX Recebido', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Depósito', 'DEPOSITO', 'Depósito', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Recebimento', 'RECEBIMENTO', 'Recebimento', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Transferência Recebida', 'TRANSFERENCIA RECEBIDA', 'Transferência Recebida', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'TED Recebido', 'TED RECEBIDO', 'TED Recebido', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Crédito Geral', 'CREDITO', 'Crédito', 'entrada', true, true, true
FROM users WHERE username = 'ita';

-- REGRAS PARA DESPESAS (SAÍDAS)
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Enviado', 'PIX ENVIADO', 'PIX Enviado', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Débito', 'PIX DES', 'PIX Enviado', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Transferência Geral', 'TRANSFERENCIA', 'Transferência', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'TED Enviado', 'TED', 'Transferência TED', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Cartão de Crédito', 'CARTAO', 'Cartão de Crédito', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Saque', 'SAQUE', 'Saque', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Débito Automático', 'DEB AUTOMATICO', 'Débito Automático', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Agora Pay', 'AGORA', 'Transferência Agora', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Pagamento', 'PAGAMENTO', 'Pagamento', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Compra Débito', 'COMPRA DEBITO', 'Compra no Débito', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Tarifa', 'TARIFA', 'Tarifa Bancária', 'despesa', true, true, true
FROM users WHERE username = 'ita';

-- REGRAS MAIS GENÉRICAS (com prioridade menor)
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Débito Geral', 'DEBITO', 'Débito', 'despesa', true, true, true
FROM users WHERE username = 'ita';

-- Verificar regras criadas
SELECT rule_name, bank_description_pattern, transaction_description, transaction_type, active 
FROM reconciliation_rules 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
ORDER BY transaction_type, rule_name;

-- Comentário
COMMENT ON TABLE reconciliation_rules IS 'Regras otimizadas para recebimentos e conciliação em massa';
