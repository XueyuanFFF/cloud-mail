export const CODE_RATE_LIMIT_SECONDS = 5

export function extractCodeFromText(text) {
  if (!text) return null

  const patterns = [
    /(?:验证码|校验码|动态码|verification\s*code|verify\s*code|otp|code)[^\d]{0,12}(\d{4,8})/i,
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
