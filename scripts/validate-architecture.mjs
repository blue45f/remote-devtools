import fs from 'node:fs'

const ROOT = process.cwd()
const packageJsonPath = `${ROOT}/package.json`
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, `utf8`))
const scripts = pkg.scripts || {}

const requiredPaths = [
  'README.md',
  'docs/ARCHITECTURE.md',
  'docs/DEVELOPMENT.md',
  'package.json',
]

const requiredScripts = [
  'verify',
  'ci',
]

const missing = []
for (const file of requiredPaths) {
  if (!fs.existsSync(`${ROOT}/${file}`)) {
    missing.push(`file://${file}`)
  }
}

for (const script of requiredScripts) {
  if (!scripts[script]) {
    missing.push(`script://${script}`)
  }
}

if (pkg.workspaces) {
  const hasApps = fs.existsSync(`${ROOT}/apps`)
  const hasPackages = fs.existsSync(`${ROOT}/packages`)
  if (!hasApps && !hasPackages) {
    missing.push('workspace-structure')
  }
}

if (missing.length > 0) {
  console.error(`architecture validation failed: ${missing.length} issue(s)`) 
  for (const item of missing) {
    console.error(` - missing: ${item}`)
  }
  process.exit(1)
}

console.log('architecture validation passed: required files and scripts are present')
