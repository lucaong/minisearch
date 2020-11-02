import MiniSearch from '../src/MiniSearch.js'

const heapSize = () => {
  if (global.gc) { global.gc() }
  return process.memoryUsage().heapUsed
}

const bytesToMb = (bytes) => {
  return (bytes / (1024 * 1024)).toFixed(2)
}

const memory = (docs) => {
  const miniSearch = new MiniSearch({ fields: ['txt'], storeFields: ['txt'] })

  const heapBefore = heapSize()
  miniSearch.addAll(docs)
  const heapAfter = heapSize()

  const terms = miniSearch._index.size
  const documents = miniSearch.documentCount
  const memSize = bytesToMb(heapAfter - heapBefore)
  const serializedSize = bytesToMb(JSON.stringify(miniSearch).length)

  return { terms, documents, memSize, serializedSize, miniSearch }
}

export default memory
