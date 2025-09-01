declare global {
  interface Window {
    // Adicione propriedades globais do window se necessário
  }
}

// Tipos para o sistema financeiro
export interface User {
  id: string
  username: string
  created_at?: string
}

export interface Transaction {
  id: string
  user_id: string
  description: string
  amount: number
  type: "entrada" | "despesa"
  transaction_date: string
  month_year: string
  created_at: string
}

export interface ClosedMonth {
  id: string
  user_id: string
  month_year: string
  total_entradas: number
  total_despesas: number
  saldo_total: number
  closed_at: string
}

// Tipos para dívidas
export interface Person {
  id: string
  user_id: string
  name: string
  phone?: string
  email?: string
  notes?: string
  created_at: string
}

export interface Debt {
  id: string
  user_id: string
  person_id: string
  person_name?: string
  description: string
  original_amount: number
  remaining_amount: number
  type: "a_receber" | "a_pagar"
  due_date?: string
  status: "pendente" | "pago" | "cancelado"
  created_at: string
  updated_at: string
}

// Tipos para conciliação bancária
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
