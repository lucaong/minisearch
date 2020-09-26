const Benchmark = require('benchmark')
import { miniSearch as ms } from './divinaCommedia.js'

const suite = new Benchmark.Suite('Auto suggestion')
suite.add('MiniSearch#autoSuggest("virtute cano")', () => {
  ms.autoSuggest('virtute cano')
}).add('MiniSearch#autoSuggest("virtue conoscienza", { fuzzy: 0.2 })', () => {
  ms.autoSuggest('virtue conoscienza')
})

export default suite
