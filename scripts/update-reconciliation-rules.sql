-- Adicionar campo para usar descrição original
ALTER TABLE reconciliation_rules 
ADD COLUMN IF NOT EXISTS use_original_description BOOLEAN DEFAULT TRUE;

-- Atualizar regras existentes para usar descrição original
UPDATE reconciliation_rules 
SET use_original_description = TRUE 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita');

-- Limpar regras existentes e recriar com o novo campo
DELETE FROM reconciliation_rules WHERE user_id IN (SELECT id FROM users WHERE username = 'ita');

-- Inserir regras atualizadas que usam descrição original
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Salário', 'SALARIO', 'Salário', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Recebido', 'PIX RECEBIDO', 'PIX Recebido', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Enviado', 'PIX ENVIADO', 'PIX Enviado', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Transferência TED', 'TED', 'Transferência TED', 'despesa', true, true, true
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

-- Verificar regras criadas
SELECT rule_name, bank_description_pattern, transaction_description, transaction_type, use_original_description, active 
FROM reconciliation_rules 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
ORDER BY rule_name;

-- Comentário
COMMENT ON COLUMN reconciliation_rules.use_original_description IS 'Se TRUE, usa a descrição original do OFX; se FALSE, usa transaction_description';
