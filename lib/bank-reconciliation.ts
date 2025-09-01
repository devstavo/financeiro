import { getSupabaseClient, isSupabaseConfigured } from "./supabase"
import { addTransaction } from "./database"
import type { OFXStatement } from "./ofx-parser"

export interface BankStatement {
  id: string
  user_id: string
  bank_name: string
  account_number: string
  statement_date: string
  balance: number
  file_name: string
  imported_at: string
  created_at: string
}

export interface BankTransaction {
  id: string
  statement_id: string
  user_id: string
  transaction_date: string
  description: string
  amount: number
  transaction_type: "debit" | "credit"
  reference_number?: string
  category?: string
  reconciled: boolean
  reconciled_transaction_id?: string
  created_at: string
}

export interface ReconciliationRule {
  id: string
  user_id: string
  rule_name: string
  bank_description_pattern: string
  transaction_description: string
  transaction_type: "entrada" | "despesa"
  auto_reconcile: boolean
  active: boolean
  use_original_description: boolean
  created_at: string
}

// Importar extrato bancário
export async function importBankStatement(
  userId: string,
  ofxData: OFXStatement,
  fileName: string,
): Promise<{ statement: BankStatement; transactions: BankTransaction[] } | null> {
  console.log("📥 Importando extrato bancário...", { userId, fileName, transactionCount: ofxData.transactions.length })

  if (!isSupabaseConfigured) {
    // Implementação localStorage
    const statementId = Date.now().toString()
    const statement: BankStatement = {
      id: statementId,
      user_id: userId,
      bank_name: ofxData.bankName,
      account_number: ofxData.accountNumber,
      statement_date: ofxData.statementDate,
      balance: ofxData.balance,
      file_name: fileName,
      imported_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    const transactions: BankTransaction[] = ofxData.transactions.map((txn, index) => ({
      id: `${statementId}_${index}`,
      statement_id: statementId,
      user_id: userId,
      transaction_date: txn.date,
      description: txn.description,
      amount: txn.amount,
      transaction_type: txn.type,
      reference_number: txn.referenceNumber,
      reconciled: false,
      created_at: new Date().toISOString(),
    }))

    // Salvar no localStorage
    const statements = JSON.parse(localStorage.getItem(`bank_statements_${userId}`) || "[]")
    statements.push(statement)
    localStorage.setItem(`bank_statements_${userId}`, JSON.stringify(statements))

    const bankTransactions = JSON.parse(localStorage.getItem(`bank_transactions_${userId}`) || "[]")
    bankTransactions.push(...transactions)
    localStorage.setItem(`bank_transactions_${userId}`, JSON.stringify(bankTransactions))

    console.log("✅ Extrato salvo no localStorage")
    return { statement, transactions }
  }

  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    // Inserir extrato
    const { data: statement, error: statementError } = await supabase
      .from("bank_statements")
      .insert({
        user_id: userId,
        bank_name: ofxData.bankName,
        account_number: ofxData.accountNumber,
        statement_date: ofxData.statementDate,
        balance: ofxData.balance,
        file_name: fileName,
      })
      .select()
      .single()

    if (statementError) {
      console.error("❌ Erro ao inserir extrato:", statementError)
      return null
    }

    console.log("✅ Extrato inserido:", statement.id)

    // Inserir transações bancárias
    const bankTransactionsData = ofxData.transactions.map((txn) => ({
      statement_id: statement.id,
      user_id: userId,
      transaction_date: txn.date,
      description: txn.description,
      amount: txn.amount,
      transaction_type: txn.type,
      reference_number: txn.referenceNumber,
    }))

    const { data: transactions, error: transactionsError } = await supabase
      .from("bank_transactions")
      .insert(bankTransactionsData)
      .select()

    if (transactionsError) {
      console.error("❌ Erro ao inserir transações bancárias:", transactionsError)
      return null
    }

    console.log("✅ Transações bancárias inseridas:", transactions.length)
    return { statement, transactions }
  } catch (error) {
    console.error("❌ Erro na importação:", error)
    return null
  }
}

