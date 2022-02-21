export type LeafType = '' & { readonly __tag: unique symbol }

export interface RadixTree<T> extends Map<string, T | RadixTree<T>> {
  // Distinguish between an empty string indicating a leaf node and a non-empty
  // string indicating a subtree. Overriding these types avoids a lot of type
  // assertions elsewhere in the code.
  get(key: LeafType): T | undefined
  get(key: string): RadixTree<T> | undefined

  set(key: LeafType, value: T): this
  set(key: string, value: RadixTree<T>): this
}

export type Entry<T> = [string, T]

export type Path<T> = [RadixTree<T> | undefined, string][]
