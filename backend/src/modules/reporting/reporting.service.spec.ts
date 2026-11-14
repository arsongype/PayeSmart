import { describe, expect, it, vi } from 'vitest'
import { ReportingService } from './reporting.service.js'

describe('ReportingService PDF export', () => {
  it('renders the title in white and table text in black for contrast', async () => {
    const queryBuilder = {
      select: vi.fn(),
      orderBy: vi.fn(),
      getMany: vi.fn().mockResolvedValue([{
        id: 12,
        amount: 125,
        currency: 'EUR',
        channel: 'CARD',
        status: 'COMPLETED',
        metadata: {},
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      }]),
    }
    queryBuilder.select.mockReturnValue(queryBuilder)
    queryBuilder.orderBy.mockReturnValue(queryBuilder)

    const transactionRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
    }
    const service = new ReportingService(
      transactionRepository as never,
      {} as never,
      {} as never,
      {} as never,
    )

    const report = await service.exportReport(1, 'ADMIN')
    const pdf = report.content.toString('ascii')

    expect(pdf).toContain('1 g\nBT\n/F1 18 Tf\n62 775 Td\n(PayeSmart | Rapport analytics) Tj')
    expect(pdf).toContain('(Montant) Tj ET')
    expect(pdf).toContain('(125.00) Tj ET')
    expect(pdf).toContain('0 g BT /F1 8 Tf')
  })
})

