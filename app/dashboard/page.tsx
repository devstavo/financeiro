"use client"

import { DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Trash2,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Archive,
  Calendar,
  Database,
  AlertCircle,
  Users,
  Link,
  CheckCircle,
  Banknote,
} from "lucide-react"
import {
  getTransactionsByMonth,
  addTransaction,
  removeTransaction,
  getDescriptionSuggestions,
  closeMonth,
  isMonthClosed,
  getClosedMonths,
  migrateLocalStorageData,
  type Transaction,
  type ClosedMonth,
} from "@/lib/database"
import { getPeople, getPendingDebtsByPerson, addDebtPayment, type Person, type Debt } from "@/lib/debts"
import { isSupabaseConfigured } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"entrada" | "despesa">("entrada")
  const [closedMonths, setClosedMonths] = useState<ClosedMonth[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isClosingMonth, setIsClosingMonth] = useState(false)
  const [currentMonthClosed, setCurrentMonthClosed] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showMigration, setShowMigration] = useState(false)

  // Estados para vinculação com dívidas
  const [people, setPeople] = useState<Person[]>([])
  const [linkToDebt, setLinkToDebt] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState("")
  const [selectedDebtId, setSelectedDebtId] = useState("")
  const [personDebts, setPersonDebts] = useState<Debt[]>([])
  const [debtPaymentAmount, setDebtPaymentAmount] = useState("")
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    // Verificar se há dados no localStorage para migrar
    const hasLocalData = localStorage.getItem("monthsHistory")
    if (hasLocalData && isSupabaseConfigured) {
      setShowMigration(true)
    }

    loadData(parsedUser.id)
  }, [router, currentMonth])

  const loadData = async (userId: string) => {
    setLoading(true)

    // Carregar transações do mês atual
    const monthTransactions = await getTransactionsByMonth(userId, currentMonth)
    setTransactions(monthTransactions)

    // Verificar se mês está fechado
    const monthClosed = await isMonthClosed(userId, currentMonth)
    setCurrentMonthClosed(monthClosed)

    // Carregar meses fechados
    const closedMonthsData = await getClosedMonths(userId)
    setClosedMonths(closedMonthsData)

    // Carregar sugestões
    const descriptionsData = await getDescriptionSuggestions(userId)
    setSuggestions(descriptionsData)

    // Carregar pessoas para vinculação com dívidas
    const peopleData = await getPeople(userId)
    setPeople(peopleData)

    setLoading(false)
  }

  const handleMigration = async () => {
    if (user) {
      await migrateLocalStorageData(user.id)
      setShowMigration(false)
      loadData(user.id)
    }
  }

  // Quando seleciona uma pessoa, carrega suas dívidas pendentes
  const handlePersonSelect = async (personId: string) => {
    console.log("🔍 Selecionando pessoa:", personId)
    setSelectedPersonId(personId)
    setSelectedDebtId("")
    setDebtPaymentAmount("")

    if (personId && user) {
      console.log("📋 Buscando dívidas para pessoa:", personId, "tipo transação:", type)
      const debts = await getPendingDebtsByPerson(user.id, personId)
      console.log("💰 Dívidas encontradas:", debts)

      // Filtrar dívidas compatíveis com o tipo de transação
      const compatibleDebts = debts.filter((debt) => {
        if (type === "entrada") {
          return debt.type === "a_receber" // Entrada pode quitar dívida a receber
        } else {
          return debt.type === "a_pagar" // Despesa pode quitar dívida a pagar
        }
      })

      console.log("✅ Dívidas compatíveis:", compatibleDebts)
      setPersonDebts(compatibleDebts)
    } else {
      setPersonDebts([])
    }
  }

  // Quando seleciona uma dívida, sugere o valor restante
  const handleDebtSelect = (debtId: string) => {
    console.log("💳 Selecionando dívida:", debtId)
    setSelectedDebtId(debtId)
    const selectedDebt = personDebts.find((debt) => debt.id === debtId)
    if (selectedDebt) {
      console.log("💰 Dívida selecionada:", selectedDebt)
      setDebtPaymentAmount(selectedDebt.remaining_amount.toString())
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description || !amount || !user) return

    console.log("🚀 Iniciando adição de transação...")
    console.log("📝 Dados da transação:", { description, amount, type, currentMonth })
    console.log("🔗 Vinculação ativa:", linkToDebt)
    console.log("👤 Pessoa selecionada:", selectedPersonId)
    console.log("💳 Dívida selecionada:", selectedDebtId)
    console.log("💰 Valor do pagamento:", debtPaymentAmount)

    const newTransaction = await addTransaction(user.id, description, Number.parseFloat(amount), type, currentMonth)

    if (newTransaction) {
      console.log("✅ Transação criada:", newTransaction)

      // Se está vinculando a uma dívida, registrar o pagamento
      if (linkToDebt && selectedDebtId && debtPaymentAmount) {
        console.log("🔄 Processando pagamento de dívida...")
        const paymentAmount = Number.parseFloat(debtPaymentAmount)
        const success = await addDebtPayment(
          selectedDebtId,
          newTransaction.id,
          paymentAmount,
          new Date().toISOString().split("T")[0],
          `Pagamento via transação: ${description}`,
        )

        if (success) {
          console.log("✅ Pagamento de dívida registrado com sucesso!")
          setPaymentSuccess(true)
          setTimeout(() => setPaymentSuccess(false), 3000) // Remove o alerta após 3 segundos
        } else {
          console.error("❌ Erro ao registrar pagamento de dívida")
        }
      }

      setTransactions([newTransaction, ...transactions])
      setDescription("")
      setAmount("")
      setShowSuggestions(false)

      // Resetar campos de dívida
      setLinkToDebt(false)
      setSelectedPersonId("")
      setSelectedDebtId("")
      setPersonDebts([])
      setDebtPaymentAmount("")

      // Atualizar sugestões
      const descriptionsData = await getDescriptionSuggestions(user.id)
      setSuggestions(descriptionsData)
    }
  }

  const handleRemoveTransaction = async (id: string) => {
    const success = await removeTransaction(id)
    if (success) {
      setTransactions(transactions.filter((t) => t.id !== id))
    }
  }

  const handleCloseMonth = async () => {
    if (!user) return

    const totalEntradas = transactions.filter((t) => t.type === "entrada").reduce((sum, t) => sum + t.amount, 0)
    const totalDespesas = transactions.filter((t) => t.type === "despesa").reduce((sum, t) => sum + t.amount, 0)
    const saldoTotal = totalEntradas - totalDespesas

    const closedMonth = await closeMonth(user.id, currentMonth, totalEntradas, totalDespesas, saldoTotal)

    if (closedMonth) {
      setCurrentMonthClosed(true)
      setIsClosingMonth(false)

      // Atualizar lista de meses fechados
      const closedMonthsData = await getClosedMonths(user.id)
      setClosedMonths(closedMonthsData)

      // Avançar para o próximo mês
      const [yearStr, monthStr] = currentMonth.split("-")
      const year = Number.parseInt(yearStr, 10)
      const month = Number.parseInt(monthStr, 10)

      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      setCurrentMonth(`${nextYear}-${String(nextMonth).padStart(2, "0")}`)
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    const [yearStr, monthStr] = currentMonth.split("-")
    const year = Number.parseInt(yearStr, 10)
    const month = Number.parseInt(monthStr, 10)

    if (direction === "prev") {
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      setCurrentMonth(`${prevYear}-${String(prevMonth).padStart(2, "0")}`)
    } else {
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      setCurrentMonth(`${nextYear}-${String(nextMonth).padStart(2, "0")}`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/")
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    setShowSuggestions(value.length > 0)
  }

  const selectSuggestion = (suggestion: string) => {
    setDescription(suggestion)
    setShowSuggestions(false)
  }

  // Quando muda o tipo de transação, resetar seleções de dívida
  const handleTypeChange = (newType: "entrada" | "despesa") => {
    console.log("🔄 Mudando tipo de transação para:", newType)
    setType(newType)
    if (linkToDebt && selectedPersonId) {
      // Recarregar dívidas compatíveis com o novo tipo
      handlePersonSelect(selectedPersonId)
    }
  }

  const totalEntradas = transactions.filter((t) => t.type === "entrada").reduce((sum, t) => sum + t.amount, 0)
  const totalDespesas = transactions.filter((t) => t.type === "despesa").reduce((sum, t) => sum + t.amount, 0)
  const saldoTotal = totalEntradas - totalDespesas

  const entradas = transactions.filter((t) => t.type === "entrada")
  const despesas = transactions.filter((t) => t.type === "despesa")

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatMonthYear = (monthStr: string) => {
    const [yearStr, monthStr2] = monthStr.split("-")
    const year = yearStr
    const month = monthStr2
    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ]
    return `${monthNames[Number.parseInt(month, 10) - 1]} ${year}`
  }

  const filteredSuggestions = suggestions
    .filter((s) => s.toLowerCase().includes(description.toLowerCase()) && s !== description)
    .slice(0, 5)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Dialog de Migração */}
        <Dialog open={showMigration} onOpenChange={setShowMigration}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Migrar Dados Locais
              </DialogTitle>
              <DialogDescription>
                Detectamos dados salvos localmente no seu navegador. Deseja migrar esses dados para o banco de dados na
                nuvem? Isso garantirá que seus dados não sejam perdidos.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMigration(false)}>
                Pular
              </Button>
              <Button onClick={handleMigration}>Migrar Dados</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financeiro Farinea</h1>
            <p className="text-sm text-gray-600">
              {isSupabaseConfigured ? "Dados salvos na nuvem ☁️" : "Dados salvos localmente 💾"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/conciliacao")} variant="outline" size="sm">
              <Banknote className="w-4 h-4 mr-2" />
              Conciliação
            </Button>
            <Button onClick={() => router.push("/dividas")} variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" />
              Dívidas
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {/* Alerta de sucesso do pagamento */}
        {paymentSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Pagamento registrado!</AlertTitle>
            <AlertDescription className="text-green-700">
              A dívida foi atualizada automaticamente com o pagamento realizado.
            </AlertDescription>
          </Alert>
        )}

        {/* Aviso de Supabase não configurado */}
        {!isSupabaseConfigured && (
          <Alert variant="default" className="bg-yellow-100 border-yellow-400 text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenção: Supabase não configurado!</AlertTitle>
            <AlertDescription>
              Seus dados estão sendo salvos apenas localmente no seu navegador. Para salvar na nuvem e não perder suas
              informações, por favor, configure as variáveis de ambiente do Supabase (NEXT_PUBLIC_SUPABASE_URL e
              NEXT_PUBLIC_SUPABASE_ANON_KEY) no seu arquivo .env.local ou no Vercel.
            </AlertDescription>
          </Alert>
        )}

        {/* Navegação de Mês */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button onClick={() => navigateMonth("prev")} variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-4">
                <Calendar className="w-5 h-5" />
                <h2 className="text-xl font-semibold">{formatMonthYear(currentMonth)}</h2>
                {currentMonthClosed && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Fechado</span>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={() => navigateMonth("next")} variant="outline" size="sm">
                  <ChevronRight className="w-4 h-4" />
                </Button>

                {!currentMonthClosed && transactions.length > 0 && (
                  <Dialog open={isClosingMonth} onOpenChange={setIsClosingMonth}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Archive className="w-4 h-4 mr-2" />
                        Fechar Mês
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Fechar Mês</DialogTitle>
                        <DialogDescription>
                          Tem certeza que deseja fechar o mês de {formatMonthYear(currentMonth)}? Após o fechamento, não
                          será possível adicionar ou remover transações.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsClosingMonth(false)}>
                          Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleCloseMonth}>
                          Confirmar Fechamento
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Total Entradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalEntradas)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Total Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${saldoTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(saldoTotal)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulário para adicionar transação */}
        {!currentMonthClosed && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adicionar Transação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                {/* Primeira linha - campos principais */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      name="description"
                      value={description}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      placeholder="Ex: Salário, Aluguel, Compras..."
                      required
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                        {filteredSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                            onClick={() => selectSuggestion(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-full md:w-32">
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                      required
                    />
                  </div>

                  <div className="w-full md:w-32">
                    <Label htmlFor="type">Tipo</Label>
                    <Select value={type} onValueChange={handleTypeChange} name="type">
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Segunda linha - vinculação com dívidas */}
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="linkToDebt"
                      checked={linkToDebt}
                      onCheckedChange={(checked) => {
                        setLinkToDebt(checked as boolean)
                        if (!checked) {
                          setSelectedPersonId("")
                          setSelectedDebtId("")
                          setPersonDebts([])
                          setDebtPaymentAmount("")
                        }
                      }}
                    />
                    <Label htmlFor="linkToDebt" className="flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      Vincular a uma dívida
                    </Label>
                  </div>

                  {linkToDebt && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="person">Pessoa</Label>
                        <Select value={selectedPersonId} onValueChange={handlePersonSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma pessoa" />
                          </SelectTrigger>
                          <SelectContent>
                            {people.map((person) => (
                              <SelectItem key={person.id} value={person.id}>
                                {person.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="debt">Dívida</Label>
                        <Select
                          value={selectedDebtId}
                          onValueChange={handleDebtSelect}
                          disabled={!selectedPersonId || personDebts.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !selectedPersonId
                                  ? "Selecione uma pessoa primeiro"
                                  : personDebts.length === 0
                                    ? "Nenhuma dívida compatível"
                                    : "Selecione uma dívida"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {personDebts.map((debt) => (
                              <SelectItem key={debt.id} value={debt.id}>
                                {debt.description} - {formatCurrency(debt.remaining_amount)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="debtPayment">Valor do Pagamento</Label>
                        <Input
                          id="debtPayment"
                          type="number"
                          step="0.01"
                          value={debtPaymentAmount}
                          onChange={(e) => setDebtPaymentAmount(e.target.value)}
                          placeholder="0,00"
                          disabled={!selectedDebtId}
                        />
                      </div>

                      {selectedDebtId && (
                        <div className="md:col-span-3 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                          <strong>Dica:</strong> Esta transação será registrada normalmente e também será vinculada como
                          pagamento da dívida selecionada. O valor restante da dívida será atualizado automaticamente.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Transação
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tabelas separadas para Entradas e Despesas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tabela de Entradas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Entradas ({entradas.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {entradas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nenhuma entrada cadastrada.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      {!currentMonthClosed && <TableHead className="w-16"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entradas.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {new Date(transaction.transaction_date).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        {!currentMonthClosed && (
                          <TableCell>
                            <Button
                              onClick={() => handleRemoveTransaction(transaction.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Tabela de Despesas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Despesas ({despesas.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {despesas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nenhuma despesa cadastrada.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      {!currentMonthClosed && <TableHead className="w-16"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {despesas.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {new Date(transaction.transaction_date).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        {!currentMonthClosed && (
                          <TableCell>
                            <Button
                              onClick={() => handleRemoveTransaction(transaction.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Meses Fechados */}
        {closedMonths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Meses Fechados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Despesas</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedMonths.map((monthData) => (
                    <TableRow key={monthData.id}>
                      <TableCell className="font-medium">{formatMonthYear(monthData.month_year)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(monthData.total_entradas)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(monthData.total_despesas)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          monthData.saldo_total >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(monthData.saldo_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
