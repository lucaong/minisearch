export type RadixTree<T> = Map<string, T | RadixTree<T>>;

export type Entry<T> = [string, T]

export type Path<T> = [RadixTree<T> | undefined, string][]
