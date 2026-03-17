export const ADMIN_TOOL_DOMAIN = 'yx909.indevs.in'

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
