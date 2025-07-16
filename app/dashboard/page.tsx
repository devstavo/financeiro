"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Trash2, Plus, LogOut, ChevronLeft, ChevronRight, Archive, Calendar, Database, AlertCircle } from "lucide-react"
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
import { isSupabaseConfigured } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
      // Só mostra migração se Supabase estiver configurado
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

    setLoading(false)
  }

  const handleMigration = async () => {
    if (user) {
      await migrateLocalStorageData(user.id)
      setShowMigration(false)
      loadData(user.id)
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description || !amount || !user) return

    const newTransaction = await addTransaction(user.id, description, Number.parseFloat(amount), type, currentMonth)

    if (newTransaction) {
      setTransactions([newTransaction, ...transactions])
      setDescription("")
      setAmount("")
      setShowSuggestions(false)

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
      const [year, month] = currentMonth.split("-").map(Number)
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      setCurrentMonth(`${nextYear}-${String(nextMonth).padStart(2, "0")}`)
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    const [year, month] = currentMonth.split("-").map(Number)

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
    const [year, month] = monthStr.split("-")
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
    return `${monthNames[Number.parseInt(month) - 1]} ${year}`
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
            <h1 className="text-3xl font-bold text-gray-900">Controle Financeiro</h1>
            <p className="text-sm text-gray-600">
              {isSupabaseConfigured ? "Dados salvos na nuvem ☁️" : "Dados salvos localmente 💾"}
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

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
              <form onSubmit={handleAddTransaction} className="flex flex-col md:flex-row gap-4">
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
                  <Select
                    value={type}
                    onValueChange={(value: "entrada" | "despesa") => setType(value)}
                    name="type" // 'name' no componente Select (raiz)
                  >
                    <SelectTrigger id="type">
                      {" "}
                      {/* 'id' no SelectTrigger para o Label */}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button type="submit">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
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
