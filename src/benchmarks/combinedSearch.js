import Benchmark from 'benchmark'
import { miniSearch as ms } from './divinaCommedia.js'

const suite = new Benchmark.Suite('Combined search')
suite.add('MiniSearch#search("virtute e conoscienza")', () => {
  ms.search('virtute e conoscienza', {
    fuzzy: 0.2,
    prefix: true
  })
})

export default suite
