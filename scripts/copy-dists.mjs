import { cpSync, rmSync } from 'fs'
import { join } from 'path'

const packages = ['types', 'constants', 'core', 'interact', 'line']

for (const pkg of packages) {
  const src = join('packages', pkg, 'dist')
  const dest = join('dist', pkg)
  try {
    rmSync(dest, { recursive: true, force: true })
    cpSync(src, dest, { recursive: true })
  } catch (e) {
    console.warn(`Failed to copy ${pkg}:`, e.message)
  }
}
