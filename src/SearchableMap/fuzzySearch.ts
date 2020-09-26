import { LEAF } from './TreeIterator'
import { RadixTree } from './types'

const NONE = 0
const CHANGE = 1
const ADD = 2
const DELETE = 3

type Edit = 0 | 1 | 2 | 3 | undefined

type StackElement<T> = {
  distance: number,
  i: number,
  key: string,
  node: RadixTree<T>,
  edit?: Edit
}

type InnerStackElement = {
  distance: number,
  ia: number,
  ib: number,
  edit: Edit
}

export type FuzzyResult<T> = [T, number]

export type FuzzyResults<T> = { [key: string]: FuzzyResult<T> }

/**
 * @ignore
 */
export const fuzzySearch = <T = any>(node: RadixTree<T>, query: string, maxDistance: number): FuzzyResults<T> => {
  const stack: StackElement<T>[] = [{ distance: 0, i: 0, key: '', node }]
  const results: FuzzyResults<T> = {}
  const innerStack: InnerStackElement[] = []

  while (stack.length > 0) {
    const { node, distance, key, i, edit } = stack.pop()!

    Object.keys(node).forEach((k) => {
      if (k === LEAF) {
        const totDistance = distance + (query.length - i)
        const [, d] = results[key] || [null, Infinity]
        if (totDistance <= maxDistance && totDistance < d) {
          results[key] = [node[k] as T, totDistance]
        }
      } else {
        withinDistance(query, k, maxDistance - distance, i, edit, innerStack).forEach(({ distance: d, i, edit }) => {
          stack.push({ node: node[k] as RadixTree<T>, distance: distance + d, key: key + k, i, edit })
        })
      }
    })
  }
  return results
}

/**
 * @ignore
 */
export const withinDistance = (a: string, b: string, maxDistance: number, i: number, edit: Edit, stack: InnerStackElement[]) => {
  stack.push({ distance: 0, ia: i, ib: 0, edit })
  const results: { distance: number, i: number, edit: Edit }[] = []

  while (stack.length > 0) {
    const { distance, ia, ib, edit } = stack.pop()!

    if (ib === b.length) {
      results.push({ distance, i: ia, edit })
      continue
    }

    if (a[ia] === b[ib]) {
      stack.push({ distance, ia: ia + 1, ib: ib + 1, edit: NONE })
    } else {
      if (distance >= maxDistance) { continue }

      if (edit !== ADD) {
        stack.push({ distance: distance + 1, ia, ib: ib + 1, edit: DELETE })
      }

      if (ia < a.length) {
        if (edit !== DELETE) {
          stack.push({ distance: distance + 1, ia: ia + 1, ib, edit: ADD })
        }

        if (edit !== DELETE && edit !== ADD) {
          stack.push({ distance: distance + 1, ia: ia + 1, ib: ib + 1, edit: CHANGE })
        }
      }
    }
  }

  return results
}

export default fuzzySearch
