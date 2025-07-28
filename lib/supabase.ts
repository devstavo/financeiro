import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Pega as variáveis de ambiente e remove espaços extras
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ""

// --- LINHAS DE DEBUG MELHORADAS ---
console.log("DEBUG: NEXT_PUBLIC_SUPABASE_URL lida:", supabaseUrl || "VAZIA/UNDEFINED")
console.log("DEBUG: URL válida?", supabaseUrl ? "SIM" : "NÃO")
console.log("DEBUG: URL começa com https://?", supabaseUrl.startsWith("https://"))
console.log("DEBUG: URL contém .supabase.co?", supabaseUrl.includes(".supabase.co"))
console.log(
  "DEBUG: NEXT_PUBLIC_SUPABASE_ANON_KEY lida:",
  supabaseAnonKey ? `Chave presente (${supabaseAnonKey.length} caracteres)` : "VAZIA/UNDEFINED",
)

// Validação mais rigorosa
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return url.startsWith("https://") && url.includes(".supabase.co")
  } catch {
    return false
  }
}

// Verifica se o Supabase está configurado corretamente
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  isValidUrl(supabaseUrl) &&
  supabaseAnonKey.length > 20
)

console.log("DEBUG: isSupabaseConfigured:", isSupabaseConfigured)
// --- FIM DAS LINHAS DE DEBUG ---

let supabaseClientInstance: SupabaseClient | null = null

// Função para obter a instância do cliente Supabase
export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured) {
    console.log("DEBUG: Supabase não configurado, retornando null")
    return null
  }

  // Usa o padrão Singleton para criar o cliente apenas uma vez
  if (!supabaseClientInstance) {
    try {
      console.log("DEBUG: Tentando criar cliente Supabase...")
      supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey)
      console.log("DEBUG: Cliente Supabase criado com sucesso!")
    } catch (e) {
      console.error("Erro ao criar cliente Supabase. Verifique suas variáveis de ambiente:", e)
      console.error("DEBUG: URL fornecida:", supabaseUrl)
      console.error("DEBUG: Chave fornecida:", supabaseAnonKey ? "Presente" : "Ausente")
      supabaseClientInstance = null
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
