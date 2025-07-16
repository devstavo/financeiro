import { getSupabaseClient, isSupabaseConfigured } from "./supabase"

// Função para fazer login
export async function loginUser(username: string, password: string) {
  // Se Supabase não estiver configurado, usar validação local
  if (!isSupabaseConfigured) {
    if (username === "ita" && password === "ita") {
      return {
        success: true,
        user: {
          id: "local-user",
          username: "ita",
        },
      }
    }
    return { success: false, error: "Usuário ou senha incorretos" }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, error: "Erro de configuração" }
  }

  const { data, error } = await supabase.from("users").select("id, username").eq("username", username).single()

  if (error || !data) {
    return { success: false, error: "Usuário ou senha incorretos" }
  }

  if (username === "ita" && password === "ita") {
    return { success: true, user: data }
  }

  return { success: false, error: "Usuário ou senha incorretos" }
}

// Buscar transações de um mês específico
export async function getTransactionsByMonth(userId: string, monthYear: string) {
  if (!isSupabaseConfigured) {
    // Fallback para localStorage
    const monthsHistory = localStorage.getItem("monthsHistory")
    if (monthsHistory) {
      const history = JSON.parse(monthsHistory)
      const monthData = history.find((m: any) => m.month === monthYear)
      return monthData ? monthData.transactions : []
    }
    return []
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("month_year", monthYear)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar transações:", error)
    return []
  }

  return data || []
}

// Adicionar nova transação
export async function addTransaction(
  userId: string,
  description: string,
  amount: number,
  type: "entrada" | "despesa",
  monthYear: string,
) {
  if (!isSupabaseConfigured) {
    // Fallback para localStorage
    const newTransaction = {
      id: Date.now().toString(),
      user_id: userId,
      description,
      amount,
      type,
      transaction_date: new Date().toISOString().split("T")[0],
      month_year: monthYear,
      created_at: new Date().toISOString(),
    }

    const monthsHistory = JSON.parse(localStorage.getItem("monthsHistory") || "[]")
    let monthData = monthsHistory.find((m: any) => m.month === monthYear)

    if (!monthData) {
      monthData = {
        month: monthYear,
        transactions: [],
        closed: false,
        totalEntradas: 0,
        totalDespesas: 0,
        saldoTotal: 0,
      }
      monthsHistory.push(monthData)
    }

    monthData.transactions.push(newTransaction)
    localStorage.setItem("monthsHistory", JSON.stringify(monthsHistory))

    return newTransaction
  }

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      description,
      amount,
      type,
      transaction_date: new Date().toISOString().split("T")[0],
      month_year: monthYear,
    })
    .select()
    .single()

  if (error) {
    console.error("Erro ao adicionar transação:", error)
    return null
  }

  return data
}

// Remover transação
export async function removeTransaction(transactionId: string) {
  if (!isSupabaseConfigured) {
    // Fallback para localStorage
    const monthsHistory = JSON.parse(localStorage.getItem("monthsHistory") || "[]")

    for (const monthData of monthsHistory) {
      const transactionIndex = monthData.transactions.findIndex((t: any) => t.id === transactionId)
      if (transactionIndex !== -1) {
        monthData.transactions.splice(transactionIndex, 1)
        localStorage.setItem("monthsHistory", JSON.stringify(monthsHistory))
        return true
      }
    }
    return false
  }

  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase.from("transactions").delete().eq("id", transactionId)
  return !error
}

