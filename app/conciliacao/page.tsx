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
} from "lucide-react"
import { OFXParser } from "@/lib/ofx-parser"
import {
  importBankStatement,
  autoReconcileTransactions,
  getUnreconciledTransactions,
  getBankStatements,
  getReconciliationRules,
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
  } | null>(null)

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
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error)
    }
    setLoading(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log("📁 Arquivo selecionado:", file.name, file.size, "bytes")
      setSelectedFile(file)
      setUploadResult(null)
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
    if (!user || unreconciledTransactions.length === 0) return

    setReconciling(true)
    setReconciliationResult(null)

    try {
      console.log("🔄 Iniciando conciliação automática...")
      const result = await autoReconcileTransactions(user.id, unreconciledTransactions)

      setReconciliationResult(result)

      // Recarregar dados
      await loadData(user.id)
    } catch (error) {
      console.error("❌ Erro na conciliação:", error)
    } finally {
      setReconciling(false)
    }
  }

  const handleDebugRules = async () => {
    if (!user) return

    console.log("🔧 Modo debug ativado")
    const rules = await getReconciliationRules(user.id)
    const unreconciledTxns = await getUnreconciledTransactions(user.id)

    const debugData = {
      rules: rules,
      unreconciledTransactions: unreconciledTxns,
      rulesCount: rules.length,
      unreconciledCount: unreconciledTxns.length,
      sampleMatching: unreconciledTxns.slice(0, 5).map((txn) => {
        const matchingRules = rules.filter((rule) => {
          const pattern = rule.bank_description_pattern.replace(/%/g, "").toUpperCase()
          return txn.description.toUpperCase().includes(pattern)
        })

        // Simular qual descrição seria usada
        const applicableRule = matchingRules.find((rule) => {
          const expectedType = txn.transaction_type === "credit" ? "entrada" : "despesa"
          return rule.transaction_type === expectedType
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
          matchingRules: matchingRules.map((r) => r.rule_name),
          applicableRule: applicableRule?.rule_name || "Nenhuma",
          finalDescription: finalDescription,
        }
      }),
    }

    setDebugInfo(debugData)
    setDebugMode(true)
    console.log("🔧 Debug info:", debugData)
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
  const totalUnreconciledCredit = unreconciledTransactions
    .filter((txn) => txn.transaction_type === "credit")
    .reduce((sum, txn) => sum + txn.amount, 0)

  const totalUnreconciledDebit = unreconciledTransactions
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
              <p className="text-xs text-gray-500 mt-1">Transações pendentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Créditos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalUnreconciledCredit)}</div>
              <p className="text-xs text-gray-500 mt-1">Entradas não conciliadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Débitos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalUnreconciledDebit)}</div>
              <p className="text-xs text-gray-500 mt-1">Despesas não conciliadas</p>
            </CardContent>
          </Card>
        </div>

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
            <AlertTitle className="text-blue-800">Conciliação Automática Concluída!</AlertTitle>
            <AlertDescription className="text-blue-700">
              {reconciliationResult.created} transações criadas e {reconciliationResult.reconciled} conciliadas
              automaticamente com as descrições originais do OFX.
            </AlertDescription>
          </Alert>
        )}

        {debugMode && debugInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                🔧 Informações de Debug - Descrições Originais
                <Button variant="outline" size="sm" onClick={() => setDebugMode(false)}>
                  Fechar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Regras Carregadas ({debugInfo.rulesCount}):</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {debugInfo.rules.map((rule: any, index: number) => (
                      <div key={index} className="mb-2 p-2 border rounded">
                        <div>
                          <strong>{rule.rule_name}</strong>
                        </div>
                        <div>Padrão: "{rule.bank_description_pattern}"</div>
                        <div>Tipo: {rule.transaction_type}</div>
                        <div>Usar descrição original: {rule.use_original_description ? "✅ Sim" : "❌ Não"}</div>
                        {!rule.use_original_description && (
                          <div>Descrição padrão: "{rule.transaction_description}"</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Simulação de Conciliação (primeiras 5 transações):</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {debugInfo.sampleMatching.map((sample: any, index: number) => (
                      <div key={index} className="mb-3 p-3 border rounded bg-white">
                        <div className="mb-2">
                          <strong>Descrição Original do OFX:</strong>
                          <span className="font-mono bg-blue-50 px-2 py-1 rounded ml-2">
                            {sample.originalDescription}
                          </span>
                        </div>
                        <div className="mb-2">
                          <strong>Tipo Bancário:</strong> {sample.type}
                        </div>
                        <div className="mb-2">
                          <strong>Regras que fazem match:</strong>{" "}
                          {sample.matchingRules.length > 0 ? sample.matchingRules.join(", ") : "Nenhuma"}
                        </div>
                        <div className="mb-2">
                          <strong>Regra aplicável:</strong> {sample.applicableRule}
                        </div>
                        <div className="p-2 bg-green-50 rounded">
                          <strong>Descrição final na transação:</strong>
                          <span className="font-mono text-green-800 ml-2">{sample.finalDescription}</span>
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
                    <p className="text-sm font-medium text-blue-800">Arquivo selecionado:</p>
                    <p className="text-sm text-blue-600">{selectedFile.name}</p>
                    <p className="text-xs text-blue-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                )}

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
                  🔧 Debug
                </Button>
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
                      Conciliar Automaticamente
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição Original do OFX</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unreconciledTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                          Todas as transações estão conciliadas!
                        </TableCell>
                      </TableRow>
                    ) : (
                      unreconciledTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
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
                </div>
              ) : (
                bankStatements.map((statement) => (
                  <Card key={statement.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Banknote className="w-5 h-5" />
                        {statement.bank_name}
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
                          <span className="font-medium text-xs">{formatDate(statement.imported_at)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
