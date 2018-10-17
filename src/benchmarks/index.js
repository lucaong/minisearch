import { index, miniSearch } from './divinaCommedia.js'
import fuzzySearch from './fuzzySearch.js'
import prefixSearch from './prefixSearch.js'
import exactSearch from './exactSearch.js'
import indexing from './indexing.js'
import combinedSearch from './combinedSearch.js'
import loadIndex from './loadIndex.js'
import autoSuggestion from './autoSuggestion.js'

console.log(`Index size: ${index.size} terms, ${miniSearch.documentCount} documents.\n`)

;[fuzzySearch, prefixSearch, exactSearch, indexing, combinedSearch, autoSuggestion, loadIndex].forEach(suite => {
  suite.on('start', () => {
    console.log(`${suite.name}:`)
    console.log('='.repeat(suite.name.length + 1))
  }).on('cycle', ({ target: benchmark }) => {
    console.log(`  * ${benchmark}`)
  }).on('complete', () => {
    console.log('')
  }).run()
})
