export const ADMIN_TOOL_DOMAIN = 'yx909.indevs.in'
export const ADMIN_TOOL_TOKEN_STATUS = {
  ACTIVE: 0,
  DISABLED: 1,
}

export function buildAdminToolEmail(prefix) {
  const value = (prefix || '').trim().toLowerCase()
  return value ? `${value}@${ADMIN_TOOL_DOMAIN}` : ''
}

export function shouldRefreshToken(currentEmail, nextEmail, currentToken) {
  return !currentToken || currentEmail !== nextEmail
}

export function getSelectedMailId(mails, currentMailId) {
  if (!Array.isArray(mails) || mails.length === 0) {
    return null
  }

  if (mails.some(mail => mail.emailId === currentMailId)) {
    return currentMailId
  }

  return mails[0].emailId
}

export function getTokenStatusMeta(status) {
  if (status === ADMIN_TOOL_TOKEN_STATUS.ACTIVE) {
    return { label: '启用中', type: 'success' }
  }

  if (status === ADMIN_TOOL_TOKEN_STATUS.DISABLED) {
    return { label: '已禁用', type: 'danger' }
  }

  return { label: '未知状态', type: 'info' }
}

export function shouldResetAdminToolState(currentEmail, nextEmail) {
  return !!currentEmail && currentEmail !== nextEmail
}
