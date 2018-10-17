import Benchmark from 'benchmark'
import { miniSearch as ms } from './divinaCommedia.js'

const suite = new Benchmark.Suite('Auto suggestion')
suite.add('MiniSearch#autoSuggest("vir cano")', () => {
  ms.autoSuggest('vir cano')
})

export default suite
