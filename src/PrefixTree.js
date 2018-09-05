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
    return new PrefixTreeIterator(this, ENTRIES)
  }

  forEach (fn) {
    for (let [key, value] of this) {
      fn(key, value, this)
    }
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
    return new PrefixTreeIterator(this, KEYS)
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

  values () {
    return new PrefixTreeIterator(this, VALUES)
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
    return [tree[char], [...path, tree]]
  }, [tree, []])
  if (node === undefined) { return }
  delete node[LEAF]
  if (Object.keys(node).length === 0) { cleanup(path) }
}

const cleanup = function (path) {
  if (path.length === 0) { return }
  const node = last(path)
  if (Object.keys(node).length === 1) {
    delete node[Object.keys(node)[0]]
    cleanup(path.slice(0, -1))
  }
}

class PrefixTreeIterator {
  constructor (set, type = ENTRIES) {
    const node = set._tree
    const keys = Object.keys(node)
    this.set = set
    this.type = type
    this.path = keys.length > 0 ? [{ node, keys }] : []
  }

  next () {
    const value = this.dive()
    this.backtrack()
    return value
  }

  dive () {
    if (this.path.length === 0) { return { done: true } }
    const {node, keys} = last(this.path)
    if (last(keys) === LEAF) { return { done: false, value: this.result() } }
    this.path.push({ node: node[last(keys)], keys: Object.keys(node[last(keys)]) })
    return this.dive()
  }

  backtrack () {
    if (this.path.length === 0) { return }
    last(this.path).keys.pop()
    if (last(this.path).keys.length > 0) { return }
    this.path.pop()
    this.backtrack()
  }

  key () {
    return this.set._prefix + this.path
      .map(({keys}) => last(keys))
      .filter(key => key !== LEAF)
      .join('')
  }

  value () {
    return last(this.path).node[LEAF]
  }

  result () {
    if (this.type === VALUES) { return this.value() }
    if (this.type === KEYS) { return this.key() }
    return [this.key(), this.value()]
  }

  [Symbol.iterator] () {
    return this
  }
}

const ENTRIES = 'ENTRIES'
const KEYS = 'KEYS'
const VALUES = 'VALUES'
const LEAF = '_$'

const last = function (array) {
  return array[array.length - 1]
}

export default PrefixTree
export { PrefixTree, PrefixTreeIterator, ENTRIES, KEYS, VALUES, LEAF }
