import { describe, expect, it } from 'vitest'

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
})
