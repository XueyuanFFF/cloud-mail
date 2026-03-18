import { describe, expect, it } from 'vitest'

import { resolveWorkerBaseUrl } from './deploy-utils.mjs'

describe('deploy-utils', () => {
  it('uses the custom domain as an https base url when it is a plain domain', () => {
    expect(resolveWorkerBaseUrl('yx909.indevs.in', 'https://cloud-mail.workers.dev')).toEqual({
      source: 'custom_domain',
      url: 'https://yx909.indevs.in',
      warning: null,
    })
  })

  it('falls back to the workers.dev url when the custom domain looks like an email address', () => {
    expect(resolveWorkerBaseUrl('admin@yx909.indevs.in', 'https://cloud-mail.workers.dev')).toEqual({
      source: 'worker_url',
      url: 'https://cloud-mail.workers.dev',
      warning: 'Ignoring CUSTOM_DOMAIN because it is not a valid domain.',
    })
  })

  it('throws when neither a valid custom domain nor a worker url is available', () => {
    expect(() => resolveWorkerBaseUrl('admin@yx909.indevs.in', '')).toThrow(
      'Unable to resolve a worker base URL.',
    )
  })
})
