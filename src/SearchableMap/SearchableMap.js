import { TreeIterator, ENTRIES, KEYS, VALUES, LEAF } from './TreeIterator.js'
import fuzzySearch from './fuzzySearch.js'

/**
* A class implementing the same interface as a standard JavaScript `Map` with
* string keys, but adding support for efficiently searching entries with prefix
* or fuzzy search. This is the class internally used by `MiniSearch` as the
* inverted index data structure. The implementation is a radix tree (compressed
* prefix tree).
*
* @implements {Map}
*/
class SearchableMap {
  constructor (tree = {}, prefix = '') {
    /** @private */
    this._tree = tree
    /** @private */
    this._prefix = prefix
  }

  /**
  * Creates and returns a mutable view of this `SearchableMap`, containing only
  * entries that share the given prefix.
  *
  * @example
  * let map = new SearchableMap()
  * map.set("unicorn", 1)
  * map.set("universe", 2)
  * map.set("university", 3)
  * map.set("unique", 4)
  * map.set("hello", 5)
  *
  * let uni = map.atPrefix("uni")
  * uni.get("unique") // => 4
  * uni.get("unicorn") // => 1
  * uni.get("hello") // => undefined
  *
  * let univer = map.atPrefix("univer")
  * uni.get("unique") // => undefined
  * uni.get("universe") // => 2
  * uni.get("university") // => 3
  *
  * @param {string} prefix - The prefix
  * @return {SearchableMap} A `SearchableMap` representing a mutable view of the original Map at the given prefix
  */
  atPrefix (prefix) {
    if (!prefix.startsWith(this._prefix)) { throw new Error('Mismatched prefix') }
    const [node, path] = trackDown(this._tree, prefix.slice(this._prefix.length))
    if (node === undefined) {
      const [parentNode, key] = last(path)
      const nodeKey = Object.keys(parentNode).find(k => k !== LEAF && k.startsWith(key))
      if (nodeKey !== undefined) {
        return new SearchableMap({ [nodeKey.slice(key.length)]: parentNode[nodeKey] }, prefix)
      }
    }
    return new SearchableMap(node || {}, prefix)
  }

  /**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/clear
  * @return {undefined}
  */
  clear () {
    delete this._size
    this._tree = {}
  }

  /**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/delete
  * @param {string} key
  * @return {undefined}
  */
  delete (key) {
    delete this._size
    return remove(this._tree, key)
  }

  /**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/entries
  * @return {Iterator}
  */
  entries () {
    return new TreeIterator(this, ENTRIES)
  }

  /**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
  * @param {function(key: string, value: any): any} fn
  * @return {undefined}
  */
  forEach (fn) {
    for (let [key, value] of this) {
      fn(key, value, this)
    }
  }

  /**
  * Returns a key-value object of all the entries that have a key within the
  * given edit distance from the search key. The keys of the returned object are
  * the matching keys, while the values are two-elements arrays where the first
  * element is the value associated to the key, and the second is the edit
  * distance of the key to the search key.
  *
  * @example
  * let map = new SearchableMap()
  * map.set('hello', 'world')
  * map.set('hell', 'yeah')
  * map.set('ciao', 'mondo')
  *
  * // Get all entries that match the key 'hallo' with a maximum edit distance of 2
  * map.fuzzyGet('hallo', 2)
  * // => { "hello": ["world", 1], "hell": ["yeah", 2] }
  *
  * // In the example, the "hello" key has value "world" and edit distance of 1
  * // (change "e" to "a"), the key "hell" has value "yeah" and edit distance of 2
  * // (change "e" to "a", delete "o")
  *
  * @param {string} key - The search key
  * @param {number} maxEditDistance - The maximum edit distance
  * @return {Object<string, Array>} A key-value object of the matching keys to their value and edit distance
  */
  fuzzyGet (key, maxEditDistance) {
    return fuzzySearch(this._tree, key, maxEditDistance)
  }

  /**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/get
  * @param {string} key
  * @return {any}
  */
  get (key) {
    const node = lookup(this._tree, key)
    return node !== undefined ? node[LEAF] : undefined
  }

  /**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/has
  * @param {string} key
  * @return {boolean}
  */
  has (key) {
    const node = lookup(this._tree, key)
    return node !== undefined && node.hasOwnProperty(LEAF)
  }

  /**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/keys
  * @return {Iterator}
  */
  keys () {
    return new TreeIterator(this, KEYS)
  }

  /**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/set
  * @param {string} key
  * @param {any} value
  * @return {SearchableMap} The `SearchableMap` itself, to allow chaining
  */
  set (key, value) {
    if (typeof key !== 'string') { throw new Error('key must be a string') }
    delete this._size
    const node = createPath(this._tree, key)
    node[LEAF] = value
    return this
  }

