import Benchmark from 'benchmark'
import { index } from './divinaCommedia.js'

const suite = new Benchmark.Suite('Fuzzy search')
suite.add('SearchableMap#fuzzyGet("virtute", 1)', () => {
  index.fuzzyGet('virtute', 1)
}).add('SearchableMap#fuzzyGet("virtu", 2)', () => {
  index.fuzzyGet('virtu', 2)
}).add('SearchableMap#fuzzyGet("virtu", 3)', () => {
  index.fuzzyGet('virtu', 3)
})

export default suite
