export type RadixTree<T> = {
  [key: string]: RadixTree<T> | T
}

export type Entry<T> = [string, T]

export type Path<T> = [RadixTree<T> | undefined, string][]
