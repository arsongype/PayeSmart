import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import axios from 'axios'
import { Repository } from 'typeorm'
import { Transaction } from '../auth/entities/transaction.entity.js'
import { User } from '../auth/entities/user.entity.js'
import { Wallet } from '../auth/entities/wallet.entity.js'

type ReportRow = {
  id: number
  amount: number
  currency: string
  channel: string
  status: string
  riskScore: number
  createdAt: Date
}

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Transaction) private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepository: Repository<Wallet>,
    private readonly configService: ConfigService,
  ) {}

  async getDashboard(userId: number, role: string) {
    const transactions = await this.getTransactions(userId, role)
    const successful = transactions.filter((transaction) => transaction.status === 'COMPLETED')
    const totalVolume = successful.reduce((sum, transaction) => sum + Number(transaction.amount), 0)
    const fraudCount = transactions.filter((transaction) => transaction.riskScore >= 40 || transaction.status === 'FAILED').length
    const aiMetrics = await this.getAiMetrics(transactions)
    const channels = this.aggregateChannels(successful)

    return {
      totals: {
        volume: Number(totalVolume.toFixed(2)),
        transactions: transactions.length,
        fraudRate: transactions.length ? Number(((fraudCount / transactions.length) * 100).toFixed(2)) : 0,
        revenue: Number((totalVolume * 0.015).toFixed(2)),
      },
      channels,
      aiMetrics,
      admin: role === 'ADMIN' ? {
        activeUsers: await this.userRepository.count(),
        transactionsToReview: transactions.filter((transaction) => transaction.status === 'PENDING' || transaction.status === 'PROCESSING').length,
        aiAlerts: fraudCount,
      } : null,
      generatedAt: new Date().toISOString(),
    }
  }

  async exportReport(userId: number, role: string, requestedFormat = 'pdf') {
    const format = requestedFormat.toLowerCase() || 'pdf'
    if (format !== 'pdf') {
      throw new BadRequestException('Seul le format PDF est disponible')
    }

    const rows = await this.getTransactions(userId, role)
    return {
      contentType: 'application/pdf',
      filename: `paysmart-report-${Date.now()}.pdf`,
      content: this.createPdf(rows),
    }
  }

  private async getTransactions(userId: number, role: string): Promise<ReportRow[]> {
    const wallets = role === 'ADMIN'
      ? null
      : await this.walletRepository.find({ where: { userId } })
    const query = this.transactionRepository.createQueryBuilder('transaction')
      .select(['transaction.id', 'transaction.amount', 'transaction.currency', 'transaction.channel', 'transaction.status', 'transaction.metadata', 'transaction.createdAt'])
      .orderBy('transaction.createdAt', 'DESC')
    if (wallets) {
      const walletIds = wallets.map((wallet) => wallet.id)
      if (walletIds.length === 0) return []
      query.andWhere('(transaction.senderWalletId IN (:...walletIds) OR transaction.recipientWalletId IN (:...walletIds))', { walletIds })
    }
    const transactions = await query.getMany()
    return transactions.map((transaction) => {
      const metadata = (transaction.metadata ?? {}) as Record<string, unknown>
      const riskScore = Number(metadata.riskScore ?? metadata.risk_score ?? 0)
      return { ...transaction, amount: Number(transaction.amount), riskScore: Number.isFinite(riskScore) ? riskScore : 0 }
    })
  }

  private aggregateChannels(transactions: ReportRow[]) {
    const grouped = new Map<string, { amount: number; transactions: number }>()
    for (const transaction of transactions) {
      const current = grouped.get(transaction.channel) ?? { amount: 0, transactions: 0 }
      current.amount += transaction.amount
      current.transactions += 1
      grouped.set(transaction.channel, current)
    }
    return [...grouped.entries()].map(([channel, data]) => ({ channel, amount: Number(data.amount.toFixed(2)), transactions: data.transactions }))
  }

  private async getAiMetrics(transactions: ReportRow[]) {
    try {
      const url = this.configService.get<string>('aiService.url', 'http://localhost:8001')
      const apiKey = this.configService.get<string>('aiService.apiKey', '')
      const { data } = await axios.get<{ precision: number | null; recall: number | null; f1Score: number | null; analyzedTransactions: number }>(`${url}/api/v1/metrics`, {
        headers: { 'X-API-Key': apiKey },
        timeout: 3000,
      })
      if (data.precision !== null && data.recall !== null && data.f1Score !== null) return data
      return this.calculateOperationalAiMetrics(transactions)
    } catch {
      return this.calculateOperationalAiMetrics(transactions)
    }
  }

  private calculateOperationalAiMetrics(transactions: ReportRow[]) {
    const predictedFraud = transactions.filter((transaction) => transaction.riskScore >= 40)
    const observedFraud = transactions.filter((transaction) => transaction.status === 'FAILED')
    const truePositive = predictedFraud.filter((transaction) => transaction.status === 'FAILED').length
    const falsePositive = predictedFraud.length - truePositive
    const falseNegative = observedFraud.length - truePositive
    const precision = truePositive + falsePositive > 0 ? truePositive / (truePositive + falsePositive) : 0
    const recall = truePositive + falseNegative > 0 ? truePositive / (truePositive + falseNegative) : 0
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

    return {
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1Score: Number(f1Score.toFixed(4)),
      analyzedTransactions: transactions.length,
    }
  }

  private createPdf(rows: ReportRow[]): Buffer {
    const normalizeText = (value: string) => value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[–—]/g, '-')
      .replace(/[“”]/g, '"')
      .replace(/’/g, "'")
      .replace(/[^\x20-\x7E]/g, '?')
    const escapePdfText = (value: string) => normalizeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    const columns = [
      { title: 'ID', width: 45, value: (row: ReportRow) => String(row.id) },
      { title: 'Montant', width: 85, value: (row: ReportRow) => Number(row.amount || 0).toFixed(2) },
      { title: 'Devise', width: 58, value: (row: ReportRow) => row.currency || '-' },
      { title: 'Canal', width: 105, value: (row: ReportRow) => row.channel || '-' },
      { title: 'Statut', width: 105, value: (row: ReportRow) => row.status || '-' },
      { title: 'Risque', width: 65, value: (row: ReportRow) => Number(row.riskScore || 0).toFixed(1) },
    ]
    const rowsPerPage = 39
    const pages = Array.from({ length: Math.max(1, Math.ceil(rows.length / rowsPerPage)) }, (_, index) => rows.slice(index * rowsPerPage, (index + 1) * rowsPerPage))
    const fontObjectIndex = 3 + pages.length * 2
    const pageObjectIndexes = pages.map((_, index) => 3 + index * 2)
    const objects: string[] = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Kids [${pageObjectIndexes.map((index) => `${index} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    ]

    pages.forEach((pageRows, pageIndex) => {
      const contentObjectIndex = 4 + pageIndex * 2
      const tableX = 42
      const tableWidth = columns.reduce((sum, column) => sum + column.width, 0)
      const headerY = 685
      const rowHeight = 21
      const tableCommands = [
        '0.90 0.95 0.97 rg',
        `${tableX} ${headerY} ${tableWidth} ${rowHeight} re f`,
        '0.80 0.84 0.88 RG',
        '0.6 w',
        `${tableX} ${headerY} ${tableWidth} ${rowHeight} re S`,
        ...columns.reduce<string[]>((commands, column, columnIndex) => {
          const x = tableX + columns.slice(0, columnIndex + 1).reduce((sum, item) => sum + item.width, 0)
          commands.push(`${x} ${headerY} m ${x} ${headerY - rowHeight * (pageRows.length + 1)} l S`)
          return commands
        }, []),
        ...pageRows.map((row, rowIndex) => {
          const y = headerY - rowHeight * (rowIndex + 1)
          const values = columns.map((column) => column.value(row))
          return [
            rowIndex % 2 === 0 ? '0.98 0.99 1 rg' : '1 1 1 rg',
            `${tableX} ${y - rowHeight} ${tableWidth} ${rowHeight} re f`,
            '0.80 0.84 0.88 RG',
            `${tableX} ${y - rowHeight} ${tableWidth} ${rowHeight} re S`,
            ...values.map((value, columnIndex) => {
              const x = tableX + columns.slice(0, columnIndex).reduce((sum, item) => sum + item.width, 0) + 6
              return `BT /F1 8 Tf ${x} ${y - 14} Td (${escapePdfText(value)}) Tj ET`
            }),
          ].join('\n')
        }),
        ...columns.map((column, columnIndex) => {
          const x = tableX + columns.slice(0, columnIndex).reduce((sum, item) => sum + item.width, 0) + 6
          return `BT /F1 8 Tf ${x} ${headerY + 7} Td (${escapePdfText(column.title)}) Tj ET`
        }),
      ].join('\n')
      const commands = [
        'q',
        '0.03 0.48 0.50 rg',
        '42 755 511 48 re f',
        'Q',
        'BT',
        '/F1 18 Tf',
        '62 775 Td',
        '(PayeSmart | Rapport analytics) Tj',
        'ET',
        'BT',
        '/F1 9 Tf',
        '62 760 Td',
        `(${escapePdfText(`Page ${pageIndex + 1} / ${pages.length}`)}) Tj`,
        'ET',
        'BT',
        '/F1 9 Tf',
        '54 720 Td',
        `(${escapePdfText(`Transactions analysees : ${rows.length} | Genere le : ${new Date().toLocaleString('fr-FR')}`)}) Tj`,
        'ET',
        tableCommands,
        'BT',
        '/F1 8 Tf',
        '54 35 Td',
        '(Document genere par PayeSmart) Tj',
        'ET',
      ].join('\n')
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectIndex} 0 R >> >> /Contents ${contentObjectIndex} 0 R >>`,
        `<< /Length ${Buffer.byteLength(commands, 'ascii')} >>\nstream\n${commands}\nendstream`,
      )
    })
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    let pdf = '%PDF-1.4\n'
    const offsets: number[] = [0]
    objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf, 'ascii')); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
    const xref = Buffer.byteLength(pdf, 'ascii')
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
    return Buffer.from(pdf)
  }
}