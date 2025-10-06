-- Script para testar o matching de créditos antes de executar a conciliação
-- Execute este script para ver se as regras vão funcionar corretamente

-- Ver situação atual das transações bancárias
SELECT 'TRANSAÇÕES BANCÁRIAS POR TIPO' as info;
SELECT 
    transaction_type as tipo_bancario,
    COUNT(*) as quantidade,
    SUM(amount) as valor_total,
    CASE 
        WHEN transaction_type = 'credit' THEN '→ ENTRADA (recebimentos)'
        WHEN transaction_type = 'debit' THEN '→ DESPESA (pagamentos)'
        ELSE '→ TIPO DESCONHECIDO'
    END as deve_virar
FROM bank_transactions 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
  AND reconciled = false
GROUP BY transaction_type
ORDER BY transaction_type;

-- Ver regras disponíveis por tipo
SELECT 'REGRAS DISPONÍVEIS POR TIPO' as info;
SELECT 
    transaction_type as tipo_sistema,
    COUNT(*) as total_regras,
    SUM(CASE WHEN active = true THEN 1 ELSE 0 END) as regras_ativas,
    SUM(CASE WHEN auto_reconcile = true THEN 1 ELSE 0 END) as regras_auto,
    SUM(CASE WHEN bank_description_pattern = '' THEN 1 ELSE 0 END) as regras_catch_all,
    CASE 
        WHEN transaction_type = 'entrada' THEN '← CREDIT (créditos)'
        WHEN transaction_type = 'despesa' THEN '← DEBIT (débitos)'
        ELSE '← TIPO DESCONHECIDO'
    END as vem_de
FROM reconciliation_rules 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
GROUP BY transaction_type
ORDER BY transaction_type;

-- Simular matching para créditos (primeiros 10)
SELECT 'SIMULAÇÃO DE MATCHING - CRÉDITOS' as info;
SELECT 
    bt.description as descricao_original,
    bt.amount as valor,
    bt.transaction_type as tipo_bancario,
    'entrada' as tipo_esperado_sistema,
    (
        SELECT COUNT(*)
        FROM reconciliation_rules rr
        WHERE rr.user_id = bt.user_id
          AND rr.transaction_type = 'entrada'
          AND rr.active = true
          AND rr.auto_reconcile = true
          AND (
              rr.bank_description_pattern = '' 
              OR UPPER(bt.description) LIKE '%' || UPPER(rr.bank_description_pattern) || '%'
          )
    ) as regras_que_fazem_match,
    (
        SELECT rr.rule_name
        FROM reconciliation_rules rr
        WHERE rr.user_id = bt.user_id
          AND rr.transaction_type = 'entrada'
          AND rr.active = true
          AND rr.auto_reconcile = true
          AND (
              rr.bank_description_pattern = '' 
              OR UPPER(bt.description) LIKE '%' || UPPER(rr.bank_description_pattern) || '%'
          )
        ORDER BY 
            CASE WHEN rr.bank_description_pattern = '' THEN 1 ELSE 0 END,
            LENGTH(rr.bank_description_pattern) DESC
        LIMIT 1
    ) as regra_aplicavel,
    CASE 
        WHEN (
            SELECT COUNT(*)
            FROM reconciliation_rules rr
            WHERE rr.user_id = bt.user_id
              AND rr.transaction_type = 'entrada'
              AND rr.active = true
              AND rr.auto_reconcile = true
              AND (
                  rr.bank_description_pattern = '' 
                  OR UPPER(bt.description) LIKE '%' || UPPER(rr.bank_description_pattern) || '%'
              )
        ) > 0 THEN '✅ SERÁ CONCILIADO'
        ELSE '❌ NÃO SERÁ CONCILIADO'
    END as resultado_esperado
FROM bank_transactions bt
WHERE bt.user_id IN (SELECT id FROM users WHERE username = 'ita')
  AND bt.reconciled = false
  AND bt.transaction_type = 'credit'
ORDER BY bt.transaction_date DESC
LIMIT 10;

