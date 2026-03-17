import { describe, expect, it } from 'vitest'

import mailboxTokenService from './mailbox-token-service.js'

describe('mailbox-token-service', () => {
  it('exposes the token and mail query actions', () => {
    expect(typeof mailboxTokenService.generateToken).toBe('function')
    expect(typeof mailboxTokenService.getLatestCode).toBe('function')
    expect(typeof mailboxTokenService.getRecentMails).toBe('function')
  })
})
