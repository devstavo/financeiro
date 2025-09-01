-- Limpar regras existentes e criar novas mais abrangentes
DELETE FROM reconciliation_rules WHERE user_id IN (SELECT id FROM users WHERE username = 'ita');

-- Inserir regras mais abrangentes que cobrem os casos do debug
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Salário', 'SALARIO', 'Salário', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Recebido', 'PIX RECEBIDO', 'PIX Recebido', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Enviado', 'PIX ENVIADO', 'PIX Enviado', 'despesa', true, true, true
FROM users WHERE username = 'ita';

-- NOVAS REGRAS PARA COBRIR OS CASOS DO DEBUG
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Transferência Geral', 'TRANSFERENCIA', 'Transferência', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Débito', 'PIX DES', 'PIX Enviado', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Crédito', 'PIX REC', 'PIX Recebido', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'TED Débito', 'TED', 'Transferência TED', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Cartão de Crédito', 'CARTAO', 'Cartão de Crédito', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Depósito', 'DEPOSITO', 'Depósito', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Saque', 'SAQUE', 'Saque', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Débito Automático', 'DEB AUTOMATICO', 'Débito Automático', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Pagamento', 'PAGAMENTO', 'Pagamento', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Recebimento', 'RECEBIMENTO', 'Recebimento', 'entrada', true, true, true
FROM users WHERE username = 'ita';

-- Regras mais específicas para casos especiais
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Agora Pay', 'AGORA', 'Transferência Agora', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Compra Débito', 'COMPRA DEBITO', 'Compra no Débito', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Tarifa', 'TARIFA', 'Tarifa Bancária', 'despesa', true, true, true
FROM users WHERE username = 'ita';

-- Verificar regras criadas
SELECT rule_name, bank_description_pattern, transaction_description, transaction_type, active 
FROM reconciliation_rules 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
ORDER BY rule_name;

-- Comentário
COMMENT ON TABLE reconciliation_rules IS 'Regras atualizadas para cobrir mais casos de transações bancárias';
