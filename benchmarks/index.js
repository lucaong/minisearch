import { index, miniSearch } from './divinaCommedia.js'
import fuzzySearch from './fuzzySearch.js'
import prefixSearch from './prefixSearch.js'
import exactSearch from './exactSearch.js'
import indexing from './indexing.js'
import combinedSearch from './combinedSearch.js'
import loadIndex from './loadIndex.js'
import autoSuggestion from './autoSuggestion.js'

const sizeMb = function (string) {
  return string.length / (1000 * 1000)
}

const size = sizeMb(JSON.stringify(index)).toFixed(2)

console.log(`Index size: ${index.size} terms, ${miniSearch.documentCount} documents, ${size}MB serialized.\n`)

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
