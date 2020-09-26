import { RadixTree, Entry } from './types'

/** @ignore */
const ENTRIES = 'ENTRIES'

/** @ignore */
const KEYS = 'KEYS'

/** @ignore */
const VALUES = 'VALUES'

/** @ignore */
const LEAF = ''

type IteratorType = 'ENTRIES' | 'KEYS' | 'VALUES'

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
class TreeIterator<T, V> implements Iterator<V> {
  set: IterableSet<T>
  _type: IteratorType
  _path: IteratorPath<T>

  constructor (set: IterableSet<T>, type: IteratorType) {
    const node = set._tree
    const keys = Object.keys(node)
    this.set = set
    this._type = type
    this._path = keys.length > 0 ? [{ node, keys }] : []
  }

  next (): IteratorResult<V> {
    const value = this.dive()
    this.backtrack()
    return value
  }

  dive (): IteratorResult<V> {
    if (this._path.length === 0) { return { done: true, value: undefined } }
    const { node, keys } = last(this._path)!
    if (last(keys) === LEAF) { return { done: false, value: this.result() as V } }
    this._path.push({ node: node[last(keys)!] as RadixTree<T>, keys: Object.keys(node[last(keys)!]) })
    return this.dive()
  }

  backtrack (): void {
    if (this._path.length === 0) { return }
    last(this._path)!.keys.pop()
    if (last(this._path)!.keys.length > 0) { return }
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
    return last(this._path)!.node[LEAF] as T
  }

  result (): unknown {
    if (this._type === VALUES) { return this.value() }
    if (this._type === KEYS) { return this.key() }
    return [this.key(), this.value()] as Entry<T>
  }

  [Symbol.iterator] () {
    return this
  }
}

const last = <T>(array: T[]): T | undefined => {
  return array[array.length - 1]
}

export { TreeIterator, ENTRIES, KEYS, VALUES, LEAF }
