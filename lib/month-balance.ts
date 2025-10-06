import { getSupabaseClient, isSupabaseConfigured } from "./supabase"

export interface MonthBalance {
  id: string
  user_id: string
  month_year: string
  opening_balance: number
  closing_balance: number
  total_income: number
  total_expenses: number
  ofx_balance?: number
  difference?: number
  is_closed: boolean
  closed_at?: string
  created_at: string
  updated_at: string
}

// Função auxiliar: calcular mês anterior
function getPreviousMonth(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number)
  const date = new Date(year, month - 1, 1)
  date.setMonth(date.getMonth() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

// Buscar saldo de um mês específico
export async function getMonthBalance(userId: string, monthYear: string): Promise<MonthBalance | null> {
  if (!isSupabaseConfigured) {
    const balances = JSON.parse(localStorage.getItem(`month_balances_${userId}`) || "[]")
    return balances.find((b: MonthBalance) => b.month_year === monthYear) || null
  }

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("month_balance")
    .select("*")
    .eq("user_id", userId)
    .eq("month_year", monthYear)
    .single()

  if (error && error.code !== "PGRST116") {
    return null
  }

  return data
}

// Buscar saldo do mês anterior (para saldo de abertura)
export async function getPreviousMonthBalance(userId: string, currentMonthYear: string): Promise<number> {
  const prevMonth = getPreviousMonth(currentMonthYear)
  const balance = await getMonthBalance(userId, prevMonth)
  return balance?.closing_balance || 0
}

// Buscar todos os saldos mensais do usuário
export async function getAllMonthBalances(userId: string): Promise<MonthBalance[]> {
  if (!isSupabaseConfigured) {
    const balances = JSON.parse(localStorage.getItem(`month_balances_${userId}`) || "[]")
    return balances.sort((a: MonthBalance, b: MonthBalance) => b.month_year.localeCompare(a.month_year))
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("month_balance")
    .select("*")
    .eq("user_id", userId)
    .order("month_year", { ascending: false })

  if (error) {
    return []
  }

  return data || []
}

// Atualizar ou criar saldo do mês
export async function updateMonthBalance(
  userId: string,
  monthYear: string,
  totalIncome: number,
  totalExpenses: number,
): Promise<MonthBalance | null> {
  const openingBalance = await getPreviousMonthBalance(userId, monthYear)
  const closingBalance = openingBalance + totalIncome - totalExpenses

  if (!isSupabaseConfigured) {
    const balances = JSON.parse(localStorage.getItem(`month_balances_${userId}`) || "[]")
    const existingIndex = balances.findIndex((b: MonthBalance) => b.month_year === monthYear)

    const balance: MonthBalance = {
      id: existingIndex >= 0 ? balances[existingIndex].id : `${userId}_${monthYear}_${Date.now()}`,
      user_id: userId,
      month_year: monthYear,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      is_closed: false,
      created_at: existingIndex >= 0 ? balances[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      balances[existingIndex] = { ...balances[existingIndex], ...balance }
    } else {
      balances.push(balance)
    }

    localStorage.setItem(`month_balances_${userId}`, JSON.stringify(balances))
    return balance
  }

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data: existing } = await supabase
    .from("month_balance")
    .select("*")
    .eq("user_id", userId)
    .eq("month_year", monthYear)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from("month_balance")
      .update({
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("month_year", monthYear)
      .select()
      .single()

    if (error) return null
    return data
  } else {
    const { data, error } = await supabase
      .from("month_balance")
      .insert({
        id: `${userId}_${monthYear}_${Date.now()}`,
        user_id: userId,
        month_year: monthYear,
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        total_income: totalIncome,
        total_expenses: totalExpenses,
      })
      .select()
      .single()

    if (error) return null
    return data
  }
}

// Atualizar saldo do OFX importado
export async function updateOFXBalance(userId: string, monthYear: string, ofxBalance: number): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const balances = JSON.parse(localStorage.getItem(`month_balances_${userId}`) || "[]")
    const index = balances.findIndex((b: MonthBalance) => b.month_year === monthYear)

    if (index >= 0) {
      balances[index].ofx_balance = ofxBalance
      balances[index].difference = balances[index].closing_balance - ofxBalance
      balances[index].updated_at = new Date().toISOString()
    } else {
      balances.push({
        id: `${userId}_${monthYear}_${Date.now()}`,
        user_id: userId,
        month_year: monthYear,
        opening_balance: 0,
        closing_balance: 0,
        total_income: 0,
        total_expenses: 0,
        ofx_balance: ofxBalance,
        difference: -ofxBalance,
        is_closed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    localStorage.setItem(`month_balances_${userId}`, JSON.stringify(balances))
    return true
  }

  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase.from("month_balance").upsert(
    {
      user_id: userId,
      month_year: monthYear,
      ofx_balance: ofxBalance,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,month_year",
    },
  )

  return !error
}

// Fechar mês
export async function closeMonthBalance(userId: string, monthYear: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const balances = JSON.parse(localStorage.getItem(`month_balances_${userId}`) || "[]")
    const balance = balances.find((b: MonthBalance) => b.month_year === monthYear)

    if (balance) {
      balance.is_closed = true
      balance.closed_at = new Date().toISOString()
      balance.updated_at = new Date().toISOString()
      localStorage.setItem(`month_balances_${userId}`, JSON.stringify(balances))
      return true
    }
    return false
  }

  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase
    .from("month_balance")
    .update({
      is_closed: true,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("month_year", monthYear)

  return !error
}
