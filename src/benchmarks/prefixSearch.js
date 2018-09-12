import Benchmark from 'benchmark'
import { index } from './deRerumNatura.js'

const suite = new Benchmark.Suite('Prefix search')
suite.add('Array.from(SearchableMap#atPrefix("pra"))', () => {
  Array.from(index.atPrefix('pra'))
}).add('Array.from(SearchableMap#atPrefix("praecl"))', () => {
  Array.from(index.atPrefix('praecl'))
})

export default suite
