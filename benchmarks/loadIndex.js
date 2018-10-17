import Benchmark from 'benchmark'
import MiniSearch from '../src/MiniSearch.js'
import { miniSearch as ms } from './divinaCommedia.js'

const json = JSON.stringify(ms)

const suite = new Benchmark.Suite('Load index')
suite.add('MiniSearch.loadJSON(json, options)', () => {
  MiniSearch.loadJSON(json, { fields: ['txt'] })
})

export default suite