// NOVA FUNÇÃO - Deletar extrato bancário e todas suas transações
export async function deleteBankStatement(userId: string, statementId: string): Promise<boolean> {
  console.log("🗑️ Deletando extrato bancário:", statementId)

  if (!isSupabaseConfigured) {
    // Implementação localStorage
    console.log("💾 Deletando no localStorage")

    // Deletar extrato
    const statements = JSON.parse(localStorage.getItem(`bank_statements_${userId}`) || "[]")
    const updatedStatements = statements.filter((statement: BankStatement) => statement.id !== statementId)
    localStorage.setItem(`bank_statements_${userId}`, JSON.stringify(updatedStatements))

    // Deletar transações bancárias relacionadas
    const bankTransactions = JSON.parse(localStorage.getItem(`bank_transactions_${userId}`) || "[]")
    const updatedBankTransactions = bankTransactions.filter(
      (transaction: BankTransaction) => transaction.statement_id !== statementId,
    )
    localStorage.setItem(`bank_transactions_${userId}`, JSON.stringify(updatedBankTransactions))

    console.log("✅ Extrato e transações deletados do localStorage")
    return true
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error("❌ Cliente Supabase não disponível")
    return false
  }

  try {
    console.log("☁️ Deletando no Supabase")

    // Deletar extrato (as transações bancárias são deletadas automaticamente por CASCADE)
    const { error } = await supabase.from("bank_statements").delete().eq("id", statementId).eq("user_id", userId)

    if (error) {
      console.error("❌ Erro ao deletar extrato:", error)
      return false
    }

    console.log("✅ Extrato e transações deletados do Supabase")
    return true
  } catch (error) {
    console.error("❌ Erro na exclusão:", error)
    return false
  }
}

// NOVA FUNÇÃO - Limpar todas as conciliações (resetar sistema)
export async function clearAllReconciliations(userId: string): Promise<boolean> {
  console.log("🧹 Limpando todas as conciliações para usuário:", userId)

  if (!isSupabaseConfigured) {
    // Implementação localStorage
    console.log("💾 Limpando localStorage")

    // Limpar extratos
    localStorage.removeItem(`bank_statements_${userId}`)
    // Limpar transações bancárias
    localStorage.removeItem(`bank_transactions_${userId}`)

    console.log("✅ Todas as conciliações limpas do localStorage")
    return true
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error("❌ Cliente Supabase não disponível")
    return false
  }

  try {
    console.log("☁️ Limpando no Supabase")

    // Deletar todos os extratos do usuário (as transações são deletadas por CASCADE)
    const { error } = await supabase.from("bank_statements").delete().eq("user_id", userId)

    if (error) {
      console.error("❌ Erro ao limpar conciliações:", error)
      return false
    }

    console.log("✅ Todas as conciliações limpas do Supabase")
    return true
  } catch (error) {
    console.error("❌ Erro na limpeza:", error)
    return false
  }
}

