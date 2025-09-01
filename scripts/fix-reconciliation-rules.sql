-- Limpar regras existentes e criar novas mais específicas
DELETE FROM reconciliation_rules WHERE user_id IN (SELECT id FROM users WHERE username = 'ita');

-- Inserir regras mais específicas e funcionais
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active)
SELECT id, 'Salário', 'SALARIO', 'Salário', 'entrada', true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active)
SELECT id, 'PIX Recebido', 'PIX RECEBIDO', 'PIX Recebido', 'entrada', true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active)
SELECT id, 'PIX Enviado', 'PIX ENVIADO', 'PIX Enviado', 'despesa', true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active)
SELECT id, 'Transferência TED', 'TED', 'Transferência TED', 'despesa', true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active)
SELECT id, 'Cartão de Crédito', 'CARTAO', 'Cartão de Crédito', 'despesa', true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active)
SELECT id, 'Depósito', 'DEPOSITO', 'Depósito', 'entrada', true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active)
SELECT id, 'Saque', 'SAQUE', 'Saque', 'despesa', true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active)
SELECT id, 'Débito Automático', 'DEB AUTOMATICO', 'Débito Automático', 'despesa', true, true
FROM users WHERE username = 'ita';

-- Verificar regras criadas
SELECT rule_name, bank_description_pattern, transaction_description, transaction_type, active 
FROM reconciliation_rules 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
ORDER BY rule_name;
