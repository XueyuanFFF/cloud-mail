import { resolveWorkerBaseUrl } from '../src/utils/deploy-utils.mjs'

const [customDomain = '', workerUrl = ''] = process.argv.slice(2)

try {
  const result = resolveWorkerBaseUrl(customDomain, workerUrl)

  if (result.warning) {
    console.error(result.warning)
  }

  process.stdout.write(result.url)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
