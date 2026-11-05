import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Repository } from 'typeorm'
import { Notification } from '../entities/notification.entity.js'
import { NotificationService } from './notification.service.js'

describe('NotificationService', () => {
  const repository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    update: vi.fn(),
  }
  const service = new NotificationService(repository as unknown as Repository<Notification>)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a notification with an optional link', async () => {
    const notification = { userId: 7, title: 'Test', message: 'Message', link: null }
    repository.create.mockReturnValue(notification)
    repository.save.mockResolvedValue(notification)

    await expect(service.create(7, 'Test', 'Message')).resolves.toBe(notification)
    expect(repository.create).toHaveBeenCalledWith(notification)
    expect(repository.save).toHaveBeenCalledWith(notification)
  })

  it('loads the user notifications newest first', async () => {
    repository.find.mockResolvedValue([])

    await service.findByUserId(7)

    expect(repository.find).toHaveBeenCalledWith({
      where: { userId: 7 },
      order: { createdAt: 'DESC' },
    })
  })

  it('marks only the matching user notification as read and returns their list', async () => {
    const notifications = [{ id: 21, userId: 7, isRead: true }]
    repository.update.mockResolvedValue({ affected: 1 })
    repository.find.mockResolvedValue(notifications)

    await expect(service.markAsRead(7, 21)).resolves.toBe(notifications)
    expect(repository.update).toHaveBeenCalledWith(
      { id: 21, userId: 7 },
      { isRead: true },
    )
    expect(repository.find).toHaveBeenCalledWith({
      where: { userId: 7 },
      order: { createdAt: 'DESC' },
    })
  })

  it('marks only unread notifications belonging to the user as read', async () => {
    const notifications = [{ id: 21, userId: 7, isRead: true }]
    repository.update.mockResolvedValue({ affected: 1 })
    repository.find.mockResolvedValue(notifications)

    await expect(service.markAllAsRead(7)).resolves.toBe(notifications)
    expect(repository.update).toHaveBeenCalledWith(
      { userId: 7, isRead: false },
      { isRead: true },
    )
  })
})
