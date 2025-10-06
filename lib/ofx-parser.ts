export interface OFXTransaction {
  date: string
  amount: number
  description: string
  type: "debit" | "credit"
  referenceNumber?: string
}

export interface OFXStatement {
  bankName: string
  accountNumber: string
  statementDate: string
  balance: number
  transactions: OFXTransaction[]
}

export class OFXParser {
  static parseOFX(ofxContent: string): OFXStatement {
    console.log("🔍 Iniciando parse do arquivo OFX...")

    try {
      // Limpar e normalizar o conteúdo OFX
      const cleanContent = ofxContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()

      console.log("📄 Conteúdo OFX limpo, tamanho:", cleanContent.length)

      // Extrair informações da conta
      const accountNumber = this.extractValue(cleanContent, "ACCTID") || "N/A"
      const bankName = "Bradesco"

      // Extrair saldo
      const balanceStr = this.extractValue(cleanContent, "BALAMT")
      const balance = balanceStr ? Number.parseFloat(balanceStr) : 0

      // Extrair data do extrato - com fallback seguro
      const statementDateStr = this.extractValue(cleanContent, "DTEND") || this.extractValue(cleanContent, "DTSERVER")
      const statementDate = statementDateStr
        ? this.parseOFXDate(statementDateStr)
        : new Date().toISOString().split("T")[0]

      console.log("🏦 Dados da conta extraídos:", { accountNumber, balance, statementDate })

      // Extrair transações
      const transactions = this.extractTransactions(cleanContent)

      console.log("💰 Transações extraídas:", transactions.length)

      return {
        bankName,
        accountNumber,
        statementDate,
        balance,
        transactions,
      }
    } catch (error) {
      console.error("❌ Erro ao processar OFX:", error)
      throw new Error(`Erro ao processar arquivo OFX: ${error}`)
    }
  }

  private static extractValue(content: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([^<]+)`, "i")
    const match = content.match(regex)
    return match ? match[1].trim() : null
  }

  private static extractTransactions(content: string): OFXTransaction[] {
    const transactions: OFXTransaction[] = []

    // Buscar blocos de transação <STMTTRN> - usando flag 's' compatível
    const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
    let match: RegExpExecArray | null

    console.log("🔍 Buscando transações no conteúdo OFX...")

    while ((match = transactionRegex.exec(content)) !== null) {
      const transactionBlock = match[1]

      try {
        // Extrair dados da transação
        const trnType = this.extractValue(transactionBlock, "TRNTYPE")
        const datePosted = this.extractValue(transactionBlock, "DTPOSTED")
        const amount = this.extractValue(transactionBlock, "TRNAMT")
        const fitId = this.extractValue(transactionBlock, "FITID")

        // Tentar múltiplos campos para descrição (ordem de prioridade)
        const memo =
          this.extractValue(transactionBlock, "MEMO") ||
          this.extractValue(transactionBlock, "NAME") ||
          this.extractValue(transactionBlock, "PAYEEID") ||
          this.extractValue(transactionBlock, "CHECKNUM") ||
          "Transação bancária"

        if (!datePosted || !amount) {
          console.warn(`⚠️ Transação incompleta, pulando...`)
          continue
        }

        const parsedAmount = Number.parseFloat(amount)
        const transactionDate = this.parseOFXDate(datePosted)

        // Determinar tipo da transação (crédito ou débito)
        const type: "debit" | "credit" = parsedAmount >= 0 ? "credit" : "debit"

        // Preservar a descrição original com limpeza mínima
        const cleanedDescription = this.preserveOriginalDescription(memo)

        transactions.push({
          date: transactionDate,
          amount: Math.abs(parsedAmount), // Sempre positivo, o tipo indica se é débito ou crédito
          description: cleanedDescription,
          type,
          referenceNumber: fitId || undefined,
        })

        console.log(`✅ Transação processada:`, {
          date: transactionDate,
          amount: Math.abs(parsedAmount),
          type,
          description: cleanedDescription.substring(0, 50) + "...",
        })
      } catch (error) {
        console.error(`❌ Erro ao processar transação:`, error)
      }
    }

    return transactions
  }

  private static parseOFXDate(ofxDate: string): string {
    // OFX usa formato YYYYMMDD ou YYYYMMDDHHMMSS
    const dateOnly = ofxDate.substring(0, 8)
    const year = dateOnly.substring(0, 4)
    const month = dateOnly.substring(4, 6)
    const day = dateOnly.substring(6, 8)

    return `${year}-${month}-${day}`
  }

  // Nova função que preserva melhor a descrição original
  private static preserveOriginalDescription(description: string): string {
    return (
      description
        .replace(/\s+/g, " ") // Múltiplos espaços em um só
        .trim()
        // Manter a descrição original sem converter para maiúscula
        // para que a formatação seja feita apenas na conciliação
        .substring(0, 200)
    ) // Limita tamanho
  }

  // Método para validar se o arquivo é um OFX válido
  static isValidOFX(content: string): boolean {
    const hasOFXHeader = content.includes("OFXHEADER") || content.includes("<OFX>")
    const hasStatements = content.includes("<STMTRS>") || content.includes("<STMTTRN>")

    return hasOFXHeader && hasStatements
  }

  // Método para detectar o banco (específico para Bradesco)
  static detectBank(content: string): string {
    if (content.includes("BRADESCO") || content.includes("237")) {
      return "Bradesco"
    }
    return "Banco não identificado"
  }
}
