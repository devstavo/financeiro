"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Edit, ArrowLeft, Power, PowerOff, TrendingUp, DollarSign } from "lucide-react"
import {
  getRecurringExpenses,
  addRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  deactivateRecurringExpense,
  reactivateRecurringExpense,
  getTotalByCategory,
  getMonthlyTotal,
  EXPENSE_CATEGORIES,
  type RecurringExpense,
} from "@/lib/recurring-expenses"

export default function GastosFixosPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [expenses, setExpenses] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [totalByCategory, setTotalByCategory] = useState<Record<string, number>>({})
  const [monthlyTotal, setMonthlyTotal] = useState(0)

  // Form states
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [dayOfMonth, setDayOfMonth] = useState("1")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    loadData(parsedUser.id)
  }, [router, showInactive])

  const loadData = async (userId: string) => {
    setLoading(true)
    const data = await getRecurringExpenses(userId, !showInactive)
    setExpenses(data)

    const totals = await getTotalByCategory(userId)
    setTotalByCategory(totals)

    const total = await getMonthlyTotal(userId)
    setMonthlyTotal(total)

    setLoading(false)
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const newExpense = await addRecurringExpense(
      user.id,
      description,
      Number.parseFloat(amount),
      category,
      Number.parseInt(dayOfMonth),
      notes || undefined,
    )

    if (newExpense) {
      await loadData(user.id)
      resetForm()
      setIsAddDialogOpen(false)
    }
  }

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !editingExpense) return

    const success = await updateRecurringExpense(editingExpense.id, {
      description,
      amount: Number.parseFloat(amount),
      category,
      day_of_month: Number.parseInt(dayOfMonth),
      notes: notes || undefined,
    })

    if (success) {
      await loadData(user.id)
      resetForm()
      setIsEditDialogOpen(false)
      setEditingExpense(null)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!user) return
    if (!confirm("Tem certeza que deseja excluir este gasto fixo permanentemente?")) return

    const success = await deleteRecurringExpense(user.id, expenseId)
    if (success) {
      await loadData(user.id)
    }
  }

  const handleToggleActive = async (expense: RecurringExpense) => {
    const success = expense.is_active
      ? await deactivateRecurringExpense(expense.id)
      : await reactivateRecurringExpense(expense.id)

    if (success) {
      await loadData(user.id)
    }
  }

  const openEditDialog = (expense: RecurringExpense) => {
    setEditingExpense(expense)
    setDescription(expense.description)
    setAmount(expense.amount.toString())
    setCategory(expense.category)
    setDayOfMonth(expense.day_of_month.toString())
    setNotes(expense.notes || "")
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setDescription("")
    setAmount("")
    setCategory(EXPENSE_CATEGORIES[0])
    setDayOfMonth("1")
    setNotes("")
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando gastos fixos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button onClick={() => router.push("/dashboard")} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gastos Fixos Mensais</h1>
              <p className="text-sm text-gray-600">Gerencie seus gastos recorrentes</p>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-blue-300 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{formatCurrency(monthlyTotal)}</div>
              <p className="text-xs text-blue-600 mt-1">{expenses.length} gastos ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Maior Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(totalByCategory).length > 0 ? (
                <>
                  <div className="text-xl font-bold text-gray-900">
                    {Object.entries(totalByCategory).sort((a, b) => b[1] - a[1])[0][0]}
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(Object.entries(totalByCategory).sort((a, b) => b[1] - a[1])[0][1])}
                  </p>
                </>
              ) : (
                <div className="text-sm text-gray-500">Nenhum gasto cadastrado</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Totais por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {Object.entries(totalByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([cat, total]) => (
                    <div key={cat} className="flex justify-between">
                      <span className="text-gray-600">{cat}:</span>
                      <span className="font-medium">{formatCurrency(total)}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowInactive(!showInactive)}>
              {showInactive ? "Mostrar Apenas Ativos" : "Mostrar Todos"}
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Gasto Fixo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Gasto Fixo</DialogTitle>
                <DialogDescription>Cadastre um gasto que ocorre mensalmente de forma recorrente.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddExpense}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Mensalidade da faculdade"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Valor</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0,00"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="dayOfMonth">Dia do Vencimento</Label>
                      <Input
                        id="dayOfMonth"
                        type="number"
                        min="1"
                        max="31"
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Renovação automática no cartão"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Adicionar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabela de Gastos */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Gastos Fixos</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum gasto fixo cadastrado. Clique em "Adicionar Gasto Fixo" para começar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Dia</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id} className={!expense.is_active ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {expense.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">Dia {expense.day_of_month}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{expense.notes || "-"}</TableCell>
                      <TableCell className="text-center">
                        {expense.is_active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Ativo</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Inativo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(expense)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(expense)}
                            title={expense.is_active ? "Desativar" : "Reativar"}
                          >
                            {expense.is_active ? (
                              <PowerOff className="w-4 h-4 text-orange-600" />
                            ) : (
                              <Power className="w-4 h-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Gasto Fixo</DialogTitle>
              <DialogDescription>Atualize as informações do gasto fixo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditExpense}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Input
                    id="edit-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-amount">Valor</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-dayOfMonth">Dia do Vencimento</Label>
                    <Input
                      id="edit-dayOfMonth"
                      type="number"
                      min="1"
                      max="31"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-notes">Observações</Label>
                  <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    setEditingExpense(null)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
