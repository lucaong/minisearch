const Benchmark = require('benchmark')
import { miniSearch } from './divinaCommedia.js'

const suite = new Benchmark.Suite('Search filtering')
suite.add('MiniSearch#search("virtu", { filter: ... })', () => {
  miniSearch.search('virtu', {
    prefix: true,
    filter: ({ id }) => id.startsWith('Inf')
  })
})

export default suite
