import Benchmark from 'benchmark'
import { index } from './divinaCommedia.js'

const suite = new Benchmark.Suite('Prefix search')
suite.add('Array.from(SearchableMap#atPrefix("vir"))', () => {
  Array.from(index.atPrefix('vir'))
}).add('Array.from(SearchableMap#atPrefix("virtut"))', () => {
  Array.from(index.atPrefix('virtut'))
})

export default suite
