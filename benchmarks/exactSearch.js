const Benchmark = require('benchmark')
import { index } from './divinaCommedia.js'

const suite = new Benchmark.Suite('Exact search')
suite.add('SearchableMap#get("virtute")', () => {
  index.get('virtute')
})

export default suite
