import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAdminToolEmail,
  getTokenStatusMeta,
  getSelectedMailId,
  shouldResetAdminToolState,
  shouldRefreshToken,
} from './model.js'

test('buildAdminToolEmail normalizes prefix and appends domain', () => {
  assert.equal(buildAdminToolEmail('  Demo.User '), 'demo.user@yx909.indevs.in')
})

test('shouldRefreshToken only reuses token for the same email', () => {
  assert.equal(shouldRefreshToken('', 'demo@yx909.indevs.in', ''), true)
  assert.equal(shouldRefreshToken('demo@yx909.indevs.in', 'demo@yx909.indevs.in', 'token-value'), false)
  assert.equal(shouldRefreshToken('old@yx909.indevs.in', 'demo@yx909.indevs.in', 'token-value'), true)
})

test('getSelectedMailId keeps current selection when possible', () => {
  const mails = [{ emailId: 3 }, { emailId: 2 }, { emailId: 1 }]

  assert.equal(getSelectedMailId(mails, 2), 2)
  assert.equal(getSelectedMailId(mails, 8), 3)
  assert.equal(getSelectedMailId([], 8), null)
})

test('getTokenStatusMeta maps account token states for the UI', () => {
  assert.deepEqual(getTokenStatusMeta(0), { label: '启用中', type: 'success' })
  assert.deepEqual(getTokenStatusMeta(1), { label: '已禁用', type: 'danger' })
  assert.deepEqual(getTokenStatusMeta(undefined), { label: '未知状态', type: 'info' })
})

test('shouldResetAdminToolState resets when switching to a different email', () => {
  assert.equal(shouldResetAdminToolState('', 'demo@yx909.indevs.in'), false)
  assert.equal(shouldResetAdminToolState('demo@yx909.indevs.in', 'demo@yx909.indevs.in'), false)
  assert.equal(shouldResetAdminToolState('old@yx909.indevs.in', 'demo@yx909.indevs.in'), true)
})
