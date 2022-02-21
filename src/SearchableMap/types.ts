export type LeafType = '' & { readonly __tag: unique symbol }

export interface RadixTree<T> extends Map<string, T | RadixTree<T>> {
  get(key: LeafType): T | undefined
  get(key: string): RadixTree<T> | undefined

  set(key: LeafType, value: T): this
  set(key: string, value: RadixTree<T>): this
}

export type Entry<T> = [string, T]

export type Path<T> = [RadixTree<T> | undefined, string][]
