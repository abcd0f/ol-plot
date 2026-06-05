import { writeFileSync } from 'fs'

const packages = ['types', 'constants', 'core', 'interact', 'line']

const mjsContent = packages.map(pkg => `export * from './${pkg}/index.mjs';`).join('\n')
const cjsContent = packages.map(pkg => `module.exports = {...module.exports, ...require('./${pkg}/index.cjs')};`).join('\n')

writeFileSync('dist/index.mjs', mjsContent + '\n')
writeFileSync('dist/index.cjs', cjsContent + '\n')
