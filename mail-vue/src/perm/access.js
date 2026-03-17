function normalizePermKeys(permKeys) {
  return Array.isArray(permKeys) ? permKeys : []
}

export function isSuperAdmin(permKeys) {
  return normalizePermKeys(permKeys).includes('*')
}

export function canAccessSystemSettings(permKeys) {
  return isSuperAdmin(permKeys)
}

export function canGenerateMailboxToken(permKeys) {
  const keys = normalizePermKeys(permKeys)
  return isSuperAdmin(keys) || keys.includes('mailboxToken:generate')
}

export function canAddSubAccount(permKeys) {
  const keys = normalizePermKeys(permKeys)
  return isSuperAdmin(keys) || keys.includes('account:add')
}

export function canAccessAdminTool(permKeys, adminToolSwitch = 1) {
  const keys = normalizePermKeys(permKeys)

  if (isSuperAdmin(keys)) {
    return true
  }

  if (adminToolSwitch !== 0) {
    return false
  }

  return canGenerateMailboxToken(keys) || canAddSubAccount(keys)
}
