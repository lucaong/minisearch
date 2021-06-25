import { TreeIterator, ENTRIES, KEYS, VALUES, LEAF } from './TreeIterator'
import fuzzySearch, { FuzzyResults } from './fuzzySearch'
import { RadixTree, Entry, Path } from './types'

/**
 * A class implementing the same interface as a standard JavaScript
 * [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
 * with string keys, but adding support for efficiently searching entries with
 * prefix or fuzzy search. This class is used internally by [[MiniSearch]] as
 * the inverted index data structure. The implementation is a radix tree
 * (compressed prefix tree).
 *
 * Since this class can be of general utility beyond _MiniSearch_, it is
 * exported by the `minisearch` package and can be imported (or required) as
 * `minisearch/SearchableMap`.
 *
 * @typeParam T  The type of the values stored in the map.
 */
export default class SearchableMap<T = any> {
  /**
   * @internal
   */
  _tree: RadixTree<T>

  /**
   * @internal
   */
  _prefix: string

  private _size?: number

  /**
   * The constructor is normally called without arguments, creating an empty
   * map. In order to create a [[SearchableMap]] from an iterable or from an
   * object, check [[SearchableMap.from]] and [[SearchableMap.fromObject]].
   *
   * The constructor arguments are for internal use, when creating derived
   * mutable views of a map at a prefix.
   */
  constructor (tree = {}, prefix = '') {
    this._tree = tree
    this._prefix = prefix
  }

