import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canAccessAdminTool,
  canAccessSystemSettings,
  canAddSubAccount,
  canGenerateMailboxToken,
  canUseAdminToolExtraButtons,
  canUseAdminToolRecentMails,
  canUseAdminToolTokenActions,
  isSuperAdmin,
} from './access.js'

test('super admin always keeps elevated access', () => {
  const permKeys = ['*']

  assert.equal(isSuperAdmin(permKeys), true)
  assert.equal(canAccessSystemSettings(permKeys), true)
  assert.equal(canAccessAdminTool(permKeys, 1), true)
  assert.equal(canGenerateMailboxToken(permKeys), true)
  assert.equal(canAddSubAccount(permKeys), true)
})

test('system settings stay blocked for non-super-admin users', () => {
  assert.equal(canAccessSystemSettings(['setting:query']), false)
  assert.equal(canAccessSystemSettings(['mailboxToken:generate']), false)
})

test('admin tool page requires switch enabled for regular admins', () => {
  assert.equal(canAccessAdminTool(['account:add'], 1), false)
  assert.equal(canAccessAdminTool(['account:add'], 0), true)
  assert.equal(canAccessAdminTool(['mailboxToken:generate'], 0), true)
})

test('page access does not grant every action inside admin tool', () => {
  assert.equal(canGenerateMailboxToken(['account:add']), false)
  assert.equal(canAddSubAccount(['account:add']), true)
  assert.equal(canGenerateMailboxToken(['mailboxToken:generate']), true)
  assert.equal(canAddSubAccount(['mailboxToken:generate']), false)
})

test('admins with account:add can use token actions in admin tool', () => {
  assert.equal(canUseAdminToolTokenActions(['account:add']), true)
  assert.equal(canUseAdminToolTokenActions(['mailboxToken:generate']), true)
  assert.equal(canUseAdminToolTokenActions(['setting:query']), false)
})

test('extra admin tool buttons are gated by the dedicated switch for regular admins', () => {
  assert.equal(canUseAdminToolExtraButtons(['account:add'], 1), false)
  assert.equal(canUseAdminToolExtraButtons(['account:add'], 0), true)
  assert.equal(canUseAdminToolRecentMails(['account:add'], 1), false)
  assert.equal(canUseAdminToolRecentMails(['account:add'], 0), true)
  assert.equal(canUseAdminToolRecentMails(['mailboxToken:generate'], 0), true)
})

test('super admin bypasses the extra admin tool button switch', () => {
  assert.equal(canUseAdminToolExtraButtons(['*'], 1), true)
  assert.equal(canUseAdminToolRecentMails(['*'], 1), true)
})
