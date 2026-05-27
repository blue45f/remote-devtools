import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const distDir = new URL('../dist/assets', import.meta.url)
const limitKiB = Number.parseInt(process.env.BUNDLE_CHUNK_LIMIT_KB ?? '600', 10)
const limitBytes = limitKiB * 1024

async function collectJavaScriptAssets(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const assets = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) {
        return collectJavaScriptAssets(path)
      }

      if (!entry.isFile() || !entry.name.endsWith('.js')) {
        return []
      }

      const metadata = await stat(path)

      return [{ path, size: metadata.size }]
    }),
  )

  return assets.flat()
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`
}

const assets = await collectJavaScriptAssets(distDir.pathname)
const oversizedAssets = assets
  .filter((asset) => asset.size > limitBytes)
  .sort((left, right) => right.size - left.size)

if (oversizedAssets.length > 0) {
  console.error(`Build chunk budget exceeded (${limitKiB} KiB max):`)

  for (const asset of oversizedAssets) {
    console.error(
      `- ${relative(process.cwd(), asset.path)}: ${formatKiB(asset.size)}`,
    )
  }

  process.exit(1)
}

console.log(`Build chunk budget passed (${limitKiB} KiB max).`)