// Buscar regras de conciliação - VERSÃO MELHORADA
export async function getReconciliationRules(userId: string): Promise<ReconciliationRule[]> {
  console.log("📋 Buscando regras de conciliação para usuário:", userId)

  if (!isSupabaseConfigured) {
    console.log("💾 Usando localStorage para regras")
    const rules = localStorage.getItem(`reconciliation_rules_${userId}`)

    if (!rules) {
      // Criar regras padrão OTIMIZADAS no localStorage se não existirem
      const defaultRules: ReconciliationRule[] = [
        // REGRAS PARA RECEBIMENTOS (ENTRADAS)
        {
          id: "1",
          user_id: userId,
          rule_name: "Salário",
          bank_description_pattern: "SALARIO",
          transaction_description: "Salário",
          transaction_type: "entrada",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          user_id: userId,
          rule_name: "PIX Recebido",
          bank_description_pattern: "PIX RECEBIDO",
          transaction_description: "PIX Recebido",
          transaction_type: "entrada",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "3",
          user_id: userId,
          rule_name: "PIX Crédito",
          bank_description_pattern: "PIX REC",
          transaction_description: "PIX Recebido",
          transaction_type: "entrada",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "4",
          user_id: userId,
          rule_name: "Depósito",
          bank_description_pattern: "DEPOSITO",
          transaction_description: "Depósito",
          transaction_type: "entrada",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "5",
          user_id: userId,
          rule_name: "Recebimento",
          bank_description_pattern: "RECEBIMENTO",
          transaction_description: "Recebimento",
          transaction_type: "entrada",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "6",
          user_id: userId,
          rule_name: "Transferência Recebida",
          bank_description_pattern: "TRANSFERENCIA RECEBIDA",
          transaction_description: "Transferência Recebida",
          transaction_type: "entrada",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "7",
          user_id: userId,
          rule_name: "TED Recebido",
          bank_description_pattern: "TED RECEBIDO",
          transaction_description: "TED Recebido",
          transaction_type: "entrada",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "8",
          user_id: userId,
          rule_name: "Crédito Geral",
          bank_description_pattern: "CREDITO",
          transaction_description: "Crédito",
          transaction_type: "entrada",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        // REGRAS PARA DESPESAS (SAÍDAS)
        {
          id: "9",
          user_id: userId,
          rule_name: "PIX Enviado",
          bank_description_pattern: "PIX ENVIADO",
          transaction_description: "PIX Enviado",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "10",
          user_id: userId,
          rule_name: "PIX Débito",
          bank_description_pattern: "PIX DES",
          transaction_description: "PIX Enviado",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "11",
          user_id: userId,
          rule_name: "Transferência Geral",
          bank_description_pattern: "TRANSFERENCIA",
          transaction_description: "Transferência",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "12",
          user_id: userId,
          rule_name: "TED Enviado",
          bank_description_pattern: "TED",
          transaction_description: "Transferência TED",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "13",
          user_id: userId,
          rule_name: "Cartão de Crédito",
          bank_description_pattern: "CARTAO",
          transaction_description: "Cartão de Crédito",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "14",
          user_id: userId,
          rule_name: "Saque",
          bank_description_pattern: "SAQUE",
          transaction_description: "Saque",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "15",
          user_id: userId,
          rule_name: "Débito Automático",
          bank_description_pattern: "DEB AUTOMATICO",
          transaction_description: "Débito Automático",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "16",
          user_id: userId,
          rule_name: "Agora Pay",
          bank_description_pattern: "AGORA",
          transaction_description: "Transferência Agora",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "17",
          user_id: userId,
          rule_name: "Pagamento",
          bank_description_pattern: "PAGAMENTO",
          transaction_description: "Pagamento",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "18",
          user_id: userId,
          rule_name: "Compra Débito",
          bank_description_pattern: "COMPRA DEBITO",
          transaction_description: "Compra no Débito",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "19",
          user_id: userId,
          rule_name: "Tarifa",
          bank_description_pattern: "TARIFA",
          transaction_description: "Tarifa Bancária",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "20",
          user_id: userId,
          rule_name: "Débito Geral",
          bank_description_pattern: "DEBITO",
          transaction_description: "Débito",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true,
          created_at: new Date().toISOString(),
        },
      ]

      localStorage.setItem(`reconciliation_rules_${userId}`, JSON.stringify(defaultRules))
      console.log("✅ Regras padrão OTIMIZADAS criadas no localStorage:", defaultRules.length)
      return defaultRules
    }

    const parsedRules = JSON.parse(rules)
    console.log("✅ Regras carregadas do localStorage:", parsedRules.length)
    return parsedRules
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error("❌ Cliente Supabase não disponível")
    return []
  }

  const { data, error } = await supabase
    .from("reconciliation_rules")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("rule_name")

  if (error) {
    console.error("❌ Erro ao buscar regras:", error)
    return []
  }

  console.log("✅ Regras carregadas do Supabase:", data?.length || 0)
  return data || []
}

// Função para limpar e formatar a descrição original do OFX
function formatOriginalDescription(originalDescription: string): string {
  return originalDescription
    .replace(/\s+/g, " ") // Múltiplos espaços em um só
    .trim()
    .toLowerCase() // Converter para minúscula para ficar mais legível
    .replace(/\b\w/g, (l) => l.toUpperCase()) // Primeira letra de cada palavra maiúscula
    .substring(0, 200) // Limitar tamanho
}

// NOVA FUNÇÃO - Conciliar transações selecionadas
export async function reconcileSelectedTransactions(
  userId: string,
  selectedTransactionIds: string[],
  allTransactions: BankTransaction[],
): Promise<{ reconciled: number; created: number; details: any[] }> {
  console.log("🎯 === INICIANDO CONCILIAÇÃO SELECIONADA ===")
  console.log("📊 Transações selecionadas:", selectedTransactionIds.length)

  const selectedTransactions = allTransactions.filter((txn) => selectedTransactionIds.includes(txn.id))
  console.log("✅ Transações filtradas:", selectedTransactions.length)

  // Usar a mesma lógica da conciliação automática, mas apenas para as selecionadas
  return await autoReconcileTransactions(userId, selectedTransactions)
}

// Conciliar transações automaticamente - VERSÃO MELHORADA COM MAIS DEBUG
export async function autoReconcileTransactions(
  userId: string,
  bankTransactions: BankTransaction[],
): Promise<{ reconciled: number; created: number; details: any[] }> {
  console.log("🔄 === INICIANDO CONCILIAÇÃO AUTOMÁTICA ===")
  console.log("📊 Total de transações bancárias:", bankTransactions.length)

  const rules = await getReconciliationRules(userId)
  console.log("📋 Total de regras carregadas:", rules.length)

  if (rules.length === 0) {
    console.error("❌ ERRO: Nenhuma regra de conciliação encontrada!")
    return { reconciled: 0, created: 0, details: [] }
  }

  if (bankTransactions.length === 0) {
    console.error("❌ ERRO: Nenhuma transação bancária para conciliar!")
    return { reconciled: 0, created: 0, details: [] }
  }

  console.log("📋 Regras disponíveis:")
  rules.forEach((rule, index) => {
    console.log(
      `  ${index + 1}. ${rule.rule_name} - Padrão: "${rule.bank_description_pattern}" - Tipo: ${rule.transaction_type} - Ativo: ${rule.active} - Auto: ${rule.auto_reconcile}`,
    )
  })

  let reconciledCount = 0
  let createdCount = 0
  const details: any[] = []

  console.log("🔍 === PROCESSANDO TRANSAÇÕES ===")

  for (let i = 0; i < bankTransactions.length; i++) {
    const bankTxn = bankTransactions[i]
    console.log(`\n--- Transação ${i + 1}/${bankTransactions.length} ---`)

    if (bankTxn.reconciled) {
      console.log("⏭️ JÁ CONCILIADA - Pulando:", bankTxn.description.substring(0, 50))
      details.push({
        transaction: bankTxn.description.substring(0, 50),
        status: "already_reconciled",
        rule: null,
        created: false,
      })
      continue
    }

    console.log("📝 Descrição original:", `"${bankTxn.description}"`)
    console.log("💰 Valor:", bankTxn.amount)
    console.log("🏦 Tipo bancário:", bankTxn.transaction_type)
    console.log("📅 Data:", bankTxn.transaction_date)

    // Buscar regra aplicável com debug detalhado
    let applicableRule: ReconciliationRule | null = null
    const bankDescriptionUpper = bankTxn.description.toUpperCase()
    console.log("🔍 Descrição em maiúscula para matching:", `"${bankDescriptionUpper}"`)

    // MELHORAR O MATCHING - Ordenar regras por especificidade
    const sortedRules = [...rules].sort((a, b) => {
      // Regras mais específicas primeiro (padrões mais longos)
      return b.bank_description_pattern.length - a.bank_description_pattern.length
    })

    for (let j = 0; j < sortedRules.length; j++) {
      const rule = sortedRules[j]
      console.log(`\n  🔍 Testando regra ${j + 1}: "${rule.rule_name}"`)

      if (!rule.active) {
        console.log("  ❌ Regra inativa - pulando")
        continue
      }

      if (!rule.auto_reconcile) {
        console.log("  ❌ Auto-conciliação desabilitada - pulando")
        continue
      }

      // Limpar padrão e converter para maiúscula
      const pattern = rule.bank_description_pattern.replace(/%/g, "").toUpperCase().trim()
      console.log(`  📋 Padrão limpo: "${pattern}"`)
      console.log(`  🔍 Verificando se "${bankDescriptionUpper}" contém "${pattern}"`)

      const patternMatch = bankDescriptionUpper.includes(pattern)
      console.log(`  📊 Match do padrão: ${patternMatch}`)

      if (patternMatch) {
        console.log("  ✅ PADRÃO ENCONTRADO!")

        // Verificar compatibilidade de tipo
        const expectedTransactionType = bankTxn.transaction_type === "credit" ? "entrada" : "despesa"
        console.log(`  🔄 Tipo esperado: "${expectedTransactionType}" vs Tipo da regra: "${rule.transaction_type}"`)

        const typeMatch = rule.transaction_type === expectedTransactionType
        console.log(`  📊 Match do tipo: ${typeMatch}`)

        if (typeMatch) {
          applicableRule = rule
          console.log(`  🎯 REGRA APLICÁVEL ENCONTRADA: "${rule.rule_name}"`)
          break
        } else {
          console.log("  ❌ Tipo incompatível")
        }
      } else {
        console.log("  ❌ Padrão não encontrado")
      }
    }

    if (applicableRule) {
      console.log(`\n🚀 APLICANDO REGRA: "${applicableRule.rule_name}"`)

      try {
        // Determinar descrição final
        let finalDescription: string
        if (applicableRule.use_original_description) {
          finalDescription = formatOriginalDescription(bankTxn.description)
          console.log("📝 Usando descrição original formatada:", `"${finalDescription}"`)
        } else {
          finalDescription = applicableRule.transaction_description
          console.log("📝 Usando descrição da regra:", `"${finalDescription}"`)
        }

        // Determinar mês/ano
        const monthYear = bankTxn.transaction_date.substring(0, 7) // YYYY-MM
        console.log("📅 Mês/Ano para transação:", monthYear)

        console.log("💾 Criando transação no sistema...")
        console.log("  - Usuário:", userId)
        console.log("  - Descrição:", finalDescription)
        console.log("  - Valor:", bankTxn.amount)
        console.log("  - Tipo:", applicableRule.transaction_type)
        console.log("  - Mês/Ano:", monthYear)

        // Criar transação no sistema
        const newTransaction = await addTransaction(
          userId,
          finalDescription,
          bankTxn.amount,
          applicableRule.transaction_type,
          monthYear,
        )

        if (newTransaction) {
          console.log("✅ TRANSAÇÃO CRIADA COM SUCESSO!")
          console.log("  - ID:", newTransaction.id)
          console.log("  - Descrição final:", newTransaction.description)

          // Marcar como conciliada
          console.log("🔗 Marcando como conciliada...")
          const marked = await markAsReconciled(bankTxn.id, newTransaction.id)

          if (marked) {
            reconciledCount++
            createdCount++
            console.log("✅ TRANSAÇÃO MARCADA COMO CONCILIADA!")

            details.push({
              transaction: bankTxn.description.substring(0, 50),
              status: "success",
              rule: applicableRule.rule_name,
              created: true,
              finalDescription: finalDescription,
            })
          } else {
            console.error("❌ ERRO ao marcar como conciliada")
            details.push({
              transaction: bankTxn.description.substring(0, 50),
              status: "mark_failed",
              rule: applicableRule.rule_name,
              created: true,
              error: "Falha ao marcar como conciliada",
            })
          }
        } else {
          console.error("❌ ERRO ao criar transação no sistema")
          details.push({
            transaction: bankTxn.description.substring(0, 50),
            status: "creation_failed",
            rule: applicableRule.rule_name,
            created: false,
            error: "Falha ao criar transação",
          })
        }
      } catch (error) {
        console.error("❌ ERRO CRÍTICO ao processar transação:", error)
        details.push({
          transaction: bankTxn.description.substring(0, 50),
          status: "error",
          rule: applicableRule?.rule_name || "unknown",
          created: false,
          error: String(error),
        })
      }
    } else {
      console.log("❌ NENHUMA REGRA APLICÁVEL ENCONTRADA")
      console.log("  Descrição:", bankTxn.description.substring(0, 50))
      details.push({
        transaction: bankTxn.description.substring(0, 50),
        status: "no_rule",
        rule: null,
        created: false,
      })
    }
  }

  console.log("\n🎉 === CONCILIAÇÃO AUTOMÁTICA CONCLUÍDA ===")
  console.log("📊 Resultados:")
  console.log("  - Transações processadas:", bankTransactions.length)
  console.log("  - Transações conciliadas:", reconciledCount)
  console.log("  - Transações criadas:", createdCount)
  console.log(
    "  - Taxa de sucesso:",
    `${((createdCount / bankTransactions.filter((t) => !t.reconciled).length) * 100).toFixed(1)}%`,
  )

  return { reconciled: reconciledCount, created: createdCount, details }
}

// Marcar transação como conciliada
export async function markAsReconciled(bankTransactionId: string, transactionId: string): Promise<boolean> {
  console.log("🔗 Marcando transação como conciliada:", { bankTransactionId, transactionId })

  if (!isSupabaseConfigured) {
    // Implementação localStorage
    const userId = JSON.parse(localStorage.getItem("user") || "{}")?.id
    if (!userId) {
      console.error("❌ Usuário não encontrado no localStorage")
      return false
    }

    const bankTransactions = JSON.parse(localStorage.getItem(`bank_transactions_${userId}`) || "[]")
    const txnIndex = bankTransactions.findIndex((txn: BankTransaction) => txn.id === bankTransactionId)

    if (txnIndex !== -1) {
      bankTransactions[txnIndex].reconciled = true
      bankTransactions[txnIndex].reconciled_transaction_id = transactionId
      localStorage.setItem(`bank_transactions_${userId}`, JSON.stringify(bankTransactions))
      console.log("✅ Transação marcada como conciliada no localStorage")
      return true
    } else {
      console.error("❌ Transação bancária não encontrada no localStorage")
      return false
    }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error("❌ Cliente Supabase não disponível")
    return false
  }

  const { error } = await supabase
    .from("bank_transactions")
    .update({
      reconciled: true,
      reconciled_transaction_id: transactionId,
    })
    .eq("id", bankTransactionId)

  if (error) {
    console.error("❌ Erro ao marcar como conciliada no Supabase:", error)
    return false
  }

  console.log("✅ Transação marcada como conciliada no Supabase")
  return true
}

// Buscar transações bancárias não conciliadas
export async function getUnreconciledTransactions(userId: string): Promise<BankTransaction[]> {
  console.log("🔍 Buscando transações não conciliadas para usuário:", userId)

  if (!isSupabaseConfigured) {
    const bankTransactions = localStorage.getItem(`bank_transactions_${userId}`)
    const transactions = bankTransactions ? JSON.parse(bankTransactions) : []
    const unreconciled = transactions.filter((txn: BankTransaction) => !txn.reconciled)
    console.log("💾 Transações não conciliadas no localStorage:", unreconciled.length)
    return unreconciled
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error("❌ Cliente Supabase não disponível")
    return []
  }

  const { data, error } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("reconciled", false)
    .order("transaction_date", { ascending: false })

  if (error) {
    console.error("❌ Erro ao buscar transações não conciliadas:", error)
    return []
  }

  console.log("☁️ Transações não conciliadas no Supabase:", data?.length || 0)
  return data || []
}

// Buscar extratos importados
export async function getBankStatements(userId: string): Promise<BankStatement[]> {
  if (!isSupabaseConfigured) {
    const statements = localStorage.getItem(`bank_statements_${userId}`)
    return statements ? JSON.parse(statements) : []
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("bank_statements")
    .select("*")
    .eq("user_id", userId)
    .order("imported_at", { ascending: false })

  if (error) {
    console.error("❌ Erro ao buscar extratos:", error)
    return []
  }

  return data || []
}
