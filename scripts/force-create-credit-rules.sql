-- Script para forçar criação de regras específicas para créditos
-- Execute este script para garantir que as regras de entrada existam

-- Primeiro, vamos ver o que existe
SELECT 'REGRAS ATUAIS' as info;
SELECT 
    rule_name,
    bank_description_pattern,
    transaction_type,
    active,
    auto_reconcile
FROM reconciliation_rules 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
ORDER BY transaction_type, rule_name;

-- Deletar TODAS as regras existentes para recriar do zero
DELETE FROM reconciliation_rules WHERE user_id IN (SELECT id FROM users WHERE username = 'ita');

-- Criar regras ESPECÍFICAS para créditos primeiro
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
SELECT id, 'TED Recebido', 'TED RECEBIDO', 'TED Recebido', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Transferência Recebida', 'TRANSFERENCIA RECEBIDA', 'Transferência Recebida', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Crédito', 'CREDITO', 'Crédito', 'entrada', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Salário', 'SALARIO', 'Salário', 'entrada', true, true, true
FROM users WHERE username = 'ita';

-- REGRA CATCH-ALL PARA CRÉDITOS (MAIS IMPORTANTE)
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'QUALQUER CRÉDITO', '', 'Recebimento', 'entrada', true, true, true
FROM users WHERE username = 'ita';

-- Agora regras para débitos
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Enviado', 'PIX ENVIADO', 'PIX Enviado', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'PIX Débito', 'PIX DES', 'PIX Enviado', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Saque', 'SAQUE', 'Saque', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Cartão', 'CARTAO', 'Cartão de Crédito', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Transferência', 'TRANSFERENCIA', 'Transferência', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'TED Enviado', 'TED', 'TED Enviado', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Débito Automático', 'DEB AUTOMATICO', 'Débito Automático', 'despesa', true, true, true
FROM users WHERE username = 'ita';

INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'Tarifa', 'TARIFA', 'Tarifa Bancária', 'despesa', true, true, true
FROM users WHERE username = 'ita';

-- REGRA CATCH-ALL PARA DÉBITOS
INSERT INTO reconciliation_rules (user_id, rule_name, bank_description_pattern, transaction_description, transaction_type, auto_reconcile, active, use_original_description)
SELECT id, 'QUALQUER DÉBITO', '', 'Despesa', 'despesa', true, true, true
FROM users WHERE username = 'ita';

-- Verificar regras criadas
SELECT 'REGRAS CRIADAS' as info;
SELECT 
    rule_name,
    bank_description_pattern,
    transaction_type,
    active,
    auto_reconcile,
    CASE WHEN bank_description_pattern = '' THEN 'CATCH-ALL' ELSE 'ESPECÍFICA' END as tipo_regra
FROM reconciliation_rules 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
ORDER BY transaction_type, 
         CASE WHEN bank_description_pattern = '' THEN 1 ELSE 0 END,
         rule_name;

-- Contar regras por tipo
SELECT 'CONTAGEM POR TIPO' as info;
SELECT 
    transaction_type,
    COUNT(*) as total_regras,
    SUM(CASE WHEN active = true THEN 1 ELSE 0 END) as regras_ativas,
    SUM(CASE WHEN auto_reconcile = true THEN 1 ELSE 0 END) as regras_auto
FROM reconciliation_rules 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
GROUP BY transaction_type;
