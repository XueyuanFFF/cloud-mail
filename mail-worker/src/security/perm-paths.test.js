import { describe, expect, it } from 'vitest'

import { permKeyToPaths } from './perm-paths.js'

describe('permKeyToPaths', () => {
  it('maps mailbox token permissions to protected endpoints', () => {
    expect(permKeyToPaths(['mailboxToken:generate'])).toContain('/mailboxToken/generate')
    expect(permKeyToPaths(['mailboxToken:generate'])).toContain('/mailboxToken/recent')
    expect(permKeyToPaths(['mailboxToken:ban'])).toContain('/mailboxToken/ban')
    expect(permKeyToPaths(['mailboxToken:unban'])).toContain('/mailboxToken/unban')
  })

  it('keeps account:add isolated from token endpoints', () => {
    const paths = permKeyToPaths(['account:add'])

    expect(paths).toContain('/account/add')
    expect(paths).not.toContain('/mailboxToken/generate')
  })
})
