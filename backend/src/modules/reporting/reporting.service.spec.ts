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
      { get: vi.fn(), getOrThrow: vi.fn(() => { throw new Error('AI service unavailable') }) } as never,
    )

    const report = await service.getDashboard(3, 'ADMIN')

    expect(report.admin?.transactionFees).toEqual([{ currency: 'MGA', amount: 1500 }])
    expect(report.admin?.transactionsToReview).toBe(1)
    expect(report.admin?.pendingTransactions).toMatchObject([
      { id: 4, sender: 'Aina Rakoto', recipient: 'Tiana Andry', amount: 15, channel: 'QR', status: 'PENDING' },
    ])
    expect(report.admin?.aiAlerts).toBe(2)
    expect(report.admin?.aiAlertDetails).toMatchObject([
      { id: 3, sender: 'Lala Rasoa', recipient: 'Tiana Andry', riskScore: 90, reason: 'Activité inhabituelle' },
      { id: 4, sender: 'Aina Rakoto', recipient: 'Tiana Andry', riskScore: 50 },
    ])
  })
})
