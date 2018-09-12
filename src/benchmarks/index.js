import fuzzySearch from './fuzzySearch.js'

console.log('')

;[fuzzySearch].forEach(suite => {
  suite.on('start', () => {
    console.log(`${suite.name}:`)
    console.log('='.repeat(suite.name.length + 1))
  }).on('cycle', ({ target: benchmark }) => {
    console.log(`  * ${benchmark}`)
  }).on('complete', () => {
    console.log('')
  }).run({ async: true })
})
