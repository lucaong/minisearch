import { LEAF } from './TreeIterator.js'

export const fuzzySearch = function (node, query, maxDistance) {
  const stack = [{ distance: 0, i: 0, key: '', node }]
  const results = {}
  while (stack.length > 0) {
    const { node, distance, key, i } = stack.pop()
    Object.keys(node).forEach(k => {
      if (k === LEAF) {
        const totDistance = distance + (query.length - i)
        const [, , d] = results[key] || [null, null, Infinity]
        if (totDistance <= maxDistance && totDistance < d) {
          results[key] = [key, node[k], totDistance]
        }
      } else {
        withinDistance(query, k, maxDistance - distance, i).forEach(({ distance: d, i }) => {
          stack.push({ node: node[k], distance: distance + d, key: key + k, i })
        })
      }
    })
  }
  return Object.values(results).sort(([, , a], [, , b]) => a - b)
}

export const withinDistance = function (a, b, maxDistance, i = 0) {
  const stack = [{ distance: 0, ia: i, ib: 0 }]
  const mem = []
  const results = []
  while (stack.length > 0) {
    const { distance, ia, ib } = stack.pop()
    mem[ia] = mem[ia] || []
    if (mem[ia][ib] && mem[ia][ib] <= distance) { continue }
    mem[ia][ib] = distance
    if (ib === b.length) {
      results.push({ distance, i: ia })
      continue
    }
    if (a[ia] === b[ib]) {
      stack.push({ distance, ia: ia + 1, ib: ib + 1 })
    } else {
      if (distance >= maxDistance) { continue }
      stack.push({ distance: distance + 1, ia, ib: ib + 1 })
      if (ia < a.length) {
        stack.push({ distance: distance + 1, ia: ia + 1, ib })
        stack.push({ distance: distance + 1, ia: ia + 1, ib: ib + 1 })
      }
    }
  }
  return results
}

export default fuzzySearch
