import { describe, expect, it } from 'vitest'

import { permKeyToPaths } from './perm-paths.js'

describe('permKeyToPaths', () => {
  it('maps mailbox token permissions to protected endpoints', () => {
    expect(permKeyToPaths(['mailboxToken:generate'])).toContain('/mailboxToken/current')
    expect(permKeyToPaths(['mailboxToken:generate'])).toContain('/mailboxToken/rotate')
    expect(permKeyToPaths(['mailboxToken:generate'])).toContain('/mailboxToken/disable')
    expect(permKeyToPaths(['mailboxToken:generate'])).toContain('/mailboxToken/enable')
    expect(permKeyToPaths(['mailboxToken:generate'])).toContain('/mailboxToken/recent')
    expect(permKeyToPaths(['mailboxToken:ban'])).toContain('/mailboxToken/ban')
    expect(permKeyToPaths(['mailboxToken:unban'])).toContain('/mailboxToken/unban')
  })

  it('lets account:add admins reach the admin token actions they are allowed to use', () => {
    const paths = permKeyToPaths(['account:add'])

    expect(paths).toContain('/account/add')
    expect(paths).toContain('/mailboxToken/current')
    expect(paths).toContain('/mailboxToken/rotate')
    expect(paths).toContain('/mailboxToken/recent')
    expect(paths).not.toContain('/mailboxToken/disable')
    expect(paths).not.toContain('/mailboxToken/enable')
  })
})
