import type { RadixTree, Entry, LeafType } from './types'

/** @ignore */
const ENTRIES = 'ENTRIES'

/** @ignore */
const KEYS = 'KEYS'

/** @ignore */
const VALUES = 'VALUES'

/** @ignore */
const LEAF = '' as LeafType

interface Iterators<T> {
  ENTRIES: Entry<T>
  KEYS: string
  VALUES: T
}

type Kind<T> = keyof Iterators<T>
type Result<T, K extends keyof Iterators<T>> = Iterators<T>[K]

type IteratorPath<T> = {
  node: RadixTree<T>,
  keys: string[]
}[]

export type IterableSet<T> = {
  _tree: RadixTree<T>,
  _prefix: string
}

/**
 * @private
 */
class TreeIterator<T, K extends Kind<T>> implements Iterator<Result<T, K>> {
  set: IterableSet<T>
  _type: K
  _path: IteratorPath<T>

  constructor (set: IterableSet<T>, type: K) {
    const node = set._tree
    const keys = Array.from(node.keys())
    this.set = set
    this._type = type
    this._path = keys.length > 0 ? [{ node, keys }] : []
  }

  next (): IteratorResult<Result<T, K>> {
    const value = this.dive()
    this.backtrack()
    return value
  }

  dive (): IteratorResult<Result<T, K>> {
    while (this._path.length > 0) {
      const { node, keys } = last(this._path)!
      const key = last(keys)!

      if (key === LEAF) {
        if (node.has(LEAF)) { return { done: false, value: this.result() } }
      } else {
        // The tree might have been modified since the keys were collected, in
        // which case the edge for this key might have been split or merged
        const child = node.get(key) || findSubtree(node, key)

        if (child !== undefined && child.size > 0) {
          this._path.push({ node: child, keys: Array.from(child.keys()) })
          continue
        }
      }

      // The entry was removed since the keys were collected: skip it
      this.backtrack()
    }

    return { done: true, value: undefined }
  }

  backtrack (): void {
    if (this._path.length === 0) { return }
    const keys = last(this._path)!.keys
    keys.pop()
    if (keys.length > 0) { return }
    this._path.pop()
    this.backtrack()
  }

  key (): string {
    return this.set._prefix + this._path
      .map(({ keys }) => last(keys))
      .filter(key => key !== LEAF)
      .join('')
  }

  value (): T {
    return last(this._path)!.node.get(LEAF)!
  }

  result (): Result<T, K> {
    switch (this._type) {
      case VALUES: return this.value() as Result<T, K>
      case KEYS: return this.key() as Result<T, K>
      default: return [this.key(), this.value()] as Result<T, K>
    }
  }

  [Symbol.iterator] () {
    return this
  }
}

const last = <T>(array: T[]): T | undefined => {
  return array[array.length - 1]
}

// Finds the subtree at the given key of a node that has no edge for that key
// anymore, because the edge was split (e.g. by setting another key sharing a
// prefix with it) or merged with the one below (e.g. by deleting a key).
const findSubtree = <T>(node: RadixTree<T>, key: string): RadixTree<T> | undefined => {
  for (const k of node.keys()) {
    if (k === LEAF) { continue }

    if (key.startsWith(k)) {
      const child = node.get(k)!
      return key.length === k.length ? child : findSubtree(child, key.slice(k.length))
    }

    if (k.startsWith(key)) {
      const subtree = new Map() as RadixTree<T>
      subtree.set(k.slice(key.length), node.get(k)!)
      return subtree
    }
  }
}

export { TreeIterator, ENTRIES, KEYS, VALUES, LEAF }
