import { describe, expect, it, vi } from 'vitest'

import mailboxTokenService from './mailbox-token-service.js'

describe('mailbox-token-service', () => {
  it('exposes the account token management and mail query actions', () => {
    expect(typeof mailboxTokenService.getCurrentToken).toBe('function')
    expect(typeof mailboxTokenService.rotateToken).toBe('function')
    expect(typeof mailboxTokenService.disableToken).toBe('function')
    expect(typeof mailboxTokenService.enableToken).toBe('function')
    expect(typeof mailboxTokenService.getLatestCode).toBe('function')
    expect(typeof mailboxTokenService.getRecentMails).toBe('function')
  })

  it('blocks regular admins from querying recent mails for unmanaged accounts', async () => {
    const service = Object.create(mailboxTokenService)
    service.resolveAvailableAccount = vi.fn().mockResolvedValue({
      accountId: 2,
      email: 'child@example.com',
      userId: 1,
    })
    service.listRecentMails = vi.fn()

    const context = {
      env: { admin: 'root@example.com' },
      get(key) {
        if (key === 'user') {
          return { userId: 9, email: 'admin@example.com' }
        }
        return undefined
      },
    }

    await expect(service.getRecentMails(context, 'demo-token')).rejects.toMatchObject({ code: 403 })
    expect(service.listRecentMails).not.toHaveBeenCalled()
  })

  it('allows the super admin to query recent mails for any managed account', async () => {
    const service = Object.create(mailboxTokenService)
    service.resolveAvailableAccount = vi.fn().mockResolvedValue({
      accountId: 2,
      email: 'child@example.com',
      userId: 1,
    })
    service.listRecentMails = vi.fn().mockResolvedValue([
      { emailId: 11, subject: 'hello', text: 'body', sendEmail: 'sender@example.com', createTime: '2026-03-18 10:00:00' },
    ])

    const context = {
      env: { admin: 'root@example.com' },
      get(key) {
        if (key === 'user') {
          return { userId: 1, email: 'root@example.com' }
        }
        return undefined
      },
    }

    await expect(service.getRecentMails(context, 'demo-token')).resolves.toMatchObject({
      email: 'child@example.com',
      mails: expect.any(Array),
    })
    expect(service.listRecentMails).toHaveBeenCalledWith(context, 'child@example.com', 3)
  })
})
