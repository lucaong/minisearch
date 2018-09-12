import Benchmark from 'benchmark'
import { lines } from '../testSetup/deRerumNatura.js'
import RadixTree from '../RadixTree.js'
import PrefixTree from '../PrefixTree.js'

const radixTree = new RadixTree()
const prefixTree = new PrefixTree()

lines.forEach((line, i) => {
  line.split(/\s+/).forEach(word => {
    radixTree.update(word, docs => [...(docs || []), i])
    prefixTree.update(word, docs => [...(docs || []), i])
  })
})

const query = 'quae'
const maxDistance = 2

const suite = new Benchmark.Suite('Fuzzy search')
suite.add('RadixTree', () => {
  radixTree.fuzzyGet(query, maxDistance)
}).add('PrefixTree', () => {
  radixTree.fuzzyGet(query, maxDistance)
})

export default suite