describe('ReportingService dashboard', () => {
  it('totals collected transaction fees by currency for completed transactions only', async () => {
    const queryBuilder = {
      select: vi.fn(),
      orderBy: vi.fn(),
      andWhere: vi.fn(),
      getMany: vi.fn().mockResolvedValue([
        {
          id: 1,
          senderWalletId: 10,
          recipientWalletId: 20,
          amount: 25,
          currency: 'EUR',
          channel: 'CARD',
          status: 'COMPLETED',
          metadata: { adminFeeCreditAmount: 1250, adminFeeCurrency: 'MGA' },
          createdAt: new Date('2026-01-01T10:00:00.000Z'),
        },
        {
          id: 2,
          senderWalletId: 20,
          recipientWalletId: 10,
          amount: 10,
          currency: 'EUR',
          channel: 'CARD',
          status: 'COMPLETED',
          metadata: { adminFeeCreditAmount: 250, adminFeeCurrency: 'MGA' },
          createdAt: new Date('2026-01-02T10:00:00.000Z'),
        },
        {
          id: 3,
          senderWalletId: 30,
          recipientWalletId: 40,
          amount: 10,
          currency: 'EUR',
          channel: 'CARD',
          status: 'FAILED',
          failureReason: 'Transaction bloquée pour fraude',
          metadata: { adminFeeCreditAmount: 500, adminFeeCurrency: 'MGA', riskScore: 90, riskReasons: ['Activité inhabituelle'] },
          createdAt: new Date('2026-01-03T10:00:00.000Z'),
        },
        {
          id: 4,
          senderWalletId: 10,
          recipientWalletId: 40,
          amount: 15,
          currency: 'EUR',
          channel: 'QR',
          status: 'PENDING',
          failureReason: null,
          metadata: { riskScore: 50 },
          createdAt: new Date('2026-01-04T10:00:00.000Z'),
        },
      ]),
    }
    queryBuilder.select.mockReturnValue(queryBuilder)
    queryBuilder.orderBy.mockReturnValue(queryBuilder)
    const service = new ReportingService(
      { createQueryBuilder: vi.fn().mockReturnValue(queryBuilder) } as never,
      {
        count: vi.fn().mockResolvedValue(4),
        find: vi.fn().mockResolvedValue([
          { id: 1, firstName: 'Aina', lastName: 'Rakoto', email: 'aina@example.test' },
          { id: 2, firstName: 'Mamy', lastName: 'Rabe', email: 'mamy@example.test' },
          { id: 3, firstName: 'Lala', lastName: 'Rasoa', email: 'lala@example.test' },
          { id: 4, firstName: 'Tiana', lastName: 'Andry', email: 'tiana@example.test' },
        ]),
      } as never,
      {
        find: vi.fn().mockResolvedValue([
          { id: 10, userId: 1 },
          { id: 20, userId: 2 },
          { id: 30, userId: 3 },
          { id: 40, userId: 4 },
        ]),
      } as never,
      {
        find: vi.fn().mockResolvedValue([
          { transactionId: 3, userId: 3, fraudOutcome: 'LEGITIMATE' },
          { transactionId: 4, userId: 1, fraudOutcome: 'CONFIRMED_FRAUD' },
        ]),
      } as never,
    )

    const report = await service.getDashboard(3, 'ADMIN')

    expect(report.admin?.transactionFees).toEqual([{ currency: 'MGA', amount: 1500 }])
    expect(report.admin?.transactionRates).toEqual([
      { channel: 'CARD', transactions: 3, rate: 75 },
      { channel: 'QR', transactions: 1, rate: 25 },
    ])
    expect(report.totals.transactions).toBe(4)
    expect(queryBuilder.andWhere).not.toHaveBeenCalled()
    expect(report.admin?.transactionsToReview).toBe(1)
    expect(report.admin?.pendingTransactions).toMatchObject([
      { id: 4, sender: 'Aina Rakoto', recipient: 'Tiana Andry', amount: 15, channel: 'QR', status: 'PENDING' },
    ])
    expect(report.admin?.aiAlerts).toBe(2)
    expect(report.admin?.aiAlertDetails).toMatchObject([
      { id: 3, sender: 'Lala Rasoa', recipient: 'Tiana Andry', riskScore: 90, reason: 'Activité inhabituelle' },
      { id: 4, sender: 'Aina Rakoto', recipient: 'Tiana Andry', riskScore: 50 },
    ])
    expect(report.aiMetrics).toEqual({
      precision: 0.5,
      recall: 1,
      f1Score: 0.6667,
      analyzedTransactions: 2,
      evaluationSamples: 2,
      metricSource: 'reviewed_transactions',
    })
  })

  it('calculates user metrics only from the user’s sent, labeled transactions', async () => {
    const queryBuilder = {
      select: vi.fn(),
      orderBy: vi.fn(),
      andWhere: vi.fn(),
      getMany: vi.fn().mockResolvedValue([
        {
          id: 1,
          senderWalletId: 10,
          recipientWalletId: 20,
          amount: 25,
          currency: 'EUR',
          channel: 'CARD',
          status: 'COMPLETED',
          metadata: { riskScore: 60 },
          createdAt: new Date('2026-01-01T10:00:00.000Z'),
        },
        {
          id: 2,
          senderWalletId: 20,
          recipientWalletId: 10,
          amount: 10,
          currency: 'EUR',
          channel: 'CARD',
          status: 'COMPLETED',
          metadata: { riskScore: 90 },
          createdAt: new Date('2026-01-02T10:00:00.000Z'),
        },
        {
          id: 3,
          senderWalletId: 10,
          recipientWalletId: 30,
          amount: 10,
          currency: 'EUR',
          channel: 'QR',
          status: 'COMPLETED',
          metadata: { riskScore: 10 },
          createdAt: new Date('2026-01-03T10:00:00.000Z'),
        },
      ]),
    }
    queryBuilder.select.mockReturnValue(queryBuilder)
    queryBuilder.orderBy.mockReturnValue(queryBuilder)
    const walletRepository = {
      find: vi.fn().mockResolvedValue([{ id: 10, userId: 1 }]),
    }
    const fraudAlertRepository = {
      find: vi.fn().mockResolvedValue([
        { transactionId: 1, userId: 1, fraudOutcome: 'LEGITIMATE' },
        { transactionId: 2, userId: 2, fraudOutcome: 'CONFIRMED_FRAUD' },
        { transactionId: 3, userId: 1, fraudOutcome: 'CONFIRMED_FRAUD' },
      ]),
    }
    const service = new ReportingService(
      { createQueryBuilder: vi.fn().mockReturnValue(queryBuilder) } as never,
      {} as never,
      walletRepository as never,
      fraudAlertRepository as never,
    )

    const report = await service.getDashboard(1, 'USER')

    expect(fraudAlertRepository.find).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: 1 }),
    })
    expect(report.aiMetrics).toEqual({
      precision: 0,
      recall: 0,
      f1Score: 0,
      analyzedTransactions: 2,
      evaluationSamples: 2,
      metricSource: 'reviewed_transactions',
    })
  })

  it('uses completed and failed payment statuses as an explicit evaluation proxy', async () => {
    const rows = [
      { id: 1, status: 'COMPLETED', riskScore: 70 },
      { id: 2, status: 'COMPLETED', riskScore: 20 },
      { id: 3, status: 'FAILED', riskScore: 80 },
      { id: 4, status: 'FAILED', riskScore: 30 },
    ].map((item) => ({
      ...item,
      senderWalletId: 10,
      recipientWalletId: 20,
      amount: 25,
      currency: 'EUR',
      channel: 'CARD',
      metadata: null,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
    }))
    const queryBuilder = {
      select: vi.fn(),
      orderBy: vi.fn(),
      andWhere: vi.fn(),
      getMany: vi.fn().mockResolvedValue(rows),
    }
    queryBuilder.select.mockReturnValue(queryBuilder)
    queryBuilder.orderBy.mockReturnValue(queryBuilder)
    const service = new ReportingService(
      { createQueryBuilder: vi.fn().mockReturnValue(queryBuilder) } as never,
      {} as never,
      { find: vi.fn().mockResolvedValue([{ id: 10, userId: 1 }]) } as never,
      { find: vi.fn().mockResolvedValue([]) } as never,
    )

    const report = await service.getDashboard(1, 'USER')

    expect(report.aiMetrics).toEqual({
      precision: 0.5,
      recall: 0.5,
      f1Score: 0.5,
      analyzedTransactions: 4,
      evaluationSamples: 4,
      metricSource: 'transaction_status_proxy',
    })
  })
})
