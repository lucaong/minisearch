/**
* @private
*/
class TreeIterator {
  constructor (set, type) {
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
    const { node, keys } = last(this.path)
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
      .map(({ keys }) => last(keys))
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

/** @ignore */
const ENTRIES = 'ENTRIES'

/** @ignore */
const KEYS = 'KEYS'

/** @ignore */
const VALUES = 'VALUES'

/** @ignore */
const LEAF = ''

const last = function (array) {
  return array[array.length - 1]
}

export { TreeIterator, ENTRIES, KEYS, VALUES, LEAF }
