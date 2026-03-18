function isEmail(value) {
  return /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(value)
}

function isDomain(value) {
  return /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(value)
}

function normalizeBaseUrl(value) {
  if (!value) {
    return ''
  }

  let url = value.trim()

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }

  return url.replace(/\/+$/, '')
}

export function resolveWorkerBaseUrl(customDomain, workerUrl) {
  const trimmedCustomDomain = customDomain?.trim() || ''

  if (trimmedCustomDomain) {
    const bareCustomDomain = trimmedCustomDomain
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')

    if (isDomain(bareCustomDomain) && !isEmail(bareCustomDomain)) {
      return {
        source: 'custom_domain',
        url: normalizeBaseUrl(trimmedCustomDomain),
        warning: null,
      }
    }
  }

  const normalizedWorkerUrl = normalizeBaseUrl(workerUrl)

  if (normalizedWorkerUrl) {
    return {
      source: 'worker_url',
      url: normalizedWorkerUrl,
      warning: trimmedCustomDomain
        ? 'Ignoring CUSTOM_DOMAIN because it is not a valid domain.'
        : null,
    }
  }

  throw new Error('Unable to resolve a worker base URL.')
}
