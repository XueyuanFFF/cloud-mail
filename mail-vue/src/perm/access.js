function normalizePermKeys(permKeys) {
  return Array.isArray(permKeys) ? permKeys : []
}

function isSwitchEnabled(switchValue = 1) {
  return Number(switchValue ?? 1) === 0
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

export function canUseAdminToolTokenActions(permKeys) {
  const keys = normalizePermKeys(permKeys)
  return canGenerateMailboxToken(keys) || canAddSubAccount(keys)
}

export function canUseAdminToolExtraButtons(permKeys, adminToolExtraSwitch = 1) {
  const keys = normalizePermKeys(permKeys)

  if (isSuperAdmin(keys)) {
    return true
  }

  if (!isSwitchEnabled(adminToolExtraSwitch)) {
    return false
  }

  return canGenerateMailboxToken(keys) || canAddSubAccount(keys)
}

export function canUseAdminToolRecentMails(permKeys, adminToolExtraSwitch = 1) {
  const keys = normalizePermKeys(permKeys)

  if (isSuperAdmin(keys)) {
    return true
  }

  if (!isSwitchEnabled(adminToolExtraSwitch)) {
    return false
  }

  return canUseAdminToolTokenActions(keys)
}

export function canAccessAdminTool(permKeys, adminToolSwitch = 1) {
  const keys = normalizePermKeys(permKeys)

  if (isSuperAdmin(keys)) {
    return true
  }

  if (!isSwitchEnabled(adminToolSwitch)) {
    return false
  }

  return canUseAdminToolTokenActions(keys)
}
