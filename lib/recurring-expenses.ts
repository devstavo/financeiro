import { getSupabaseClient, isSupabaseConfigured } from "./supabase"

export interface RecurringExpense {
  id: string
  user_id: string
  description: string
  amount: number
  category: string
  day_of_month: number
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export const EXPENSE_CATEGORIES = [
  "Educação",
  "Transporte",
  "Saúde",
  "Moradia",
  "Alimentação",
  "Lazer",
  "Assinaturas",
  "Outros",
] as const

// Buscar todos os gastos fixos do usuário
export async function getRecurringExpenses(userId: string, activeOnly = true): Promise<RecurringExpense[]> {
  if (!isSupabaseConfigured) {
    const expenses = JSON.parse(localStorage.getItem(`recurring_expenses_${userId}`) || "[]")
    return activeOnly ? expenses.filter((e: RecurringExpense) => e.is_active) : expenses
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  let query = supabase.from("recurring_expenses").select("*").eq("user_id", userId)

  if (activeOnly) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query.order("day_of_month", { ascending: true })

  if (error) {
    console.error("Erro ao buscar gastos fixos:", error)
    return []
  }

  return data || []
}

// Adicionar novo gasto fixo
export async function addRecurringExpense(
  userId: string,
  description: string,
  amount: number,
  category: string,
  dayOfMonth: number,
  notes?: string,
): Promise<RecurringExpense | null> {
  const newExpense: RecurringExpense = {
    id: `${userId}_${Date.now()}`,
    user_id: userId,
    description,
    amount,
    category,
    day_of_month: dayOfMonth,
    is_active: true,
    notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (!isSupabaseConfigured) {
    const expenses = JSON.parse(localStorage.getItem(`recurring_expenses_${userId}`) || "[]")
    expenses.push(newExpense)
    localStorage.setItem(`recurring_expenses_${userId}`, JSON.stringify(expenses))
    return newExpense
  }

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase.from("recurring_expenses").insert(newExpense).select().single()

  if (error) {
    console.error("Erro ao adicionar gasto fixo:", error)
    return null
  }

  return data
}

// Atualizar gasto fixo
export async function updateRecurringExpense(expenseId: string, updates: Partial<RecurringExpense>): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const userId = updates.user_id || ""
    const expenses = JSON.parse(localStorage.getItem(`recurring_expenses_${userId}`) || "[]")
    const index = expenses.findIndex((e: RecurringExpense) => e.id === expenseId)

    if (index >= 0) {
      expenses[index] = {
        ...expenses[index],
        ...updates,
        updated_at: new Date().toISOString(),
      }
      localStorage.setItem(`recurring_expenses_${userId}`, JSON.stringify(expenses))
      return true
    }
    return false
  }

  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase
    .from("recurring_expenses")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)

  return !error
}

// Desativar gasto fixo (ao invés de deletar)
export async function deactivateRecurringExpense(expenseId: string): Promise<boolean> {
  return updateRecurringExpense(expenseId, { is_active: false })
}

// Reativar gasto fixo
export async function reactivateRecurringExpense(expenseId: string): Promise<boolean> {
  return updateRecurringExpense(expenseId, { is_active: true })
}

// Deletar permanentemente
export async function deleteRecurringExpense(userId: string, expenseId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const expenses = JSON.parse(localStorage.getItem(`recurring_expenses_${userId}`) || "[]")
    const filtered = expenses.filter((e: RecurringExpense) => e.id !== expenseId)
    localStorage.setItem(`recurring_expenses_${userId}`, JSON.stringify(filtered))
    return true
  }

  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase.from("recurring_expenses").delete().eq("id", expenseId)

  return !error
}

// Calcular total de gastos fixos por categoria
export async function getTotalByCategory(userId: string): Promise<Record<string, number>> {
  const expenses = await getRecurringExpenses(userId, true)
  const totals: Record<string, number> = {}

  for (const expense of expenses) {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount
  }

  return totals
}

// Calcular total mensal de gastos fixos
export async function getMonthlyTotal(userId: string): Promise<number> {
  const expenses = await getRecurringExpenses(userId, true)
  return expenses.reduce((sum, expense) => sum + expense.amount, 0)
}