// Buscar todas as descrições únicas para sugestões
export async function getDescriptionSuggestions(userId: string) {
  if (!isSupabaseConfigured) {
    // Fallback para localStorage
    const monthsHistory = JSON.parse(localStorage.getItem("monthsHistory") || "[]")
    const allDescriptions = monthsHistory.flatMap((m: any) => m.transactions.map((t: any) => t.description))
    return [...new Set(allDescriptions)]
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase.from("transactions").select("description").eq("user_id", userId)

  if (error) {
    console.error("Erro ao buscar sugestões:", error)
    return []
  }

  const uniqueDescriptions = [...new Set(data.map((item) => item.description))]
  return uniqueDescriptions
}

// Fechar mês
export async function closeMonth(
  userId: string,
  monthYear: string,
  totalEntradas: number,
  totalDespesas: number,
  saldoTotal: number,
) {
  if (!isSupabaseConfigured) {
    // Fallback para localStorage
    const monthsHistory = JSON.parse(localStorage.getItem("monthsHistory") || "[]")
    const monthData = monthsHistory.find((m: any) => m.month === monthYear)

    if (monthData) {
      monthData.closed = true
      monthData.totalEntradas = totalEntradas
      monthData.totalDespesas = totalDespesas
      monthData.saldoTotal = saldoTotal
      localStorage.setItem("monthsHistory", JSON.stringify(monthsHistory))

      return {
        id: Date.now().toString(),
        user_id: userId,
        month_year: monthYear,
        total_entradas: totalEntradas,
        total_despesas: totalDespesas,
        saldo_total: saldoTotal,
        closed_at: new Date().toISOString(),
      }
    }
    return null
  }

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("closed_months")
    .insert({
      user_id: userId,
      month_year: monthYear,
      total_entradas: totalEntradas,
      total_despesas: totalDespesas,
      saldo_total: saldoTotal,
    })
    .select()
    .single()

  if (error) {
    console.error("Erro ao fechar mês:", error)
    return null
  }

  return data
}

// Verificar se mês está fechado
export async function isMonthClosed(userId: string, monthYear: string) {
  if (!isSupabaseConfigured) {
    // Fallback para localStorage
    const monthsHistory = JSON.parse(localStorage.getItem("monthsHistory") || "[]")
    const monthData = monthsHistory.find((m: any) => m.month === monthYear)
    return monthData ? monthData.closed : false
  }

  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { data, error } = await supabase
    .from("closed_months")
    .select("id")
    .eq("user_id", userId)
    .eq("month_year", monthYear)
    .single()

  return !error && data !== null
}

// Buscar histórico de meses fechados
export async function getClosedMonths(userId: string) {
  if (!isSupabaseConfigured) {
    // Fallback para localStorage
    const monthsHistory = JSON.parse(localStorage.getItem("monthsHistory") || "[]")
    return monthsHistory
      .filter((m: any) => m.closed)
      .map((m: any) => ({
        id: m.month,
        user_id: userId,
        month_year: m.month,
        total_entradas: m.totalEntradas,
        total_despesas: m.totalDespesas,
        saldo_total: m.saldoTotal,
        closed_at: new Date().toISOString(),
      }))
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("closed_months")
    .select("*")
    .eq("user_id", userId)
    .order("month_year", { ascending: false })

  if (error) {
    console.error("Erro ao buscar meses fechados:", error)
    return []
  }

  return data || []
}

// Migrar dados do localStorage para Supabase
export async function migrateLocalStorageData(userId: string) {
  if (!isSupabaseConfigured) {
    console.log("Supabase não configurado, mantendo dados no localStorage")
    return
  }

  const supabase = getSupabaseClient()
  if (!supabase) return

  const monthsHistory = localStorage.getItem("monthsHistory")
  if (!monthsHistory) return

  try {
    const history = JSON.parse(monthsHistory)

    for (const monthData of history) {
      // Migrar transações
      for (const transaction of monthData.transactions) {
        await addTransaction(userId, transaction.description, transaction.amount, transaction.type, monthData.month)
      }

      // Se o mês estava fechado, fechar no banco também
      if (monthData.closed) {
        await closeMonth(
          userId,
          monthData.month,
          monthData.totalEntradas,
          monthData.totalDespesas,
          monthData.saldoTotal,
        )
      }
    }

    // Limpar localStorage após migração
    localStorage.removeItem("monthsHistory")
    console.log("Dados migrados com sucesso!")
  } catch (error) {
    console.error("Erro na migração:", error)
  }
}

export type Transaction = {
  id: string
  user_id: string
  description: string
  amount: number
  type: "entrada" | "despesa"
  transaction_date: string
  month_year: string
  created_at: string
}

export type ClosedMonth = {
  id: string
  user_id: string
  month_year: string
  total_entradas: number
  total_despesas: number
  saldo_total: number
  closed_at: string
}
