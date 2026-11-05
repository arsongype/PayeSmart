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
