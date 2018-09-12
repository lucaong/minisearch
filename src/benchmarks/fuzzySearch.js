import Benchmark from 'benchmark'
import { index } from './deRerumNatura.js'

const suite = new Benchmark.Suite('Fuzzy search')
suite.add('SearchableMap#fuzzyGet("natura", 1)', () => {
  index.fuzzyGet('natura', 1)
}).add('SearchableMap#fuzzyGet("natura", 2)', () => {
  index.fuzzyGet('natura', 2)
}).add('SearchableMap#fuzzyGet("natura", 3)', () => {
  index.fuzzyGet('natura', 3)
})

export default suite
