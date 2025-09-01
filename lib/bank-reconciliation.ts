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
  use_original_description: boolean // NOVO CAMPO
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

// Buscar regras de conciliação
export async function getReconciliationRules(userId: string): Promise<ReconciliationRule[]> {
  console.log("📋 Buscando regras de conciliação para usuário:", userId)

  if (!isSupabaseConfigured) {
    console.log("💾 Usando localStorage para regras")
    const rules = localStorage.getItem(`reconciliation_rules_${userId}`)

    if (!rules) {
      // Criar regras padrão no localStorage se não existirem
      const defaultRules: ReconciliationRule[] = [
        {
          id: "1",
          user_id: userId,
          rule_name: "Salário",
          bank_description_pattern: "SALARIO",
          transaction_description: "Salário",
          transaction_type: "entrada",
          auto_reconcile: true,
          active: true,
          use_original_description: true, // Usar descrição original
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
          use_original_description: true, // Usar descrição original
          created_at: new Date().toISOString(),
        },
        {
          id: "3",
          user_id: userId,
          rule_name: "PIX Enviado",
          bank_description_pattern: "PIX ENVIADO",
          transaction_description: "PIX Enviado",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true, // Usar descrição original
          created_at: new Date().toISOString(),
        },
        {
          id: "4",
          user_id: userId,
          rule_name: "TED",
          bank_description_pattern: "TED",
          transaction_description: "Transferência TED",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true, // Usar descrição original
          created_at: new Date().toISOString(),
        },
        {
          id: "5",
          user_id: userId,
          rule_name: "Cartão",
          bank_description_pattern: "CARTAO",
          transaction_description: "Cartão de Crédito",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true, // Usar descrição original
          created_at: new Date().toISOString(),
        },
        {
          id: "6",
          user_id: userId,
          rule_name: "Depósito",
          bank_description_pattern: "DEPOSITO",
          transaction_description: "Depósito",
          transaction_type: "entrada",
          auto_reconcile: true,
          active: true,
          use_original_description: true, // Usar descrição original
          created_at: new Date().toISOString(),
        },
        {
          id: "7",
          user_id: userId,
          rule_name: "Saque",
          bank_description_pattern: "SAQUE",
          transaction_description: "Saque",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true, // Usar descrição original
          created_at: new Date().toISOString(),
        },
        {
          id: "8",
          user_id: userId,
          rule_name: "Débito Automático",
          bank_description_pattern: "DEB AUTOMATICO",
          transaction_description: "Débito Automático",
          transaction_type: "despesa",
          auto_reconcile: true,
          active: true,
          use_original_description: true, // Usar descrição original
          created_at: new Date().toISOString(),
        },
      ]

      localStorage.setItem(`reconciliation_rules_${userId}`, JSON.stringify(defaultRules))
      console.log("✅ Regras padrão criadas no localStorage:", defaultRules.length)
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

// Conciliar transações automaticamente
export async function autoReconcileTransactions(
  userId: string,
  bankTransactions: BankTransaction[],
): Promise<{ reconciled: number; created: number }> {
  console.log("🔄 Iniciando conciliação automática...", bankTransactions.length, "transações")

  const rules = await getReconciliationRules(userId)
  console.log("📋 Regras de conciliação carregadas:", rules.length)
  console.log(
    "📋 Regras disponíveis:",
    rules.map((r) => ({
      name: r.rule_name,
      pattern: r.bank_description_pattern,
      type: r.transaction_type,
      useOriginal: r.use_original_description,
    })),
  )

  let reconciledCount = 0
  let createdCount = 0

  for (const bankTxn of bankTransactions) {
    if (bankTxn.reconciled) {
      console.log("⏭️ Transação já conciliada, pulando:", bankTxn.description.substring(0, 50))
      continue // Já conciliada
    }

    console.log("🔍 Processando transação bancária:")
    console.log("  - Descrição original:", bankTxn.description)
    console.log("  - Tipo bancário:", bankTxn.transaction_type)
    console.log("  - Valor:", bankTxn.amount)
    console.log("  - Data:", bankTxn.transaction_date)

    // Buscar regra aplicável - melhorar o matching
    let applicableRule: ReconciliationRule | null = null
    const bankDescriptionUpper = bankTxn.description.toUpperCase()

    for (const rule of rules) {
      if (!rule.active) continue

      // Remover % e converter para maiúscula
      const pattern = rule.bank_description_pattern.replace(/%/g, "").toUpperCase()
      console.log("  🔍 Testando regra:", rule.rule_name, "padrão:", pattern)

      if (bankDescriptionUpper.includes(pattern)) {
        console.log("  ✅ Padrão encontrado na descrição!")

        // Verificar se o tipo da regra é compatível com o tipo da transação bancária
        const expectedTransactionType = bankTxn.transaction_type === "credit" ? "entrada" : "despesa"
        console.log("  - Tipo esperado:", expectedTransactionType, "vs Tipo da regra:", rule.transaction_type)

        if (rule.transaction_type === expectedTransactionType) {
          applicableRule = rule
          console.log("  ✅ Regra compatível encontrada:", rule.rule_name)
          break
        } else {
          console.log("  ❌ Tipo da regra não compatível")
        }
      } else {
        console.log("  ❌ Padrão não encontrado")
      }
    }

    if (applicableRule && applicableRule.auto_reconcile) {
      console.log("✅ Aplicando regra:", applicableRule.rule_name)

      try {
        // Determinar qual descrição usar
        let finalDescription: string

        if (applicableRule.use_original_description) {
          // Usar a descrição original do OFX, mas formatada
          finalDescription = formatOriginalDescription(bankTxn.description)
          console.log("📝 Usando descrição original formatada:", finalDescription)
        } else {
          // Usar a descrição padrão da regra
          finalDescription = applicableRule.transaction_description
          console.log("📝 Usando descrição da regra:", finalDescription)
        }

        // Criar transação no sistema
        const monthYear = bankTxn.transaction_date.substring(0, 7) // YYYY-MM
        console.log("📅 Mês/Ano para transação:", monthYear)

        const newTransaction = await addTransaction(
          userId,
          finalDescription, // Usar a descrição determinada acima
          bankTxn.amount,
          applicableRule.transaction_type,
          monthYear,
        )

        if (newTransaction) {
          console.log("✅ Transação criada no sistema:", newTransaction.id, "com descrição:", finalDescription)

          // Marcar como conciliada
          const marked = await markAsReconciled(bankTxn.id, newTransaction.id)
          if (marked) {
            reconciledCount++
            createdCount++
            console.log("✅ Transação marcada como conciliada")
          } else {
            console.error("❌ Erro ao marcar como conciliada")
          }
        } else {
          console.error("❌ Erro ao criar transação no sistema")
        }
      } catch (error) {
        console.error("❌ Erro ao processar transação:", error)
      }
    } else {
      console.log("❌ Nenhuma regra aplicável encontrada para:", bankTxn.description.substring(0, 50))
    }
  }

  console.log("🎉 Conciliação automática concluída:", { reconciledCount, createdCount })
  return { reconciled: reconciledCount, created: createdCount }
}

// Marcar transação como conciliada
export async function markAsReconciled(bankTransactionId: string, transactionId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    // Implementação localStorage
    const userId = JSON.parse(localStorage.getItem("user") || "{}")?.id
    if (!userId) return false

    const bankTransactions = JSON.parse(localStorage.getItem(`bank_transactions_${userId}`) || "[]")
    const txnIndex = bankTransactions.findIndex((txn: BankTransaction) => txn.id === bankTransactionId)

    if (txnIndex !== -1) {
      bankTransactions[txnIndex].reconciled = true
      bankTransactions[txnIndex].reconciled_transaction_id = transactionId
      localStorage.setItem(`bank_transactions_${userId}`, JSON.stringify(bankTransactions))
      return true
    }
    return false
  }

  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase
    .from("bank_transactions")
    .update({
      reconciled: true,
      reconciled_transaction_id: transactionId,
    })
    .eq("id", bankTransactionId)

  return !error
}

// Buscar transações bancárias não conciliadas
export async function getUnreconciledTransactions(userId: string): Promise<BankTransaction[]> {
  if (!isSupabaseConfigured) {
    const bankTransactions = localStorage.getItem(`bank_transactions_${userId}`)
    const transactions = bankTransactions ? JSON.parse(bankTransactions) : []
    return transactions.filter((txn: BankTransaction) => !txn.reconciled)
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

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