-- Simular matching para débitos (primeiros 10)
SELECT 'SIMULAÇÃO DE MATCHING - DÉBITOS' as info;
SELECT 
    bt.description as descricao_original,
    bt.amount as valor,
    bt.transaction_type as tipo_bancario,
    'despesa' as tipo_esperado_sistema,
    (
        SELECT COUNT(*)
        FROM reconciliation_rules rr
        WHERE rr.user_id = bt.user_id
          AND rr.transaction_type = 'despesa'
          AND rr.active = true
          AND rr.auto_reconcile = true
          AND (
              rr.bank_description_pattern = '' 
              OR UPPER(bt.description) LIKE '%' || UPPER(rr.bank_description_pattern) || '%'
          )
    ) as regras_que_fazem_match,
    (
        SELECT rr.rule_name
        FROM reconciliation_rules rr
        WHERE rr.user_id = bt.user_id
          AND rr.transaction_type = 'despesa'
          AND rr.active = true
          AND rr.auto_reconcile = true
          AND (
              rr.bank_description_pattern = '' 
              OR UPPER(bt.description) LIKE '%' || UPPER(rr.bank_description_pattern) || '%'
          )
        ORDER BY 
            CASE WHEN rr.bank_description_pattern = '' THEN 1 ELSE 0 END,
            LENGTH(rr.bank_description_pattern) DESC
        LIMIT 1
    ) as regra_aplicavel,
    CASE 
        WHEN (
            SELECT COUNT(*)
            FROM reconciliation_rules rr
            WHERE rr.user_id = bt.user_id
              AND rr.transaction_type = 'despesa'
              AND rr.active = true
              AND rr.auto_reconcile = true
              AND (
                  rr.bank_description_pattern = '' 
                  OR UPPER(bt.description) LIKE '%' || UPPER(rr.bank_description_pattern) || '%'
              )
        ) > 0 THEN '✅ SERÁ CONCILIADO'
        ELSE '❌ NÃO SERÁ CONCILIADO'
    END as resultado_esperado
FROM bank_transactions bt
WHERE bt.user_id IN (SELECT id FROM users WHERE username = 'ita')
  AND bt.reconciled = false
  AND bt.transaction_type = 'debit'
ORDER BY bt.transaction_date DESC
LIMIT 10;

-- Resumo final
SELECT 'RESUMO FINAL' as info;
SELECT 
    'MAPEAMENTO CORRETO' as verificacao,
    'credit → entrada (recebimentos)' as mapeamento_1,
    'debit → despesa (pagamentos)' as mapeamento_2,
    (SELECT COUNT(*) FROM reconciliation_rules WHERE user_id IN (SELECT id FROM users WHERE username = 'ita') AND transaction_type = 'entrada') as regras_entrada,
    (SELECT COUNT(*) FROM reconciliation_rules WHERE user_id IN (SELECT id FROM users WHERE username = 'ita') AND transaction_type = 'despesa') as regras_despesa,
    (SELECT COUNT(*) FROM bank_transactions WHERE user_id IN (SELECT id FROM users WHERE username = 'ita') AND reconciled = false AND transaction_type = 'credit') as creditos_pendentes,
    (SELECT COUNT(*) FROM bank_transactions WHERE user_id IN (SELECT id FROM users WHERE username = 'ita') AND reconciled = false AND transaction_type = 'debit') as debitos_pendentes;

-- Verificar se há regras catch-all
SELECT 'REGRAS CATCH-ALL DISPONÍVEIS' as info;
SELECT 
    rule_name,
    transaction_type,
    bank_description_pattern,
    active,
    auto_reconcile,
    CASE 
        WHEN transaction_type = 'entrada' THEN 'Para TODOS os créditos'
        WHEN transaction_type = 'despesa' THEN 'Para TODOS os débitos'
        ELSE 'Tipo desconhecido'
    END as funcao
FROM reconciliation_rules 
WHERE user_id IN (SELECT id FROM users WHERE username = 'ita')
  AND bank_description_pattern = ''
ORDER BY transaction_type;
