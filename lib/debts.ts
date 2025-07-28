import { getSupabaseClient, isSupabaseConfigured } from "./supabase"

export type Person = {
  id: string
  user_id: string
  name: string
  phone?: string
  email?: string
  notes?: string
  created_at: string
}

export type Debt = {
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

export type DebtPayment = {
  id: string
  debt_id: string
  transaction_id: string
  amount: number
  payment_date: string
  notes?: string
  created_at: string
}

// Buscar todas as pessoas
export async function getPeople(userId: string): Promise<Person[]> {
  if (!isSupabaseConfigured) {
    const people = localStorage.getItem(`people_${userId}`)
    return people ? JSON.parse(people) : []
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase.from("people").select("*").eq("user_id", userId).order("name")

  if (error) {
    console.error("Erro ao buscar pessoas:", error)
    return []
  }

  return data || []
}

// Adicionar nova pessoa
export async function addPerson(
  userId: string,
  name: string,
  phone?: string,
  email?: string,
  notes?: string,
): Promise<Person | null> {
  const newPerson: Person = {
    id: Date.now().toString(),
    user_id: userId,
    name,
    phone,
    email,
    notes,
    created_at: new Date().toISOString(),
  }

  if (!isSupabaseConfigured) {
    const people = JSON.parse(localStorage.getItem(`people_${userId}`) || "[]")
    people.push(newPerson)
    localStorage.setItem(`people_${userId}`, JSON.stringify(people))
    return newPerson
  }

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("people")
    .insert({
      user_id: userId,
      name,
      phone,
      email,
      notes,
    })
    .select()
    .single()

  if (error) {
    console.error("Erro ao adicionar pessoa:", error)
    return null
  }

  return data
}

// NOVA FUNÇÃO - Deletar pessoa e todas suas dívidas
export async function deletePerson(userId: string, personId: string): Promise<boolean> {
  console.log("🗑️ Iniciando exclusão da pessoa:", personId)

  if (!isSupabaseConfigured) {
    // Implementação localStorage
    console.log("💾 Deletando no localStorage")

    // Deletar pessoa
    const people = JSON.parse(localStorage.getItem(`people_${userId}`) || "[]")
    const updatedPeople = people.filter((person: Person) => person.id !== personId)
    localStorage.setItem(`people_${userId}`, JSON.stringify(updatedPeople))

    // Deletar todas as dívidas da pessoa
    const debts = JSON.parse(localStorage.getItem(`debts_${userId}`) || "[]")
    const updatedDebts = debts.filter((debt: Debt) => debt.person_id !== personId)
    localStorage.setItem(`debts_${userId}`, JSON.stringify(updatedDebts))

    // Deletar todos os pagamentos das dívidas da pessoa
    const payments = JSON.parse(localStorage.getItem(`debt_payments_${userId}`) || "[]")
    const debtIds = debts.filter((debt: Debt) => debt.person_id === personId).map((debt: Debt) => debt.id)
    const updatedPayments = payments.filter((payment: DebtPayment) => !debtIds.includes(payment.debt_id))
    localStorage.setItem(`debt_payments_${userId}`, JSON.stringify(updatedPayments))

    console.log("✅ Pessoa e dívidas deletadas do localStorage")
    return true
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error("❌ Cliente Supabase não disponível")
    return false
  }

  try {
    console.log("☁️ Deletando no Supabase")

    // No Supabase, devido ao CASCADE, deletar a pessoa automaticamente deleta as dívidas e pagamentos
    const { error } = await supabase.from("people").delete().eq("id", personId).eq("user_id", userId)

    if (error) {
      console.error("❌ Erro ao deletar pessoa:", error)
      return false
    }

    console.log("✅ Pessoa e dívidas deletadas do Supabase")
    return true
  } catch (error) {
    console.error("❌ Erro na exclusão:", error)
    return false
  }
}

// NOVA FUNÇÃO - Deletar dívida específica
export async function deleteDebt(userId: string, debtId: string): Promise<boolean> {
  console.log("🗑️ Iniciando exclusão da dívida:", debtId)

  if (!isSupabaseConfigured) {
    // Implementação localStorage
    console.log("💾 Deletando dívida no localStorage")

    // Deletar dívida
    const debts = JSON.parse(localStorage.getItem(`debts_${userId}`) || "[]")
    const updatedDebts = debts.filter((debt: Debt) => debt.id !== debtId)
    localStorage.setItem(`debts_${userId}`, JSON.stringify(updatedDebts))

    // Deletar pagamentos da dívida
    const payments = JSON.parse(localStorage.getItem(`debt_payments_${userId}`) || "[]")
    const updatedPayments = payments.filter((payment: DebtPayment) => payment.debt_id !== debtId)
    localStorage.setItem(`debt_payments_${userId}`, JSON.stringify(updatedPayments))

    console.log("✅ Dívida deletada do localStorage")
    return true
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error("❌ Cliente Supabase não disponível")
    return false
  }

  try {
    console.log("☁️ Deletando dívida no Supabase")

    // Deletar dívida (os pagamentos são deletados automaticamente por CASCADE)
    const { error } = await supabase.from("debts").delete().eq("id", debtId)

    if (error) {
      console.error("❌ Erro ao deletar dívida:", error)
      return false
    }

    console.log("✅ Dívida deletada do Supabase")
    return true
  } catch (error) {
    console.error("❌ Erro na exclusão da dívida:", error)
    return false
  }
}

// Buscar todas as dívidas
export async function getDebts(userId: string): Promise<Debt[]> {
  if (!isSupabaseConfigured) {
    const debts = localStorage.getItem(`debts_${userId}`)
    const people = localStorage.getItem(`people_${userId}`)
    const debtsData = debts ? JSON.parse(debts) : []
    const peopleData = people ? JSON.parse(people) : []

    // Adicionar nome da pessoa
    return debtsData.map((debt: Debt) => {
      const person = peopleData.find((p: Person) => p.id === debt.person_id)
      return {
        ...debt,
        person_name: person?.name || "Pessoa não encontrada",
      }
    })
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("debts")
    .select(`
      *,
      people!inner(name)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar dívidas:", error)
    return []
  }

  return (data || []).map((debt: any) => ({
    ...debt,
    person_name: debt.people.name,
  }))
}

// Adicionar nova dívida
export async function addDebt(
  userId: string,
  personId: string,
  description: string,
  amount: number,
  type: "a_receber" | "a_pagar",
  dueDate?: string,
): Promise<Debt | null> {
  const newDebt: Debt = {
    id: Date.now().toString(),
    user_id: userId,
    person_id: personId,
    description,
    original_amount: amount,
    remaining_amount: amount,
    type,
    due_date: dueDate,
    status: "pendente",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (!isSupabaseConfigured) {
    const debts = JSON.parse(localStorage.getItem(`debts_${userId}`) || "[]")
    debts.push(newDebt)
    localStorage.setItem(`debts_${userId}`, JSON.stringify(debts))
    return newDebt
  }

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("debts")
    .insert({
      user_id: userId,
      person_id: personId,
      description,
      original_amount: amount,
      remaining_amount: amount,
      type,
      due_date: dueDate,
    })
    .select()
    .single()

  if (error) {
    console.error("Erro ao adicionar dívida:", error)
    return null
  }

  return data
}

// Registrar pagamento de dívida
export async function addDebtPayment(
  debtId: string,
  transactionId: string,
  amount: number,
  paymentDate: string,
  notes?: string,
): Promise<boolean> {
  console.log("🔄 Iniciando pagamento de dívida:", { debtId, transactionId, amount, paymentDate, notes })

  if (!isSupabaseConfigured) {
    // Implementação localStorage CORRIGIDA
    const userId = JSON.parse(localStorage.getItem("user") || "{}")?.id
    if (!userId) {
      console.error("❌ Usuário não encontrado no localStorage")
      return false
    }

    console.log("💾 Processando pagamento no localStorage para usuário:", userId)

    const debts = JSON.parse(localStorage.getItem(`debts_${userId}`) || "[]")
    const debtIndex = debts.findIndex((debt: Debt) => debt.id === debtId)

    if (debtIndex === -1) {
      console.error("❌ Dívida não encontrada:", debtId)
      return false
    }

    const debt = debts[debtIndex]
    console.log("📋 Dívida encontrada:", debt)

    const newRemainingAmount = debt.remaining_amount - amount
    console.log("💰 Calculando novo valor:", {
      valorAnterior: debt.remaining_amount,
      valorPagamento: amount,
      novoValor: newRemainingAmount,
    })

    // Atualizar dívida
    debts[debtIndex] = {
      ...debt,
      remaining_amount: Math.max(0, newRemainingAmount),
      status: newRemainingAmount <= 0 ? "pago" : "pendente",
      updated_at: new Date().toISOString(),
    }

    localStorage.setItem(`debts_${userId}`, JSON.stringify(debts))
    console.log("✅ Dívida atualizada no localStorage")

    // Salvar pagamento
    const payments = JSON.parse(localStorage.getItem(`debt_payments_${userId}`) || "[]")
    const newPayment = {
      id: Date.now().toString(),
      debt_id: debtId,
      transaction_id: transactionId,
      amount,
      payment_date: paymentDate,
      notes,
      created_at: new Date().toISOString(),
    }
    payments.push(newPayment)
    localStorage.setItem(`debt_payments_${userId}`, JSON.stringify(payments))
    console.log("✅ Pagamento salvo no localStorage:", newPayment)

    return true
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error("❌ Cliente Supabase não disponível")
    return false
  }

  try {
    console.log("☁️ Processando pagamento no Supabase")

    // Buscar dívida atual
    const { data: debt, error: debtError } = await supabase
      .from("debts")
      .select("remaining_amount, description")
      .eq("id", debtId)
      .single()

    if (debtError || !debt) {
      console.error("❌ Erro ao buscar dívida:", debtError)
      return false
    }

    console.log("📋 Dívida encontrada no Supabase:", debt)

    // Registrar pagamento
    const { error: paymentError } = await supabase.from("debt_payments").insert({
      debt_id: debtId,
      transaction_id: transactionId,
      amount,
      payment_date: paymentDate,
      notes,
    })

    if (paymentError) {
      console.error("❌ Erro ao registrar pagamento:", paymentError)
      return false
    }

    console.log("✅ Pagamento registrado no Supabase")

    // Atualizar valor restante da dívida
    const newRemainingAmount = debt.remaining_amount - amount
    const newStatus = newRemainingAmount <= 0 ? "pago" : "pendente"

    console.log("💰 Calculando novo valor no Supabase:", {
      valorAnterior: debt.remaining_amount,
      valorPagamento: amount,
      novoValor: newRemainingAmount,
      novoStatus: newStatus,
    })

    const { error: updateError } = await supabase
      .from("debts")
      .update({
        remaining_amount: Math.max(0, newRemainingAmount),
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", debtId)

    if (updateError) {
      console.error("❌ Erro ao atualizar dívida:", updateError)
      return false
    }

    console.log("✅ Dívida atualizada no Supabase")
    return true
  } catch (error) {
    console.error("❌ Erro na transação de pagamento:", error)
    return false
  }
}

// Buscar dívidas pendentes para uma pessoa específica
export async function getPendingDebtsByPerson(userId: string, personId: string): Promise<Debt[]> {
  if (!isSupabaseConfigured) {
    const debts = localStorage.getItem(`debts_${userId}`)
    const people = localStorage.getItem(`people_${userId}`)
    const debtsData = debts ? JSON.parse(debts) : []
    const peopleData = people ? JSON.parse(people) : []

    const filteredDebts = debtsData.filter((debt: Debt) => debt.person_id === personId && debt.status === "pendente")

    // Adicionar nome da pessoa
    return filteredDebts.map((debt: Debt) => {
      const person = peopleData.find((p: Person) => p.id === debt.person_id)
      return {
        ...debt,
        person_name: person?.name || "Pessoa não encontrada",
      }
    })
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("debts")
    .select(`
      *,
      people!inner(name)
    `)
    .eq("user_id", userId)
    .eq("person_id", personId)
    .eq("status", "pendente")
    .order("created_at")

  if (error) {
    console.error("Erro ao buscar dívidas pendentes:", error)
    return []
  }

  return (data || []).map((debt: any) => ({
    ...debt,
    person_name: debt.people.name,
  }))
}

// Buscar histórico de pagamentos de uma dívida
export async function getDebtPayments(debtId: string): Promise<DebtPayment[]> {
  if (!isSupabaseConfigured) {
    const userId = JSON.parse(localStorage.getItem("user") || "{}")?.id
    if (!userId) return []

    const payments = localStorage.getItem(`debt_payments_${userId}`)
    const paymentsData = payments ? JSON.parse(payments) : []
    return paymentsData.filter((payment: DebtPayment) => payment.debt_id === debtId)
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("debt_payments")
    .select("*")
    .eq("debt_id", debtId)
    .order("payment_date", { ascending: false })

  if (error) {
    console.error("Erro ao buscar pagamentos:", error)
    return []
  }

  return data || []
}
