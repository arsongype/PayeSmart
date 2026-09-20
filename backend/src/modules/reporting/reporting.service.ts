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

  async exportReport(userId: number, role: string, requestedFormat: string) {
    const format = requestedFormat.toLowerCase()
    if (format !== 'csv' && format !== 'pdf') {
      throw new BadRequestException('Le format doit être csv ou pdf')
    }

    const rows = await this.getTransactions(userId, role)
    if (format === 'csv') {
      const header = 'id,amount,currency,channel,status,riskScore,createdAt'
      const lines = rows.map((row) => [row.id, row.amount, row.currency, row.channel, row.status, row.riskScore, row.createdAt.toISOString()].join(','))
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `paysmart-report-${Date.now()}.csv`,
        content: [header, ...lines].join('\n'),
      }
    }

    const text = ['Paysmart - Rapport Analytics', `Genere le: ${new Date().toISOString()}`, '', 'ID | Montant | Devise | Canal | Statut | Score fraude', ...rows.map((row) => `${row.id} | ${row.amount} | ${row.currency} | ${row.channel} | ${row.status} | ${row.riskScore}`)].join('\n')
    return {
      contentType: 'application/pdf',
      filename: `paysmart-report-${Date.now()}.pdf`,
      content: this.createPdf(text),
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

  private createPdf(text: string): Buffer {
    const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').split('\n')
    const commands = ['BT', '/F1 10 Tf', '50 790 Td', ...escaped.map((line, index) => `${index === 0 ? '' : '0 -14 Td '}(${line}) Tj`), 'ET'].join('\n')
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${Buffer.byteLength(commands) + 1} >>\nstream\n${commands}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ]
    let pdf = '%PDF-1.4\n'
    const offsets: number[] = [0]
    objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
    const xref = Buffer.byteLength(pdf)
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
    return Buffer.from(pdf)
  }
}