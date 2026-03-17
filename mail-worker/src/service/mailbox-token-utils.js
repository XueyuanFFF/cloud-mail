export const TOKEN_STATUS = {
  ACTIVE: 0,
  DISABLED: 1,
}

export function buildTokenPayload(accountRow) {
  return {
    accountId: Number(accountRow?.accountId || 0),
    email: String(accountRow?.email || '').trim().toLowerCase(),
    version: Number(accountRow?.tokenVersion || 1),
  }
}

function bytesToBase64Url(bytes) {
  let text = ''
  for (const byte of bytes) {
    text += String.fromCharCode(byte)
  }
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function deriveHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signTokenPayload(payload, secret) {
  const payloadString = JSON.stringify(payload)
  const payloadBytes = new TextEncoder().encode(payloadString)
  const key = await deriveHmacKey(secret)
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, payloadBytes))

  return `${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(signature)}`
}

export async function verifyTokenPayload(token, secret) {
  try {
    const [payloadPart, signaturePart] = String(token || '').split('.')
    if (!payloadPart || !signaturePart) {
      return null
    }

    const payloadBytes = base64UrlToBytes(payloadPart)
    const signatureBytes = base64UrlToBytes(signaturePart)
    const key = await deriveHmacKey(secret)
    const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes)

    if (!isValid) {
      return null
    }

    return JSON.parse(new TextDecoder().decode(payloadBytes))
  } catch {
    return null
  }
}

export function isAccountTokenActive(accountRow, tokenPayload) {
  return Number(accountRow?.tokenStatus ?? TOKEN_STATUS.ACTIVE) === TOKEN_STATUS.ACTIVE
    && Number(accountRow?.tokenVersion || 1) === Number(tokenPayload?.version || 0)
}

export function extractCodeFromText(text) {
  if (!text) return null

  const patterns = [
    /(?:验证码|校验码|动态码|確認碼|verification\s*code|verify\s*code|otp|code)[^\d]{0,12}(\d{4,8})/i,
  ]

  for (const reg of patterns) {
    const match = text.match(reg)
    if (match && match[1]) {
      return match[1]
    }
  }

  const common = text.match(/\b\d{4,8}\b/)
  return common ? common[0] : null
}

export function isWithinMinutes(timeStr, minutes = 10) {
  if (!timeStr) return false
  const mailTime = new Date(timeStr.replace(' ', 'T') + 'Z').getTime()
  const now = Date.now()
  return now - mailTime >= 0 && now - mailTime <= minutes * 60 * 1000
}

export function mapRecentMails(mails, limit = 3) {
  return (Array.isArray(mails) ? mails : []).slice(0, limit).map(mail => ({
    emailId: mail.emailId,
    subject: mail.subject || '',
    text: mail.text || '',
    content: mail.content || '',
    sendEmail: mail.sendEmail || '',
    createTime: mail.createTime,
    verifyCode: extractCodeFromText([mail.text || '', mail.subject || '', mail.content || ''].join('\n')),
  }))
}

export function findLatestCodeMail(mails, minutes = 10) {
  for (const mail of Array.isArray(mails) ? mails : []) {
    if (!isWithinMinutes(mail.createTime, minutes)) continue

    const verifyCode = extractCodeFromText([mail.text || '', mail.subject || '', mail.content || ''].join('\n'))
    if (!verifyCode) continue

    return {
      emailId: mail.emailId,
      subject: mail.subject || '',
      text: mail.text || '',
      content: mail.content || '',
      sendEmail: mail.sendEmail || '',
      createTime: mail.createTime,
      verifyCode,
    }
  }

  return null
}
