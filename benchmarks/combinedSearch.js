import Benchmark from 'benchmark'
import { miniSearch as ms } from './divinaCommedia.js'

const suite = new Benchmark.Suite('Combined search')
suite.add('MiniSearch#search("virtute conoscienza", { fuzzy: 0.2, prefix: true })', () => {
  ms.search('virtute conoscienza', {
    fuzzy: 0.2,
    prefix: true
  })
}).add('MiniSearch#search("virtu", { fuzzy: 0.2, prefix: true })', () => {
  ms.search('virtu', {
    fuzzy: 0.2,
    prefix: true
  })
})

export default suite
