import { describe, expect, it } from 'vitest'

import {
  TOKEN_STATUS,
  buildTokenPayload,
  findLatestCodeMail,
  isAccountTokenActive,
  mapRecentMails,
  signTokenPayload,
  verifyTokenPayload,
} from './mailbox-token-utils.js'

function toTime(offsetSeconds) {
  return new Date(Date.now() - offsetSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ')
}

describe('mailbox-token-utils', () => {
  it('builds a versioned token payload from an account row', () => {
    expect(buildTokenPayload({
      accountId: 18,
      email: 'Demo@yx909.indevs.in',
      tokenVersion: 4,
    })).toEqual({
      accountId: 18,
      email: 'demo@yx909.indevs.in',
      version: 4,
    })
  })

  it('signs a stable token for the same account payload', async () => {
    const payload = buildTokenPayload({
      accountId: 18,
      email: 'demo@yx909.indevs.in',
      tokenVersion: 4,
    })

    const first = await signTokenPayload(payload, 'secret')
    const second = await signTokenPayload(payload, 'secret')

    expect(first).toBe(second)
    await expect(verifyTokenPayload(first, 'secret')).resolves.toEqual(payload)
    await expect(verifyTokenPayload(first, 'other-secret')).resolves.toBeNull()
  })

  it('accepts only the active token version for an account', () => {
    expect(isAccountTokenActive(
      { tokenStatus: TOKEN_STATUS.ACTIVE, tokenVersion: 4 },
      { version: 4 },
    )).toBe(true)

    expect(isAccountTokenActive(
      { tokenStatus: TOKEN_STATUS.ACTIVE, tokenVersion: 5 },
      { version: 4 },
    )).toBe(false)

    expect(isAccountTokenActive(
      { tokenStatus: TOKEN_STATUS.DISABLED, tokenVersion: 4 },
      { version: 4 },
    )).toBe(false)
  })

  it('maps the latest 3 mails and extracts codes when present', () => {
    const mails = [
      { emailId: 9, subject: 'welcome', text: 'hello', content: '', sendEmail: 'a@test.com', createTime: toTime(30) },
      { emailId: 8, subject: 'otp', text: 'Your verification code is 625273', content: '', sendEmail: 'b@test.com', createTime: toTime(40) },
      { emailId: 7, subject: 'bill', text: 'invoice attached', content: '', sendEmail: 'c@test.com', createTime: toTime(50) },
      { emailId: 6, subject: 'older', text: 'code 8888', content: '', sendEmail: 'd@test.com', createTime: toTime(60) },
    ]

    expect(mapRecentMails(mails)).toEqual([
      expect.objectContaining({ emailId: 9, verifyCode: null }),
      expect.objectContaining({ emailId: 8, verifyCode: '625273' }),
      expect.objectContaining({ emailId: 7, verifyCode: null }),
    ])
  })

  it('finds the newest mail with a code inside the recent window', () => {
    const mails = [
      { emailId: 10, subject: 'notice', text: 'no code here', content: '', sendEmail: 'a@test.com', createTime: toTime(10) },
      { emailId: 9, subject: 'otp', text: 'Use 123456 to continue', content: '', sendEmail: 'b@test.com', createTime: toTime(20) },
      { emailId: 8, subject: 'too old', text: 'code 9999', content: '', sendEmail: 'c@test.com', createTime: toTime(60 * 11) },
    ]

    expect(findLatestCodeMail(mails)).toEqual(expect.objectContaining({
      emailId: 9,
      verifyCode: '123456',
    }))
  })
})
