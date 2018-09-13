import { stats } from './divinaCommedia.js'
import fuzzySearch from './fuzzySearch.js'
import prefixSearch from './prefixSearch.js'
import exactSearch from './exactSearch.js'

console.log(`\nIndexing time: ${stats.indexingTime}ms`)
console.log(`Index size: ${stats.terms} terms, ${stats.documents} documents.\n`)

;[fuzzySearch, prefixSearch, exactSearch].forEach(suite => {
  suite.on('start', () => {
    console.log(`${suite.name}:`)
    console.log('='.repeat(suite.name.length + 1))
  }).on('cycle', ({ target: benchmark }) => {
    console.log(`  * ${benchmark}`)
  }).on('complete', () => {
    console.log('')
  }).run()
})
