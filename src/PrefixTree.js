import { TreeIterator, ENTRIES, KEYS, VALUES, LEAF } from './TreeIterator.js'
import fuzzySearch from './fuzzySearch.js'

class PrefixTree {
  constructor (tree = {}, prefix = '') {
    this._tree = tree
    this._prefix = prefix
  }

  atPrefix (prefix) {
    if (!prefix.startsWith(this._prefix)) { throw new Error('Mismatched prefix') }
    const subtree = lookup(this._tree, prefix.slice(this._prefix.length))
    return new PrefixTree(subtree || {}, prefix)
  }

  clear () {
    delete this._size
    this._tree = {}
  }

  delete (key) {
    delete this._size
    return deleteAndCleanup(this._tree, key)
  }

  entries () {
    return new TreeIterator(this, ENTRIES)
  }

  forEach (fn) {
    for (let [key, value] of this) {
      fn(key, value, this)
    }
  }

  fuzzyGet (key, maxEditDistance) {
    return fuzzySearch(this._tree, key, maxEditDistance)
  }

  get (key) {
    const node = lookup(this._tree, key)
    return node && node[LEAF]
  }

  has (key) {
    const node = lookup(this._tree, key)
    return !!(node && node.hasOwnProperty(LEAF))
  }

  keys () {
    return new TreeIterator(this, KEYS)
  }

  set (key, value = true) {
    if (typeof key !== 'string') { throw new Error('key must be a string') }
    delete this._size
    const node = createPath(this._tree, key)
    node[LEAF] = value
    return this
  }

  get size () {
    if (this._size) { return this._size }
    this._size = 0
    this.forEach(() => { this._size += 1 })
    return this._size
  }

  update (key, fn) {
    if (typeof key !== 'string') { throw new Error('key must be a string') }
    delete this._size
    const node = createPath(this._tree, key)
    node[LEAF] = fn(node[LEAF])
    return this
  }

  values () {
    return new TreeIterator(this, VALUES)
  }

  [Symbol.iterator] () {
    return this.entries()
  }
}

PrefixTree.from = function (entries) {
  const tree = new PrefixTree()
  for (let [key, value] of entries) {
    tree.set(key, value)
  }
  return tree
}

PrefixTree.fromObject = function (object) {
  return PrefixTree.from(Object.entries(object))
}

const lookup = function (tree, key) {
  const chars = key.split('')
  return chars.reduce((tree, char) => {
    if (tree === undefined) { return undefined }
    return tree[char]
  }, tree)
}

const createPath = function (tree, key) {
  const chars = key.split('')
  return chars.reduce((tree, char) => {
    tree[char] = tree[char] || {}
    return tree[char]
  }, tree)
}

const deleteAndCleanup = function (tree, key) {
  const chars = key.split('')
  const [node, path] = chars.reduce(([tree, path], char) => {
    if (tree === undefined) { return [tree, path] }
    return [tree[char], [...path, [tree, char]]]
  }, [tree, []])
  if (node === undefined) { return }
  delete node[LEAF]
  if (Object.keys(node).length === 0) { cleanup(path) }
}

const cleanup = function (path) {
  if (path.length === 0) { return }
  const [node, key] = last(path)
  delete node[key]
  if (Object.keys(node).length === 0) {
    cleanup(path.slice(0, -1))
  }
}

const last = function (array) {
  return array[array.length - 1]
}

export default PrefixTree
export { PrefixTree }
