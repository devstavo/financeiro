"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Banknote,
  RefreshCw,
  Zap,
  Bug,
  X,
  MoreHorizontal,
  Trash2,
  Eye,
  Download,
  AlertTriangle,
  Target,
  Search,
} from "lucide-react"
import { OFXParser } from "@/lib/ofx-parser"
import {
  importBankStatement,
  autoReconcileTransactions,
  reconcileSelectedTransactions,
  getUnreconciledTransactions,
  getBankStatements,
  getReconciliationRules,
  deleteBankStatement,
  clearAllReconciliations,
  type BankStatement,
  type BankTransaction,
} from "@/lib/bank-reconciliation"

export default function ConciliacaoPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Estados dos dados
  const [bankStatements, setBankStatements] = useState<BankStatement[]>([])
  const [unreconciledTransactions, setUnreconciledTransactions] = useState<BankTransaction[]>([])

  // Estados do upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    statement?: BankStatement
    transactionCount?: number
  } | null>(null)

  // Estados da conciliação
  const [reconciliationResult, setReconciliationResult] = useState<{
    reconciled: number
    created: number
    details?: any[]
  } | null>(null)

  // Estados para gerenciamento de extratos
  const [deletingStatement, setDeletingStatement] = useState<BankStatement | null>(null)
  const [viewingStatement, setViewingStatement] = useState<BankStatement | null>(null)
  const [clearingAll, setClearingAll] = useState(false)

  // NOVOS ESTADOS PARA SELEÇÃO EM MASSA
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // NOVO ESTADO PARA FILTROS
  const [filterType, setFilterType] = useState<"all" | "credit" | "debit">("all")

  const fileInputRef = useRef<HTMLInputElement>(null)
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
    try {
      const [statements, unreconciled] = await Promise.all([
        getBankStatements(userId),
        getUnreconciledTransactions(userId),
      ])

      setBankStatements(statements)
      setUnreconciledTransactions(unreconciled)

      // Resetar seleções quando os dados mudam
      setSelectedTransactions(new Set())
      setSelectAll(false)

      console.log("📊 Dados carregados:")
      console.log("  - Extratos:", statements.length)
      console.log("  - Transações não conciliadas:", unreconciled.length)
      console.log("  - Créditos não conciliados:", unreconciled.filter((t) => t.transaction_type === "credit").length)
      console.log("  - Débitos não conciliados:", unreconciled.filter((t) => t.transaction_type === "debit").length)
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error)
    }
    setLoading(false)
  }

  // NOVA FUNÇÃO - Gerenciar seleção individual
  const handleTransactionSelect = (transactionId: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions)
    if (checked) {
      newSelected.add(transactionId)
    } else {
      newSelected.delete(transactionId)
      setSelectAll(false)
    }
    setSelectedTransactions(newSelected)
    console.log("📋 Transação selecionada:", transactionId, "Total selecionadas:", newSelected.size)
  }

  // NOVA FUNÇÃO - Selecionar/Deselecionar todas (com filtro)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filteredTransactions = getFilteredTransactions()
      const allIds = new Set(filteredTransactions.map((txn) => txn.id))
      setSelectedTransactions(allIds)
      setSelectAll(true)
      console.log("✅ Todas as transações filtradas selecionadas:", allIds.size)
    } else {
      setSelectedTransactions(new Set())
      setSelectAll(false)
      console.log("❌ Todas as transações desmarcadas")
    }
  }

  // NOVA FUNÇÃO - Filtrar transações por tipo
  const getFilteredTransactions = () => {
    switch (filterType) {
      case "credit":
        return unreconciledTransactions.filter((txn) => txn.transaction_type === "credit")
      case "debit":
        return unreconciledTransactions.filter((txn) => txn.transaction_type === "debit")
      default:
        return unreconciledTransactions
    }
  }

  // NOVA FUNÇÃO - Conciliar apenas selecionadas
  const handleReconcileSelected = async () => {
    if (!user || selectedTransactions.size === 0) return

    console.log("🎯 === INICIANDO CONCILIAÇÃO SELECIONADA ===")
    console.log("📊 Transações selecionadas:", selectedTransactions.size)

    setReconciling(true)
    setReconciliationResult(null)

    try {
      const result = await reconcileSelectedTransactions(
        user.id,
        Array.from(selectedTransactions),
        unreconciledTransactions,
      )
      console.log("🎉 Resultado da conciliação selecionada:", result)

      setReconciliationResult(result)

      // Recarregar dados
      await loadData(user.id)
    } catch (error) {
      console.error("❌ Erro na conciliação selecionada:", error)
      setReconciliationResult({
        reconciled: 0,
        created: 0,
        details: [{ error: String(error) }],
      })
    } finally {
      setReconciling(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log("📁 Arquivo selecionado:", file.name, file.size, "bytes")
      setSelectedFile(file)
      setUploadResult(null)
    }
  }

  const handleCancelSelection = () => {
    console.log("❌ Cancelando seleção de arquivo")
    setSelectedFile(null)
    setUploadResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !user) return

    setUploading(true)
    setUploadResult(null)

    try {
      console.log("📤 Iniciando upload do arquivo:", selectedFile.name)

      // Ler arquivo
      const fileContent = await readFileAsText(selectedFile)
      console.log("📄 Arquivo lido, tamanho:", fileContent.length)

      // Validar se é um arquivo OFX
      if (!OFXParser.isValidOFX(fileContent)) {
        setUploadResult({
          success: false,
          message: "Arquivo não é um OFX válido. Verifique se exportou corretamente do Bradesco.",
        })
        return
      }

      // Processar OFX
      const ofxData = OFXParser.parseOFX(fileContent)
      console.log("✅ OFX processado:", ofxData)

      // Importar para o banco de dados
      const importResult = await importBankStatement(user.id, ofxData, selectedFile.name)

      if (importResult) {
        setUploadResult({
          success: true,
          message: `Extrato importado com sucesso! ${importResult.transactions.length} transações processadas.`,
          statement: importResult.statement,
          transactionCount: importResult.transactions.length,
        })

        // Recarregar dados
        await loadData(user.id)

        // Limpar seleção
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } else {
        setUploadResult({
          success: false,
          message: "Erro ao importar extrato. Tente novamente.",
        })
      }
    } catch (error) {
      console.error("❌ Erro no upload:", error)
      setUploadResult({
        success: false,
        message: `Erro ao processar arquivo: ${error}`,
      })
    } finally {
      setUploading(false)
    }
  }

  const handleAutoReconcile = async () => {
    if (!user) return

    console.log("🚀 === INICIANDO CONCILIAÇÃO AUTOMÁTICA ===")
    console.log("📊 Transações não conciliadas disponíveis:", unreconciledTransactions.length)

    if (unreconciledTransactions.length === 0) {
      setReconciliationResult({
        reconciled: 0,
        created: 0,
        details: [],
      })
      console.log("⚠️ Nenhuma transação para conciliar")
      return
    }

    setReconciling(true)
    setReconciliationResult(null)

    try {
      const result = await autoReconcileTransactions(user.id, unreconciledTransactions)
      console.log("🎉 Resultado da conciliação:", result)

      setReconciliationResult(result)

      // Recarregar dados
      await loadData(user.id)
    } catch (error) {
      console.error("❌ Erro na conciliação:", error)
      setReconciliationResult({
        reconciled: 0,
        created: 0,
        details: [{ error: String(error) }],
      })
    } finally {
      setReconciling(false)
    }
  }

  const handleDebugRules = async () => {
    if (!user) return

    console.log("🔧 Ativando modo debug...")
    const rules = await getReconciliationRules(user.id)
    const unreconciledTxns = await getUnreconciledTransactions(user.id)

    // Separar por tipo para debug
    const creditTransactions = unreconciledTxns.filter((t) => t.transaction_type === "credit")
    const debitTransactions = unreconciledTxns.filter((t) => t.transaction_type === "debit")
    const entradaRules = rules.filter((r) => r.transaction_type === "entrada")
    const despesaRules = rules.filter((r) => r.transaction_type === "despesa")

    console.log("🔍 DEBUG DETALHADO:")
    console.log("  - Total transações:", unreconciledTxns.length)
    console.log("  - Transações CREDIT:", creditTransactions.length)
    console.log("  - Transações DEBIT:", debitTransactions.length)
    console.log("  - Regras ENTRADA:", entradaRules.length)
    console.log("  - Regras DESPESA:", despesaRules.length)

    // Log das primeiras transações de crédito
    if (creditTransactions.length > 0) {
      console.log("🔍 PRIMEIRAS TRANSAÇÕES DE CRÉDITO:")
      creditTransactions.slice(0, 5).forEach((txn, index) => {
        console.log(`  ${index + 1}. "${txn.description}" - R$ ${txn.amount} - Tipo: ${txn.transaction_type}`)
      })
    }

    // Log das regras de entrada
    if (entradaRules.length > 0) {
      console.log("🔍 REGRAS DE ENTRADA:")
      entradaRules.forEach((rule, index) => {
        console.log(
          `  ${index + 1}. "${rule.rule_name}" - Padrão: "${rule.bank_description_pattern}" - Ativo: ${rule.active}`,
        )
      })
    }

    const debugData = {
      rules: rules,
      unreconciledTransactions: unreconciledTxns,
      creditTransactions: creditTransactions,
      debitTransactions: debitTransactions,
      entradaRules: entradaRules,
      despesaRules: despesaRules,
      rulesCount: rules.length,
      unreconciledCount: unreconciledTxns.length,
      creditCount: creditTransactions.length,
      debitCount: debitTransactions.length,
      sampleMatching: unreconciledTxns.slice(0, 20).map((txn) => {
        const relevantRules = txn.transaction_type === "credit" ? entradaRules : despesaRules
        const expectedType = txn.transaction_type === "credit" ? "entrada" : "despesa"

        const matchingRules = relevantRules.filter((rule) => {
          const pattern = rule.bank_description_pattern.replace(/%/g, "").toUpperCase().trim()
          if (pattern === "") return true // Regra catch-all
          return txn.description.toUpperCase().includes(pattern)
        })

        const applicableRule = matchingRules.find((rule) => {
          return rule.transaction_type === expectedType && rule.active && rule.auto_reconcile
        })

        let finalDescription = "Nenhuma regra aplicável"
        if (applicableRule) {
          if (applicableRule.use_original_description) {
            finalDescription = `"${txn.description}" (original formatada)`
          } else {
            finalDescription = `"${applicableRule.transaction_description}" (da regra)`
          }
        }

        return {
          originalDescription: txn.description,
          type: txn.transaction_type,
          expectedRuleType: expectedType,
          relevantRulesCount: relevantRules.length,
          matchingRules: matchingRules.map((r) => r.rule_name),
          applicableRule: applicableRule?.rule_name || "Nenhuma",
          finalDescription: finalDescription,
          ruleActive: applicableRule?.active || false,
          ruleAutoReconcile: applicableRule?.auto_reconcile || false,
          debugInfo: {
            bankType: txn.transaction_type,
            expectedSystemType: expectedType,
            ruleType: applicableRule?.transaction_type || "N/A",
            pattern: applicableRule?.bank_description_pattern || "N/A",
            hasMatchingRules: matchingRules.length > 0,
            hasApplicableRule: !!applicableRule,
          },
        }
      }),
    }

    setDebugInfo(debugData)
    setDebugMode(true)
    console.log("🔧 Debug info completo:", debugData)
  }

  const handleDeleteStatement = async (statement: BankStatement) => {
    if (!user) return

    console.log("🗑️ Deletando extrato:", statement.file_name)

    try {
      const success = await deleteBankStatement(user.id, statement.id)

      if (success) {
        console.log("✅ Extrato deletado com sucesso")
        await loadData(user.id) // Recarregar dados
        setDeletingStatement(null)
      } else {
        console.error("❌ Erro ao deletar extrato")
      }
    } catch (error) {
      console.error("❌ Erro ao deletar extrato:", error)
    }
  }

  const handleClearAll = async () => {
    if (!user) return

    console.log("🧹 Limpando todas as conciliações")

    try {
      const success = await clearAllReconciliations(user.id)

      if (success) {
        console.log("✅ Todas as conciliações limpas com sucesso")
        await loadData(user.id) // Recarregar dados
        setClearingAll(false)
        setReconciliationResult(null)
        setUploadResult(null)
      } else {
        console.error("❌ Erro ao limpar conciliações")
      }
    } catch (error) {
      console.error("❌ Erro ao limpar conciliações:", error)
    }
  }

  const handleDownloadStatement = (statement: BankStatement) => {
    // Simular download do arquivo original
    console.log("📥 Download do extrato:", statement.file_name)

    // Criar um link de download simulado
    const element = document.createElement("a")
    element.href = `data:text/plain;charset=utf-8,${encodeURIComponent(`Extrato: ${statement.file_name}\nBanco: ${statement.bank_name}\nConta: ${statement.account_number}\nData: ${statement.statement_date}\nSaldo: ${statement.balance}`)}`
    element.download = statement.file_name
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file, "utf-8")
    })
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR")
  }

  const getTransactionTypeBadge = (type: "debit" | "credit") => {
    return type === "credit" ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <TrendingUp className="w-3 h-3 mr-1" />
        Crédito
      </Badge>
    ) : (
      <Badge variant="default" className="bg-red-100 text-red-800">
        <TrendingDown className="w-3 h-3 mr-1" />
        Débito
      </Badge>
    )
  }

  // Estatísticas
  const filteredTransactions = getFilteredTransactions()
  const totalUnreconciledCredit = unreconciledTransactions
    .filter((txn) => txn.transaction_type === "credit")
    .reduce((sum, txn) => sum + txn.amount, 0)

  const totalUnreconciledDebit = unreconciledTransactions
    .filter((txn) => txn.transaction_type === "debit")
    .reduce((sum, txn) => sum + txn.amount, 0)

  // Estatísticas das selecionadas
  const selectedTransactionsList = unreconciledTransactions.filter((txn) => selectedTransactions.has(txn.id))
  const selectedCredit = selectedTransactionsList
    .filter((txn) => txn.transaction_type === "credit")
    .reduce((sum, txn) => sum + txn.amount, 0)
  const selectedDebit = selectedTransactionsList
    .filter((txn) => txn.transaction_type === "debit")
    .reduce((sum, txn) => sum + txn.amount, 0)

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
              <h1 className="text-3xl font-bold text-gray-900">Conciliação Bancária</h1>
              <p className="text-sm text-gray-600">Importe extratos OFX do Bradesco e concilie automaticamente</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(bankStatements.length > 0 || unreconciledTransactions.length > 0) && (
              <Button
                onClick={() => setClearingAll(true)}
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Limpar Tudo
              </Button>
            )}
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Extratos Importados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bankStatements.length}</div>
              <p className="text-xs text-gray-500 mt-1">Arquivos OFX processados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Não Conciliadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{unreconciledTransactions.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {unreconciledTransactions.filter((t) => t.transaction_type === "credit").length} créditos,{" "}
                {unreconciledTransactions.filter((t) => t.transaction_type === "debit").length} débitos
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Créditos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalUnreconciledCredit)}</div>
              <p className="text-xs text-green-600 font-medium mt-1">
                {unreconciledTransactions.filter((t) => t.transaction_type === "credit").length} transações de ENTRADA
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Débitos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalUnreconciledDebit)}</div>
              <p className="text-xs text-red-600 font-medium mt-1">
                {unreconciledTransactions.filter((t) => t.transaction_type === "debit").length} transações de DESPESA
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Card de Seleção em Massa */}
        {selectedTransactions.size > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Transações Selecionadas ({selectedTransactions.size})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{selectedTransactions.size}</div>
                  <p className="text-xs text-blue-600">Selecionadas</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{formatCurrency(selectedCredit)}</div>
                  <p className="text-xs text-green-600">Créditos</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{formatCurrency(selectedDebit)}</div>
                  <p className="text-xs text-red-600">Débitos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alertas de Resultado */}
        {uploadResult && (
          <Alert variant={uploadResult.success ? "default" : "destructive"}>
            {uploadResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{uploadResult.success ? "Sucesso!" : "Erro"}</AlertTitle>
            <AlertDescription>{uploadResult.message}</AlertDescription>
          </Alert>
        )}

        {reconciliationResult && (
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Zap className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Conciliação Concluída!</AlertTitle>
            <AlertDescription className="text-blue-700">
              <div className="space-y-2">
                <div>
                  <strong>Resultados:</strong>
                </div>
                <div>• {reconciliationResult.created} transações criadas</div>
                <div>• {reconciliationResult.reconciled} transações conciliadas</div>
                {reconciliationResult.details && reconciliationResult.details.length > 0 && (
                  <div className="mt-3">
                    <strong>Detalhes (primeiros 10):</strong>
                    <div className="text-xs mt-1 space-y-1 max-h-60 overflow-y-auto">
                      {reconciliationResult.details.slice(0, 10).map((detail, index) => (
                        <div key={index} className="bg-white p-2 rounded border">
                          <div>
                            <strong>Transação:</strong> {detail.transaction}
                          </div>
                          <div>
                            <strong>Status:</strong> {detail.status}
                          </div>
                          {detail.rule && (
                            <div>
                              <strong>Regra:</strong> {detail.rule}
                            </div>
                          )}
                          {detail.bankType && (
                            <div>
                              <strong>Tipo Banco:</strong> {detail.bankType} → <strong>Sistema:</strong>{" "}
                              {detail.systemType}
                            </div>
                          )}
                          {detail.error && (
                            <div className="text-red-600">
                              <strong>Erro:</strong> {detail.error}
                            </div>
                          )}
                          {detail.debug && (
                            <div className="text-xs text-gray-600 mt-1">Debug: {JSON.stringify(detail.debug)}</div>
                          )}
                        </div>
                      ))}
                      {reconciliationResult.details.length > 10 && (
                        <div className="text-gray-500">
                          ... e mais {reconciliationResult.details.length - 10} transações
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {debugMode && debugInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                🔧 Debug Detalhado - Análise de Créditos vs Débitos
                <Button variant="outline" size="sm" onClick={() => setDebugMode(false)}>
                  Fechar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="font-medium text-blue-800">Regras Carregadas</div>
                    <div className="text-2xl font-bold text-blue-600">{debugInfo.rulesCount}</div>
                    <div className="text-xs text-blue-600">
                      {debugInfo.entradaRules.length} entrada, {debugInfo.despesaRules.length} despesa
                    </div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <div className="font-medium text-orange-800">Transações Pendentes</div>
                    <div className="text-2xl font-bold text-orange-600">{debugInfo.unreconciledCount}</div>
                    <div className="text-xs text-orange-600">Total não conciliadas</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded border-2 border-green-300">
                    <div className="font-medium text-green-800">⚠️ Créditos Pendentes</div>
                    <div className="text-2xl font-bold text-green-600">{debugInfo.creditCount}</div>
                    <div className="text-xs text-green-600 font-medium">PRECISAM regras "entrada"</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <div className="font-medium text-red-800">Débitos Pendentes</div>
                    <div className="text-2xl font-bold text-red-600">{debugInfo.debitCount}</div>
                    <div className="text-xs text-red-600">Precisam regras "despesa"</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-2 border-green-300 rounded">
                    <h4 className="font-medium mb-2 text-green-800 bg-green-100 p-2 rounded-t">
                      🎯 Regras de ENTRADA ({debugInfo.entradaRules.length}) - Para Créditos:
                    </h4>
                    <div className="bg-green-50 p-3 text-sm max-h-40 overflow-y-auto">
                      {debugInfo.entradaRules.length === 0 ? (
                        <div className="text-red-600 font-medium">❌ NENHUMA REGRA DE ENTRADA ENCONTRADA!</div>
                      ) : (
                        debugInfo.entradaRules.map((rule: any, index: number) => (
                          <div key={index} className="mb-1 text-xs">
                            <strong>{rule.rule_name}</strong>: "{rule.bank_description_pattern}"
                            {rule.bank_description_pattern === "" && (
                              <span className="text-green-600 font-bold"> (CATCH-ALL)</span>
                            )}
                            {!rule.active && <span className="text-red-600"> (INATIVA)</span>}
                            {!rule.auto_reconcile && <span className="text-orange-600"> (MANUAL)</span>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-red-800 bg-red-100 p-2 rounded-t">
                      Regras de DESPESA ({debugInfo.despesaRules.length}) - Para Débitos:
                    </h4>
                    <div className="bg-red-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
                      {debugInfo.despesaRules.map((rule: any, index: number) => (
                        <div key={index} className="mb-1 text-xs">
                          <strong>{rule.rule_name}</strong>: "{rule.bank_description_pattern}"
                          {rule.bank_description_pattern === "" && (
                            <span className="text-red-600 font-bold"> (CATCH-ALL)</span>
                          )}
                          {!rule.active && <span className="text-red-600"> (INATIVA)</span>}
                          {!rule.auto_reconcile && <span className="text-orange-600"> (MANUAL)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">🔍 Simulação de Matching (primeiras 20 transações):</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm max-h-96 overflow-y-auto">
                    {debugInfo.sampleMatching.map((sample: any, index: number) => (
                      <div
                        key={index}
                        className={`mb-3 p-3 border-2 rounded ${
                          sample.type === "credit" ? "bg-green-50 border-green-300" : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div className="mb-2">
                          <strong>Descrição Original:</strong>
                          <span className="font-mono bg-white px-2 py-1 rounded ml-2 text-xs">
                            {sample.originalDescription}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs mb-2">
                          <div>
                            <strong>Tipo Bancário:</strong>
                            <span
                              className={`ml-1 font-medium ${
                                sample.type === "credit" ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {sample.type}
                            </span>
                          </div>
                          <div>
                            <strong>Tipo Esperado:</strong>
                            <span
                              className={`ml-1 font-medium ${
                                sample.expectedRuleType === "entrada" ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {sample.expectedRuleType}
                            </span>
                          </div>
                          <div>
                            <strong>Regras Relevantes:</strong> {sample.relevantRulesCount}
                          </div>
                          <div>
                            <strong>Regras que fazem Match:</strong> {sample.matchingRules.length}
                          </div>
                        </div>
                        <div className="mb-2 text-xs">
                          <strong>Regras que fazem match:</strong>{" "}
                          {sample.matchingRules.length > 0 ? sample.matchingRules.join(", ") : "Nenhuma"}
                        </div>
                        <div className="mb-2 text-xs">
                          <strong>Regra aplicável:</strong>
                          <span
                            className={
                              sample.applicableRule !== "Nenhuma"
                                ? "text-green-600 font-medium ml-1"
                                : "text-red-600 ml-1 font-medium"
                            }
                          >
                            {sample.applicableRule}
                          </span>
                        </div>
                        {sample.debugInfo && (
                          <div className="mb-2 text-xs bg-white p-2 rounded border">
                            <div>
                              🔍 <strong>Debug Info:</strong>
                            </div>
                            <div>• Tipo banco: {sample.debugInfo.bankType}</div>
                            <div>• Tipo esperado: {sample.debugInfo.expectedSystemType}</div>
                            <div>• Tipo da regra: {sample.debugInfo.ruleType}</div>
                            <div>• Padrão: "{sample.debugInfo.pattern}"</div>
                            <div>
                              • Tem regras que fazem match: {sample.debugInfo.hasMatchingRules ? "✅ Sim" : "❌ Não"}
                            </div>
                            <div>• Tem regra aplicável: {sample.debugInfo.hasApplicableRule ? "✅ Sim" : "❌ Não"}</div>
                          </div>
                        )}
                        {sample.applicableRule !== "Nenhuma" && (
                          <div className="mb-2 text-xs bg-white p-2 rounded">
                            <div>✅ Regra ativa: {sample.ruleActive ? "Sim" : "Não"}</div>
                            <div>✅ Auto-conciliação: {sample.ruleAutoReconcile ? "Sim" : "Não"}</div>
                          </div>
                        )}
                        <div
                          className={`p-2 rounded text-xs ${
                            sample.applicableRule !== "Nenhuma"
                              ? "bg-green-100 border border-green-300"
                              : "bg-red-100 border border-red-300"
                          }`}
                        >
                          <strong>Resultado Final:</strong>
                          <span
                            className={`font-mono ml-2 ${
                              sample.applicableRule !== "Nenhuma" ? "text-green-800" : "text-red-800"
                            }`}
                          >
                            {sample.finalDescription}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seção de Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar Extrato OFX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Banknote className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Selecione seu arquivo OFX do Bradesco</p>
                <p className="text-sm text-gray-500">
                  Exporte o extrato em formato OFX pelo internet banking e faça upload aqui
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  ✨ As transações serão criadas com as descrições originais do extrato!
                </p>
              </div>

              <div className="mt-4 space-y-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".ofx,.OFX"
                  onChange={handleFileSelect}
                  className="max-w-md mx-auto"
                />

                {selectedFile && (
                  <div className="bg-blue-50 p-3 rounded-lg max-w-md mx-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800">Arquivo selecionado:</p>
                        <p className="text-sm text-blue-600">{selectedFile.name}</p>
                        <p className="text-xs text-blue-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button
                        onClick={handleCancelSelection}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-center">
                  <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="w-full max-w-md">
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Importar Extrato
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Como exportar OFX do Bradesco:</h4>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Acesse o Internet Banking do Bradesco</li>
                <li>Vá em "Conta Corrente" → "Extrato"</li>
                <li>Selecione o período desejado</li>
                <li>Clique em "Exportar" e escolha formato "OFX"</li>
                <li>Faça download do arquivo e importe aqui</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="pendentes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pendentes">Transações Pendentes</TabsTrigger>
            <TabsTrigger value="extratos">Extratos Importados</TabsTrigger>
          </TabsList>

          {/* Tab Transações Pendentes */}
          <TabsContent value="pendentes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Transações Não Conciliadas</h2>
              <div className="flex gap-2">
                <Button onClick={handleDebugRules} variant="outline" size="sm">
                  <Bug className="w-4 h-4 mr-2" />
                  Debug Detalhado
                </Button>
                {selectedTransactions.size > 0 && (
                  <Button
                    onClick={handleReconcileSelected}
                    disabled={reconciling}
                    variant="secondary"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {reconciling ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Conciliando...
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4 mr-2" />
                        Conciliar Selecionadas ({selectedTransactions.size})
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={handleAutoReconcile}
                  disabled={unreconciledTransactions.length === 0 || reconciling}
                  variant="default"
                >
                  {reconciling ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Conciliando...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Conciliar Todas ({unreconciledTransactions.length})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 items-center">
              <Search className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filtrar por tipo:</span>
              <div className="flex gap-1">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                >
                  Todas ({unreconciledTransactions.length})
                </Button>
                <Button
                  variant={filterType === "credit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("credit")}
                  className={filterType === "credit" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  ⚠️ Créditos ({unreconciledTransactions.filter((t) => t.transaction_type === "credit").length})
                </Button>
                <Button
                  variant={filterType === "debit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("debit")}
                  className={filterType === "debit" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  Débitos ({unreconciledTransactions.filter((t) => t.transaction_type === "debit").length})
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                          disabled={filteredTransactions.length === 0}
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição Original do OFX</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                          <div>
                            <p className="font-medium">
                              {unreconciledTransactions.length === 0
                                ? "Nenhuma transação pendente!"
                                : `Nenhuma transação ${filterType === "credit" ? "de crédito" : filterType === "debit" ? "de débito" : ""} pendente!`}
                            </p>
                            <p className="text-sm mt-1">
                              {bankStatements.length === 0
                                ? "Importe um extrato OFX para começar."
                                : filterType !== "all"
                                  ? "Use os filtros acima para ver outros tipos de transação."
                                  : "Todas as transações foram conciliadas com sucesso."}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow
                          key={transaction.id}
                          className={`${selectedTransactions.has(transaction.id) ? "bg-blue-50" : ""} ${
                            transaction.transaction_type === "credit"
                              ? "border-l-4 border-l-green-400"
                              : "border-l-4 border-l-red-400"
                          }`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedTransactions.has(transaction.id)}
                              onCheckedChange={(checked) => handleTransactionSelect(transaction.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{formatDate(transaction.transaction_date)}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="font-mono text-sm bg-gray-50 p-2 rounded" title={transaction.description}>
                              {transaction.description}
                            </div>
                          </TableCell>
                          <TableCell>{getTransactionTypeBadge(transaction.transaction_type)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(transaction.amount)}</TableCell>
                          <TableCell className="text-sm text-gray-500">{transaction.reference_number || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pendente
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Extratos Importados */}
          <TabsContent value="extratos" className="space-y-4">
            <h2 className="text-xl font-semibold">Extratos Importados</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankStatements.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum extrato importado ainda.</p>
                  <p className="text-sm mt-1">Importe um arquivo OFX do Bradesco para começar.</p>
                </div>
              ) : (
                bankStatements.map((statement) => (
                  <Card key={statement.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-5 h-5" />
                          {statement.bank_name}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingStatement(statement)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadStatement(statement)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingStatement(statement)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Conta:</span>
                          <span className="font-medium">{statement.account_number}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Data:</span>
                          <span className="font-medium">{formatDate(statement.statement_date)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Saldo:</span>
                          <span className={`font-medium ${statement.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(statement.balance)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Arquivo:</span>
                          <span className="font-medium text-xs truncate max-w-32" title={statement.file_name}>
                            {statement.file_name}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Importado:</span>
                          <span className="font-medium text-xs">{formatDateTime(statement.imported_at)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog de Confirmação - Deletar Extrato */}
        <AlertDialog open={!!deletingStatement} onOpenChange={() => setDeletingStatement(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Extrato</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar o extrato <strong>"{deletingStatement?.file_name}"</strong>?
                <br />
                <br />
                <span className="text-red-600 font-medium">
                  ⚠️ ATENÇÃO: Todas as transações bancárias relacionadas a este extrato também serão deletadas!
                </span>
                <br />
                <br />
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingStatement && handleDeleteStatement(deletingStatement)}
                className="bg-red-600 hover:bg-red-700"
              >
                Sim, Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Confirmação - Limpar Tudo */}
        <AlertDialog open={clearingAll} onOpenChange={setClearingAll}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar Todas as Conciliações</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja limpar <strong>TODAS</strong> as conciliações?
                <br />
                <br />
                <span className="text-red-600 font-medium">
                  ⚠️ ATENÇÃO: Esta ação irá deletar:
                  <br />• Todos os extratos importados ({bankStatements.length})
                  <br />• Todas as transações bancárias ({unreconciledTransactions.length} pendentes)
                  <br />• Todo o histórico de conciliações
                </span>
                <br />
                <br />
                Esta ação não pode ser desfeita. Você precisará importar os extratos novamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll} className="bg-red-600 hover:bg-red-700">
                Sim, Limpar Tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Visualização - Detalhes do Extrato */}
        <AlertDialog open={!!viewingStatement} onOpenChange={() => setViewingStatement(null)}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Detalhes do Extrato</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  {viewingStatement && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <strong>Banco:</strong> {viewingStatement.bank_name}
                        </div>
                        <div>
                          <strong>Conta:</strong> {viewingStatement.account_number}
                        </div>
                        <div>
                          <strong>Data do Extrato:</strong> {formatDate(viewingStatement.statement_date)}
                        </div>
                        <div>
                          <strong>Saldo:</strong>{" "}
                          <span className={viewingStatement.balance >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(viewingStatement.balance)}
                          </span>
                        </div>
                        <div>
                          <strong>Arquivo:</strong> {viewingStatement.file_name}
                        </div>
                        <div>
                          <strong>Importado em:</strong> {formatDateTime(viewingStatement.imported_at)}
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-blue-50 p-3 rounded">
                            <div className="font-medium text-blue-800">Transações Relacionadas</div>
                            <div className="text-2xl font-bold text-blue-600">
                              {unreconciledTransactions.filter((t) => t.statement_id === viewingStatement.id).length}
                            </div>
                            <div className="text-xs text-blue-600">pendentes de conciliação</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded">
                            <div className="font-medium text-green-800">Status</div>
                            <div className="text-lg font-bold text-green-600">Importado</div>
                            <div className="text-xs text-green-600">pronto para conciliação</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