  /**
   * Creates and returns a mutable view of this [[SearchableMap]], containing only
   * entries that share the given prefix.
   *
   * ### Usage:
   *
   * ```javascript
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
   * univer.get("unique") // => undefined
   * univer.get("universe") // => 2
   * univer.get("university") // => 3
   * ```
   *
   * @param prefix  The prefix
   * @return A [[SearchableMap]] representing a mutable view of the original Map at the given prefix
   */
  atPrefix (prefix: string): SearchableMap<T> {
    if (!prefix.startsWith(this._prefix)) { throw new Error('Mismatched prefix') }

    const [node, path] = trackDown(this._tree, prefix.slice(this._prefix.length))

    if (node === undefined) {
      const [parentNode, key] = last(path)
      const nodeKey = Object.keys(parentNode!).find(k => k !== LEAF && k.startsWith(key))

      if (nodeKey !== undefined) {
        return new SearchableMap({ [nodeKey.slice(key.length)]: parentNode![nodeKey] }, prefix)
      }
    }

    return new SearchableMap<T>(node || {}, prefix)
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/clear
   */
  clear (): void {
    delete this._size
    this._tree = {}
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/delete
   * @param key  Key to delete
   */
  delete (key: string): void {
    delete this._size
    return remove(this._tree, key)
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/entries
   * @return An iterator iterating through `[key, value]` entries.
   */
  entries () {
    return new TreeIterator<T, Entry<T>>(this, ENTRIES)
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
   * @param fn  Iteration function
   */
  forEach (fn: (key: string, value: T, map: SearchableMap) => void): void {
    for (const [key, value] of this) {
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
   * ### Usage:
   *
   * ```javascript
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
   * ```
   *
   * @param key  The search key
   * @param maxEditDistance  The maximum edit distance (Levenshtein)
   * @return A key-value object of the matching keys to their value and edit distance
   */
  fuzzyGet (key: string, maxEditDistance: number): FuzzyResults<T> {
    return fuzzySearch<T>(this._tree, key, maxEditDistance)
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/get
   * @param key  Key to get
   * @return Value associated to the key, or `undefined` if the key is not
   * found.
   */
  get (key: string): T | undefined {
    const node = lookup<T>(this._tree, key)
    return node !== undefined ? (node[LEAF] as T) : undefined
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/has
   * @param key  Key
   * @return True if the key is in the map, false otherwise
   */
  has (key: string): boolean {
    const node = lookup(this._tree, key)
    return node !== undefined && node.hasOwnProperty(LEAF)
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/keys
   * @return An `Iterable` iterating through keys
   */
  keys () {
    return new TreeIterator<T, string>(this, KEYS)
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/set
   * @param key  Key to set
   * @param value  Value to associate to the key
   * @return The [[SearchableMap]] itself, to allow chaining
   */
  set (key: string, value: T): SearchableMap<T> {
    if (typeof key !== 'string') { throw new Error('key must be a string') }
    delete this._size
    const node = createPath(this._tree, key)
    node[LEAF] = value
    return this
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/size
   */
  get size (): number {
    if (this._size) { return this._size }
    /** @ignore */
    this._size = 0
    this.forEach(() => { this._size! += 1 })
    return this._size
  }

  /**
   * Updates the value at the given key using the provided function. The function
   * is called with the current value at the key, and its return value is used as
   * the new value to be set.
   *
   * ### Example:
   *
   * ```javascript
   * // Increment the current value by one
   * searchableMap.update('somekey', (currentValue) => currentValue == null ? 0 : currentValue + 1)
   * ```
   *
   * @param key  The key to update
   * @param fn  The function used to compute the new value from the current one
   * @return The [[SearchableMap]] itself, to allow chaining
   */
  update (key: string, fn: (value: T) => T): SearchableMap<T> {
    if (typeof key !== 'string') { throw new Error('key must be a string') }
    delete this._size
    const node = createPath(this._tree, key)
    node[LEAF] = fn(node[LEAF] as T)
    return this
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/values
   * @return An `Iterable` iterating through values.
   */
  values () {
    return new TreeIterator<T, T>(this, VALUES)
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
   */
  [Symbol.iterator] () {
    return this.entries()
  }

  /**
   * Creates a [[SearchableMap]] from an `Iterable` of entries
   *
   * @param entries  Entries to be inserted in the [[SearchableMap]]
   * @return A new [[SearchableMap]] with the given entries
   */
  static from<T = any> (entries: Iterable<Entry<T>> | Entry<T>[]) {
    const tree = new SearchableMap()
    for (const [key, value] of entries) {
      tree.set(key, value)
    }
    return tree
  }

  /**
   * Creates a [[SearchableMap]] from the iterable properties of a JavaScript object
   *
   * @param object  Object of entries for the [[SearchableMap]]
   * @return A new [[SearchableMap]] with the given entries
   */
  static fromObject<T = any> (object: { [key: string]: T }) {
    return SearchableMap.from<T>(Object.entries(object))
  }
}

const trackDown = <T = any>(tree: RadixTree<T> | undefined, key: string, path: Path<T> = []): [RadixTree<T> | undefined, Path<T>] => {
  if (key.length === 0 || tree == null) { return [tree, path] }

  const nodeKey = Object.keys(tree).find(k => k !== LEAF && key.startsWith(k))

  if (nodeKey === undefined) {
    path.push([tree, key]) // performance: update in place
    return trackDown(undefined, '', path)
  }

  path.push([tree, nodeKey]) // performance: update in place
  return trackDown(tree[nodeKey] as RadixTree<T>, key.slice(nodeKey.length), path)
}

const lookup = <T = any>(tree: RadixTree<T>, key: string): RadixTree<T> | undefined => {
  if (key.length === 0 || tree == null) { return tree }
  const nodeKey = Object.keys(tree).find(k => k !== LEAF && key.startsWith(k))
  if (nodeKey === undefined) { return undefined }
  return lookup(tree[nodeKey] as RadixTree<T>, key.slice(nodeKey.length))
}

const createPath = <T = any>(tree: RadixTree<T>, key: string): RadixTree<T> => {
  if (key.length === 0 || tree == null) { return tree }

  const nodeKey = Object.keys(tree).find(k => k !== LEAF && key.startsWith(k))

  if (nodeKey === undefined) {
    const toSplit = Object.keys(tree).find(k => k !== LEAF && k.startsWith(key[0]))

    if (toSplit === undefined) {
      tree[key] = {}
    } else {
      const prefix = commonPrefix(key, toSplit)
      tree[prefix] = { [toSplit.slice(prefix.length)]: tree[toSplit] }
      delete tree[toSplit]
      return createPath(tree[prefix] as RadixTree<T>, key.slice(prefix.length))
    }

    return tree[key] as RadixTree<T>
  }

  return createPath(tree[nodeKey] as RadixTree<T>, key.slice(nodeKey.length))
}

const commonPrefix = (a: string, b: string, i: number = 0, length: number = Math.min(a.length, b.length), prefix: string = ''): string => {
  if (i >= length) { return prefix }
  if (a[i] !== b[i]) { return prefix }
  return commonPrefix(a, b, i + 1, length, prefix + a[i])
}

const remove = <T = any>(tree: RadixTree<T>, key: string): void => {
  const [node, path] = trackDown(tree, key)
  if (node === undefined) { return }
  delete node[LEAF]
  const keys = Object.keys(node)
  if (keys.length === 0) { cleanup(path) }
  if (keys.length === 1) { merge(path, keys[0], node[keys[0]]) }
}

const cleanup = <T = any>(path: Path<T>): void => {
  if (path.length === 0) { return }

  const [node, key] = last(path)
  delete node![key]

  const keys = Object.keys(node!)
  if (keys.length === 0) { cleanup(path.slice(0, -1)) }
  if (keys.length === 1 && keys[0] !== LEAF) { merge(path.slice(0, -1), keys[0], node![keys[0]]) }
}

const merge = <T = any>(path: Path<T>, key: string, value: T): void => {
  if (path.length === 0) { return }

  const [node, nodeKey] = last(path)
  node![nodeKey + key] = value
  delete node![nodeKey]
}

const last = <T = any>(array: T[]): T => {
  return array[array.length - 1]
}
