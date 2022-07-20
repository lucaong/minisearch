import Benchmark from 'benchmark'
import { miniSearch as ms } from './divinaCommedia.js'

const suite = new Benchmark.Suite('Ranking search results')
suite.add('MiniSearch#search("vi", { prefix: true })', () => {
  ms.search('vi', {
    prefix: true
  })
})

export default suite
