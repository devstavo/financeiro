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
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Plus,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Phone,
  Mail,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Trash2,
  MoreHorizontal,
  PieChart,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getPeople, addPerson, getDebts, addDebt, deletePerson, deleteDebt, type Person, type Debt } from "@/lib/debts"

// Importar componentes de gráfico
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

export default function DividasPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Estados para adicionar pessoa
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState("")
  const [newPersonPhone, setNewPersonPhone] = useState("")
  const [newPersonEmail, setNewPersonEmail] = useState("")
  const [newPersonNotes, setNewPersonNotes] = useState("")

  // Estados para adicionar dívida
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState("")
  const [debtDescription, setDebtDescription] = useState("")
  const [debtAmount, setDebtAmount] = useState("")
  const [debtType, setDebtType] = useState<"a_receber" | "a_pagar">("a_receber")
  const [debtDueDate, setDebtDueDate] = useState("")

  // Estados para deletar
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null)
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null)

  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    loadData(parsedUser.id)
  }, [router])

  const loadData = async (userId: string) => {
    setLoading(true)
    const [peopleData, debtsData] = await Promise.all([getPeople(userId), getDebts(userId)])
    setPeople(peopleData)
    setDebts(debtsData)
    setLoading(false)
  }

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newPersonName.trim()) return

    const newPerson = await addPerson(user.id, newPersonName, newPersonPhone, newPersonEmail, newPersonNotes)

    if (newPerson) {
      setPeople([...people, newPerson])
      setNewPersonName("")
      setNewPersonPhone("")
      setNewPersonEmail("")
      setNewPersonNotes("")
      setShowAddPerson(false)
    }
  }

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPersonId || !debtDescription.trim() || !debtAmount) return

    const newDebt = await addDebt(
      user.id,
      selectedPersonId,
      debtDescription,
      Number.parseFloat(debtAmount),
      debtType,
      debtDueDate || undefined,
    )

    if (newDebt) {
      loadData(user.id) // Recarregar dados para pegar o nome da pessoa
      setSelectedPersonId("")
      setDebtDescription("")
      setDebtAmount("")
      setDebtType("a_receber")
      setDebtDueDate("")
      setShowAddDebt(false)
    }
  }

  // Deletar pessoa
  const handleDeletePerson = async (person: Person) => {
    if (!user) return

    console.log("🗑️ Deletando pessoa:", person.name)
    const success = await deletePerson(user.id, person.id)

    if (success) {
      console.log("✅ Pessoa deletada com sucesso")
      loadData(user.id) // Recarregar dados
      setDeletingPerson(null)
    } else {
      console.error("❌ Erro ao deletar pessoa")
    }
  }

  // Deletar dívida
  const handleDeleteDebt = async (debt: Debt) => {
    if (!user) return

    console.log("🗑️ Deletando dívida:", debt.description)
    const success = await deleteDebt(user.id, debt.id)

    if (success) {
      console.log("✅ Dívida deletada com sucesso")
      loadData(user.id) // Recarregar dados
      setDeletingDebt(null)
    } else {
      console.error("❌ Erro ao deletar dívida")
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pendente
          </Badge>
        )
      case "pago":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Pago
          </Badge>
        )
      case "cancelado":
        return <Badge variant="secondary">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "a_receber":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <TrendingUp className="w-3 h-3 mr-1" />A Receber
          </Badge>
        )
      case "a_pagar":
        return (
          <Badge variant="default" className="bg-red-100 text-red-800">
            <TrendingDown className="w-3 h-3 mr-1" />A Pagar
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  // Calcular totais e estatísticas
  const totalAReceber = debts
    .filter((debt) => debt.type === "a_receber" && debt.status === "pendente")
    .reduce((sum, debt) => sum + debt.remaining_amount, 0)

  const totalAPagar = debts
    .filter((debt) => debt.type === "a_pagar" && debt.status === "pendente")
    .reduce((sum, debt) => sum + debt.remaining_amount, 0)

  const saldoLiquido = totalAReceber - totalAPagar

  const dividasVencidas = debts.filter((debt) => debt.status === "pendente" && isOverdue(debt.due_date))
  const dividasPagas = debts.filter((debt) => debt.status === "pago")
  const dividasPendentes = debts.filter((debt) => debt.status === "pendente")

  // Dados para gráfico de pizza - Status das dívidas
  const pieChartData = [
    {
      name: "Pendentes",
      value: dividasPendentes.length,
      amount: dividasPendentes.reduce((sum, debt) => sum + debt.remaining_amount, 0),
      color: "#f59e0b", // amber-500
    },
    {
      name: "Pagas",
      value: dividasPagas.length,
      amount: dividasPagas.reduce((sum, debt) => sum + debt.original_amount, 0),
      color: "#10b981", // emerald-500
    },
    {
      name: "Vencidas",
      value: dividasVencidas.length,
      amount: dividasVencidas.reduce((sum, debt) => sum + debt.remaining_amount, 0),
      color: "#ef4444", // red-500
    },
  ].filter((item) => item.value > 0) // Remove categorias vazias

  // Dados para gráfico de pizza - Tipos de dívida
  const typesPieData = [
    {
      name: "A Receber",
      value: totalAReceber,
      count: debts.filter((d) => d.type === "a_receber" && d.status === "pendente").length,
      color: "#10b981", // emerald-500
    },
    {
      name: "A Pagar",
      value: totalAPagar,
      count: debts.filter((d) => d.type === "a_pagar" && d.status === "pendente").length,
      color: "#ef4444", // red-500
    },
  ].filter((item) => item.value > 0)

  // Dados para gráfico de barras empilhadas - Por pessoa
  const stackedBarData = people
    .map((person) => {
      const personDebts = debts.filter((debt) => debt.person_id === person.id)
      const pendingReceivable = personDebts
        .filter((debt) => debt.type === "a_receber" && debt.status === "pendente")
        .reduce((sum, debt) => sum + debt.remaining_amount, 0)
      const pendingPayable = personDebts
        .filter((debt) => debt.type === "a_pagar" && debt.status === "pendente")
        .reduce((sum, debt) => sum + debt.remaining_amount, 0)
      const paid = personDebts
        .filter((debt) => debt.status === "pago")
        .reduce((sum, debt) => sum + debt.original_amount, 0)

      return {
        name: person.name.length > 10 ? person.name.substring(0, 10) + "..." : person.name,
        fullName: person.name,
        aReceber: pendingReceivable,
        aPagar: pendingPayable,
        pago: paid,
        total: pendingReceivable + pendingPayable + paid,
      }
    })
    .filter((item) => item.total > 0) // Remove pessoas sem dívidas
    .sort((a, b) => b.total - a.total) // Ordena por total decrescente
    .slice(0, 8) // Mostra apenas os top 8

  // Estatísticas por pessoa
  const estatisticasPorPessoa = people.map((person) => {
    const personDebts = debts.filter((debt) => debt.person_id === person.id)
    const pendingDebts = personDebts.filter((debt) => debt.status === "pendente")
    const totalOwed = pendingDebts
      .filter((debt) => debt.type === "a_receber")
      .reduce((sum, debt) => sum + debt.remaining_amount, 0)
    const totalOwes = pendingDebts
      .filter((debt) => debt.type === "a_pagar")
      .reduce((sum, debt) => sum + debt.remaining_amount, 0)
    const overdue = pendingDebts.filter((debt) => isOverdue(debt.due_date))

    return {
      person,
      totalOwed,
      totalOwes,
      pendingCount: pendingDebts.length,
      overdueCount: overdue.length,
      netBalance: totalOwed - totalOwes,
      totalDebts: personDebts.length,
    }
  })

  // Cores para os gráficos
  const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#f97316", "#06b6d4", "#84cc16"]

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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button onClick={() => router.push("/dashboard")} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard de Dívidas</h1>
              <p className="text-sm text-gray-600">Controle completo com gráficos interativos</p>
            </div>
          </div>
        </div>

        {/* Dashboard Cards - Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total a Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAReceber)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {debts.filter((d) => d.type === "a_receber" && d.status === "pendente").length} dívidas pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Total a Pagar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalAPagar)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {debts.filter((d) => d.type === "a_pagar" && d.status === "pendente").length} dívidas pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Saldo Líquido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${saldoLiquido >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(saldoLiquido)}
              </div>
              <p className="text-xs text-gray-500 mt-1">{saldoLiquido >= 0 ? "Saldo positivo" : "Saldo negativo"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Dívidas Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{dividasVencidas.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(dividasVencidas.reduce((sum, debt) => sum + debt.remaining_amount, 0))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos Interativos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Pizza - Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Status das Dívidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any, props: any) => [`${value} dívidas`, name]}
                      labelFormatter={(label: any) =>
                        `${label}: ${formatCurrency(pieChartData.find((d) => d.name === label)?.amount || 0)}`
                      }
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Tipos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />A Receber vs A Pagar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={typesPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {typesPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any, props: any) => [formatCurrency(value), name]}
                      labelFormatter={(label: any) =>
                        `${label} (${typesPieData.find((d) => d.name === label)?.count || 0} dívidas)`
                      }
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Ranking por Pessoa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Ranking por Pessoa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {estatisticasPorPessoa
                  .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance))
                  .slice(0, 5)
                  .map((stat, index) => (
                    <div key={stat.person.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{stat.person.name}</div>
                          <div className="text-xs text-gray-500">
                            {stat.pendingCount} dívidas
                            {stat.overdueCount > 0 && (
                              <span className="text-red-500 ml-1">({stat.overdueCount} vencidas)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${stat.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(Math.abs(stat.netBalance))}
                        </div>
                        <div className="text-xs text-gray-500">{stat.netBalance >= 0 ? "te deve" : "você deve"}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Barras Empilhadas - Por Pessoa */}
        {stackedBarData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Dívidas por Pessoa (Top 8)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stackedBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value).replace("R$", "R$").replace(",00", "")}
                      fontSize={12}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [formatCurrency(value), name]}
                      labelFormatter={(label: any) => {
                        const item = stackedBarData.find((d) => d.name === label)
                        return item?.fullName || label
                      }}
                    />
                    <Legend />
                    <Bar dataKey="aReceber" stackId="a" fill="#10b981" name="A Receber" />
                    <Bar dataKey="aPagar" stackId="a" fill="#ef4444" name="A Pagar" />
                    <Bar dataKey="pago" stackId="a" fill="#6b7280" name="Já Pago" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="dividas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dividas">Dívidas</TabsTrigger>
            <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
          </TabsList>

          {/* Tab Dívidas */}
          <TabsContent value="dividas" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Todas as Dívidas</h2>
              <Dialog open={showAddDebt} onOpenChange={setShowAddDebt}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Dívida
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Dívida</DialogTitle>
                    <DialogDescription>Registre uma nova dívida a receber ou a pagar.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddDebt} className="space-y-4">
                    <div>
                      <Label htmlFor="person">Pessoa</Label>
                      <Select value={selectedPersonId} onValueChange={setSelectedPersonId} required>
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
                      <Label htmlFor="description">Descrição</Label>
                      <Input
                        id="description"
                        value={debtDescription}
                        onChange={(e) => setDebtDescription(e.target.value)}
                        placeholder="Ex: Empréstimo, Conta dividida..."
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Valor</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={debtAmount}
                        onChange={(e) => setDebtAmount(e.target.value)}
                        placeholder="0,00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select value={debtType} onValueChange={(value: "a_receber" | "a_pagar") => setDebtType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a_receber">A Receber (alguém me deve)</SelectItem>
                          <SelectItem value="a_pagar">A Pagar (eu devo para alguém)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Data de Vencimento (opcional)</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={debtDueDate}
                        onChange={(e) => setDebtDueDate(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowAddDebt(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Adicionar Dívida</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pessoa</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor Original</TableHead>
                      <TableHead className="text-right">Valor Restante</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          Nenhuma dívida cadastrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      debts.map((debt) => {
                        const progress = ((debt.original_amount - debt.remaining_amount) / debt.original_amount) * 100
                        const overdue = isOverdue(debt.due_date)

                        return (
                          <TableRow key={debt.id} className={overdue ? "bg-red-50" : ""}>
                            <TableCell className="font-medium">{debt.person_name}</TableCell>
                            <TableCell>{debt.description}</TableCell>
                            <TableCell>{getTypeBadge(debt.type)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(debt.original_amount)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(debt.remaining_amount)}
                            </TableCell>
                            <TableCell className="w-24">
                              <div className="space-y-1">
                                <Progress value={progress} className="h-2" />
                                <div className="text-xs text-gray-500 text-center">{Math.round(progress)}%</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {debt.due_date ? (
                                <div className={`flex items-center gap-1 ${overdue ? "text-red-600" : ""}`}>
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(debt.due_date)}
                                  {overdue && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(debt.status)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setDeletingDebt(debt)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Deletar Dívida
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Pessoas */}
          <TabsContent value="pessoas" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Pessoas Cadastradas</h2>
              <Dialog open={showAddPerson} onOpenChange={setShowAddPerson}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Pessoa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Pessoa</DialogTitle>
                    <DialogDescription>Cadastre uma nova pessoa para controle de dívidas.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddPerson} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        placeholder="Nome completo"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={newPersonPhone}
                        onChange={(e) => setNewPersonPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newPersonEmail}
                        onChange={(e) => setNewPersonEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        value={newPersonNotes}
                        onChange={(e) => setNewPersonNotes(e.target.value)}
                        placeholder="Observações sobre a pessoa..."
                        rows={3}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowAddPerson(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Adicionar Pessoa</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {people.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma pessoa cadastrada.</p>
                </div>
              ) : (
                people.map((person) => {
                  const stat = estatisticasPorPessoa.find((s) => s.person.id === person.id)
                  if (!stat) return null

                  return (
                    <Card key={person.id} className={stat.overdueCount > 0 ? "border-red-200" : ""}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            {person.name}
                          </div>
                          <div className="flex items-center gap-2">
                            {stat.overdueCount > 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setDeletingPerson(person)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deletar Pessoa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {person.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {person.phone}
                          </div>
                        )}
                        {person.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {person.email}
                          </div>
                        )}
                        {person.notes && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <FileText className="w-4 h-4 mt-0.5" />
                            <span className="line-clamp-2">{person.notes}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t space-y-2">
                          {stat.totalOwed > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-green-600">Te deve:</span>
                              <span className="font-medium text-green-600">{formatCurrency(stat.totalOwed)}</span>
                            </div>
                          )}
                          {stat.totalOwes > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-red-600">Você deve:</span>
                              <span className="font-medium text-red-600">{formatCurrency(stat.totalOwes)}</span>
                            </div>
                          )}
                          {stat.pendingCount > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Dívidas ativas:</span>
                              <span className="font-medium">{stat.pendingCount}</span>
                            </div>
                          )}
                          {stat.overdueCount > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-red-600">Vencidas:</span>
                              <span className="font-medium text-red-600">{stat.overdueCount}</span>
                            </div>
                          )}
                          {stat.pendingCount === 0 && (
                            <div className="text-sm text-gray-500 text-center">Sem dívidas pendentes</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog de Confirmação - Deletar Pessoa */}
        <AlertDialog open={!!deletingPerson} onOpenChange={() => setDeletingPerson(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Pessoa</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar <strong>{deletingPerson?.name}</strong>?
                <br />
                <br />
                <span className="text-red-600 font-medium">
                  ⚠️ ATENÇÃO: Todas as dívidas e pagamentos relacionados a esta pessoa também serão deletados
                  permanentemente!
                </span>
                <br />
                <br />
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingPerson && handleDeletePerson(deletingPerson)}
                className="bg-red-600 hover:bg-red-700"
              >
                Sim, Deletar Tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Confirmação - Deletar Dívida */}
        <AlertDialog open={!!deletingDebt} onOpenChange={() => setDeletingDebt(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Dívida</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar a dívida <strong>"{deletingDebt?.description}"</strong> de{" "}
                <strong>{deletingDebt?.person_name}</strong>?
                <br />
                <br />
                <span className="text-red-600 font-medium">
                  ⚠️ Todos os pagamentos relacionados a esta dívida também serão deletados!
                </span>
                <br />
                <br />
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingDebt && handleDeleteDebt(deletingDebt)}
                className="bg-red-600 hover:bg-red-700"
              >
                Sim, Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