  /**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/size
  * @type {number}
  */
  get size () {
    if (this._size) { return this._size }
    /** @ignore */
    this._size = 0
    this.forEach(() => { this._size += 1 })
    return this._size
  }

  /**
  * Updates the value at the given key using the provided function. The function
  * is called with the current value at the key, and its return value is used as
  * the new value to be set.
  *
  * @example
  * // Increment the current value by one
  * searchableMap.update('somekey', (currentValue) => currentValue == null ? 0 : currentValue + 1)
  *
  * @param {string} key - The key
  * @param {function(currentValue: any): any} fn - The function used to compute the new value from the current one
  * @return {SearchableMap} The `SearchableMap` itself, to allow chaining
  */
  update (key, fn) {
    if (typeof key !== 'string') { throw new Error('key must be a string') }
    delete this._size
    const node = createPath(this._tree, key)
    node[LEAF] = fn(node[LEAF])
    return this
  }

  /**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/values
  * @return {Iterator}
  */
  values () {
    return new TreeIterator(this, VALUES)
  }

  /**
  * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
  * @return {Iterator}
  */
  [Symbol.iterator] () {
    return this.entries()
  }
}

/**
* Creates a `SearchableMap` from an `Iterable` of entries
*
* @param {Iterable|Array} entries - Entries to be inserted in the `SearchableMap`
* @return {SearchableMap} A new `SearchableMap` with the given entries
**/
SearchableMap.from = function (entries) {
  const tree = new SearchableMap()
  for (let [key, value] of entries) {
    tree.set(key, value)
  }
  return tree
}

/**
* Creates a `SearchableMap` from the iterable properties of a JavaScript object
*
* @param {Object} object - Object of entries for the `SearchableMap`
* @return {SearchableMap} A new `SearchableMap` with the given entries
**/
SearchableMap.fromObject = function (object) {
  return SearchableMap.from(Object.entries(object))
}

const trackDown = function (tree, key, path = []) {
  if (key.length === 0) { return [tree, path] }
  const nodeKey = Object.keys(tree).find(k => k !== LEAF && key.startsWith(k))
  if (nodeKey === undefined) { return trackDown(undefined, '', [...path, [tree, key]]) }
  return trackDown(tree[nodeKey], key.slice(nodeKey.length), [...path, [tree, nodeKey]])
}

const lookup = function (tree, key) {
  if (key.length === 0) { return tree }
  const nodeKey = Object.keys(tree).find(k => k !== LEAF && key.startsWith(k))
  if (nodeKey === undefined) { return undefined }
  return lookup(tree[nodeKey], key.slice(nodeKey.length))
}

const createPath = function (tree, key) {
  if (key.length === 0) { return tree }
  const nodeKey = Object.keys(tree).find(k => k !== LEAF && key.startsWith(k))
  if (nodeKey === undefined) {
    const toSplit = Object.keys(tree).find(k => k !== LEAF && k.startsWith(key[0]))
    if (toSplit === undefined) {
      tree[key] = {}
    } else {
      const prefix = commonPrefix(key, toSplit)
      tree[prefix] = { [toSplit.slice(prefix.length)]: tree[toSplit] }
      delete tree[toSplit]
      return createPath(tree[prefix], key.slice(prefix.length))
    }
    return tree[key]
  }
  return createPath(tree[nodeKey], key.slice(nodeKey.length))
}

const commonPrefix = function (a, b, i = 0, length = Math.min(a.length, b.length), prefix = '') {
  if (i >= length) { return prefix }
  if (a[i] !== b[i]) { return prefix }
  return commonPrefix(a, b, i + 1, length, prefix + a[i])
}

const remove = function (tree, key) {
  const [node, path] = trackDown(tree, key)
  if (node === undefined) { return }
  delete node[LEAF]
  const keys = Object.keys(node)
  if (keys.length === 0) { cleanup(path) }
  if (keys.length === 1) { merge(path, keys[0], node[keys[0]]) }
}

const cleanup = function (path) {
  if (path.length === 0) { return }
  const [node, key] = last(path)
  delete node[key]
  if (Object.keys(node).length === 0) {
    cleanup(path.slice(0, -1))
  }
}

const merge = function (path, key, value) {
  if (path.length === 0) { return }
  const [node, nodeKey] = last(path)
  node[nodeKey + key] = value
  delete node[nodeKey]
}

const last = function (array) {
  return array[array.length - 1]
}

export default SearchableMap
export { SearchableMap }
