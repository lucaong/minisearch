import fuzzySearch from './fuzzySearch.js'
import prefixSearch from './prefixSearch.js'
import exactSearch from './exactSearch.js'
import indexing from './indexing.js'
import combinedSearch from './combinedSearch.js'
import loadIndex from './loadIndex.js'
import autoSuggestion from './autoSuggestion.js'
import searchFiltering from './searchFiltering.js'
import memory from './memory.js'
import { lines } from './divinaCommedia.js'

const { terms, documents, memSize, serializedSize } = memory(lines)
console.log(`Index size: ${terms} terms, ${documents} documents, ~${memSize}MB in memory, ${serializedSize}MB serialized.\n`)

;[fuzzySearch, prefixSearch, exactSearch, indexing, combinedSearch, searchFiltering, autoSuggestion, loadIndex].forEach(suite => {
  suite.on('start', () => {
    console.log(`${suite.name}:`)
    console.log('='.repeat(suite.name.length + 1))
  }).on('cycle', ({ target: benchmark }) => {
    console.log(`  * ${benchmark}`)
  }).on('complete', () => {
    console.log('')
  }).run()
})
