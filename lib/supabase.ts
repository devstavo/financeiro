import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Pega as variáveis de ambiente e remove espaços extras
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ""

// Verifica se o Supabase está configurado corretamente
// A URL deve começar com 'https://', conter '.supabase.co' e a chave deve ter um tamanho razoável
export const isSupabaseConfigured = !!(
  (
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("https://") &&
    supabaseUrl.includes(".supabase.co") &&
    supabaseAnonKey.length > 20
  ) // Uma chave Supabase geralmente é bem longa
)

let supabaseClientInstance: SupabaseClient | null = null

// Função para obter a instância do cliente Supabase
// Ele só cria o cliente se as variáveis estiverem válidas
export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured) {
    return null // Não cria o cliente se não estiver configurado
  }

  // Usa o padrão Singleton para criar o cliente apenas uma vez
  if (!supabaseClientInstance) {
    try {
      supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey)
    } catch (e) {
      console.error("Erro ao criar cliente Supabase. Verifique suas variáveis de ambiente:", e)
      supabaseClientInstance = null // Se der erro, garante que a instância é nula
    }
  }
  return supabaseClientInstance
}

// Exporta o cliente Supabase (será null se não configurado)
export const supabase = getSupabaseClient()

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

export type User = {
  id: string
  username: string
  created_at: string
}
