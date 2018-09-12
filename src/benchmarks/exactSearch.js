import Benchmark from 'benchmark'
import { index } from './deRerumNatura.js'

const suite = new Benchmark.Suite('Exact search')
suite.add('SearchableMap#get("natura")', () => {
  index.get('natura')
})

export default suite
