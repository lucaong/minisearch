/* eslint-disable no-labels */
import { LEAF } from './TreeIterator'
import { RadixTree } from './types'

export type FuzzyResult<T> = [T, number]

export type FuzzyResults<T> = { [key: string]: FuzzyResult<T> }

/**
 * @ignore
 */
export const fuzzySearch = <T = any>(node: RadixTree<T>, query: string, maxDistance: number): FuzzyResults<T> => {
  if (query === undefined) return {}

  const results: FuzzyResults<T> = {}

  // Number of columns in the Levenshtein matrix.
  const n = query.length + 1

  // Matching terms can never be longer than N + maxDistance.
  const maxLength = n + maxDistance

  // Fill first matrix row with consecutive numbers 0 1 2 3 ... (n - 1)
  const matrix = new Uint8Array(maxLength * maxLength)
  for (let i = 0; i < n; i++) matrix[i] = i

  recurse(
    node,
    query,
    maxDistance,
    results,
    matrix,
    n,
    n,
    ''
  )

  return results
}

const recurse = <T = any>(node: RadixTree<T>, query: string, maxDistance: number, results: FuzzyResults<T>, matrix: Uint8Array, offset: number, n: number, prefix: string): void => {
  key: for (const key of node.keys()) {
    if (key === LEAF) {
      const distance = matrix[offset - 1]
      if (distance <= maxDistance) {
        results[prefix] = [node.get(key) as T, distance]
      }
    } else {
      for (let i = 0; i < key.length; i++) {
        const char = key[i]
        const thisRowOffset = offset + n * i
        const prevRowOffset = thisRowOffset - n

        let minDistance = matrix[thisRowOffset] = matrix[prevRowOffset] + 1

        for (let j = 0; j < n - 1; j++) {
          const different = char !== query[j]

          // It might make sense to only read the matrix positions used for
          // deletion/insertion if the characters are different. But we want to
          // avoid conditional reads for performance reasons.
          const rpl = matrix[prevRowOffset + j] + +different
          const del = matrix[prevRowOffset + j + 1] + 1
          const ins = matrix[thisRowOffset + j] + 1

          const dist = matrix[thisRowOffset + j + 1] = Math.min(rpl, del, ins)

          if (dist < minDistance) minDistance = dist
        }

        // Because distance will never decrease, we can stop here.
        if (minDistance > maxDistance) {
          continue key
        }
      }

      recurse(
        node.get(key) as RadixTree<T>,
        query,
        maxDistance,
        results,
        matrix,
        offset + n * key.length,
        n,
        prefix + key
      )
    }
  }
}

export default fuzzySearch
