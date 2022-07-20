import Benchmark from 'benchmark'
import MiniSearch from '../src/MiniSearch.js'
import { lines } from './divinaCommedia.js'

const suite = new Benchmark.Suite('Indexing')
suite.add('MiniSearch#addAll(documents)', () => {
  const ms = new MiniSearch({ fields: ['txt'] })
  ms.addAll(lines)
})

export default suite
