/* eslint-env jest */

import RadixTree from './RadixTree.js'
import * as fc from 'fast-check'

describe('RadixTree', () => {
  const strings = ['bin', 'border', 'acqua', 'aqua', 'poisson', 'parachute',
    'parapendio', 'acquamarina', 'summertime', 'summer', 'join', 'mediterraneo',
    'perciò', 'borderline', 'bo']
  const keyValues = strings.map((key, i) => [key, i])
  const object = keyValues.reduce((obj, [key, value]) => ({...obj, [key]: value}))

  const editDistance = function (a, b, mem = [[0]]) {
    mem[a.length] = mem[a.length] || [a.length]
    if (mem[a.length][b.length] !== undefined) { return mem[a.length][b.length] }
    const d = (a[a.length - 1] === b[b.length - 1]) ? 0 : 1
    const distance = (a.length === 1 && b.length === 1) ? d : Math.min(
      ((a.length > 0) ? editDistance(a.slice(0, -1), b, mem) + 1 : Infinity),
      ((b.length > 0) ? editDistance(a, b.slice(0, -1), mem) + 1 : Infinity),
      ((a.length > 0 && b.length > 0) ? editDistance(a.slice(0, -1), b.slice(0, -1), mem) + d : Infinity)
    )
    mem[a.length][b.length] = distance
    return distance
  }

  describe('clear', () => {
    it('empties the tree', () => {
      const tree = RadixTree.from(keyValues)
      tree.clear()
      expect(Array.from(tree.entries())).toEqual([])
    })
  })

  describe('delete', () => {
    it('deletes the entry at the given key', () => {
      const tree = RadixTree.from(keyValues)
      tree.delete('border')
      expect(tree.has('border')).toBe(false)
      expect(tree.has('summer')).toBe(true)
      expect(tree.has('borderline')).toBe(true)
      expect(tree.has('bo')).toBe(true)
    })

    it('changes the size of the tree', () => {
      const tree = RadixTree.from(keyValues)
      const sizeBefore = tree.size
      tree.delete('summertime')
      expect(tree.size).toEqual(sizeBefore - 1)
    })

    it('does nothing if the entry did not exist', () => {
      const tree = new RadixTree()
      expect(() => tree.delete('something')).not.toThrow()
    })
  })

  describe('entries', () => {
    it('returns an iterator of entries', () => {
      const tree = RadixTree.from(keyValues)
      const entries = Array.from({ [Symbol.iterator]: () => tree.entries() })
      expect(entries.sort()).toEqual(keyValues.sort())
    })

    it('returns an iterable of entries', () => {
      const tree = RadixTree.from(keyValues)
      const entries = Array.from(tree.entries())
      expect(entries.sort()).toEqual(keyValues.sort())
    })

    it('returns empty iterator, if the tree is empty', () => {
      const tree = new RadixTree()
      const entries = Array.from(tree.entries())
      expect(entries).toEqual([])
    })
  })

  describe('forEach', () => {
    it('iterates through each entry', () => {
      const entries = []
      const fn = (key, value) => entries.push([key, value])
      const tree = RadixTree.from(keyValues)
      tree.forEach(fn)
      expect(entries).toEqual(Array.from(tree.entries()))
    })
  })

  describe('get', () => {
    it('gets the value at key', () => {
      const key = 'foo'
      const value = 42
      const tree = RadixTree.fromObject({ [key]: value })
      expect(tree.get(key)).toBe(value)
    })

    it('returns undefined if the key is not present', () => {
      const tree = new RadixTree()
      expect(tree.get('not-existent')).toBe(undefined)
    })
  })

  describe('has', () => {
    it('returns true if the given key exists in the tree', () => {
      const tree = new RadixTree()
      tree.set('something', 42)
      expect(tree.has('something')).toBe(true)

      tree.set('something else', null)
      expect(tree.has('something else')).toBe(true)
    })

    it('returns false if the given key does not exist in the tree', () => {
      const tree = RadixTree.fromObject({ something: 42 })
      expect(tree.has('not-existing')).toBe(false)
      expect(tree.has('some')).toBe(false)
    })
  })

  describe('keys', () => {
    it('returns an iterator of keys', () => {
      const tree = RadixTree.from(keyValues)
      const keys = Array.from({ [Symbol.iterator]: () => tree.keys() })
      expect(keys.sort()).toEqual(strings.sort())
    })

    it('returns an iterable of keys', () => {
      const tree = RadixTree.from(keyValues)
      const keys = Array.from(tree.keys())
      expect(keys.sort()).toEqual(strings.sort())
    })

    it('returns empty iterator, if the tree is empty', () => {
      const tree = new RadixTree()
      const keys = Array.from(tree.keys())
      expect(keys).toEqual([])
    })
  })

  describe('set', () => {
    it('sets a value at key', () => {
      const tree = new RadixTree()
      const key = 'foo'
      const value = 42
      tree.set(key, value)
      expect(tree.get(key)).toBe(value)
    })

    it('overrides a value at key if it already exists', () => {
      const tree = RadixTree.fromObject({ foo: 123 })
      const key = 'foo'
      const value = 42
      tree.set(key, value)
      expect(tree.get(key)).toBe(value)
    })

    it('throws error if the given key is not a string', () => {
      const tree = new RadixTree()
      expect(() => tree.set(123, 'foo')).toThrow('key must be a string')
    })
  })

  describe('size', () => {
    it('is a property containing the size of the tree', () => {
      const tree = RadixTree.from(keyValues)
      expect(tree.size).toEqual(keyValues.length)
      tree.set('foo', 42)
      expect(tree.size).toEqual(keyValues.length + 1)
      tree.delete('border')
      expect(tree.size).toEqual(keyValues.length)
      tree.clear()
      expect(tree.size).toEqual(0)
    })
  })

  describe('update', () => {
    it('sets a value at key applying a function to the previous value', () => {
      const tree = new RadixTree()
      const key = 'foo'
      const fn = jest.fn(x => (x || 0) + 1)
      tree.update(key, fn)
      expect(fn).toHaveBeenCalledWith(undefined)
      expect(tree.get(key)).toBe(1)
      tree.update(key, fn)
      expect(fn).toHaveBeenCalledWith(1)
      expect(tree.get(key)).toBe(2)
    })

    it('throws error if the given key is not a string', () => {
      const tree = new RadixTree()
      expect(() => tree.update(123, () => {})).toThrow('key must be a string')
    })
  })

  describe('values', () => {
    it('returns an iterator of values', () => {
      const tree = RadixTree.fromObject(object)
      const values = Array.from({ [Symbol.iterator]: () => tree.values() })
      expect(values.sort()).toEqual(Object.values(object).sort())
    })

    it('returns an iterable of values', () => {
      const tree = RadixTree.fromObject(object)
      const values = Array.from(tree.values())
      expect(values.sort()).toEqual(Object.values(object).sort())
    })

    it('returns empty iterator, if the tree is empty', () => {
      const tree = new RadixTree()
      const values = Array.from(tree.values())
      expect(values).toEqual([])
    })
  })

  describe('atPrefix', () => {
    it('returns the subtree at the given prefix', () => {
      const tree = RadixTree.from(keyValues)

      const sum = tree.atPrefix('sum')
      expect(Array.from(sum.keys()).sort()).toEqual(strings.filter(string => string.startsWith('sum')).sort())

      const summer = sum.atPrefix('summer')
      expect(Array.from(summer.keys()).sort()).toEqual(strings.filter(string => string.startsWith('summer')).sort())

      const xyz = tree.atPrefix('xyz')
      expect(Array.from(xyz.keys())).toEqual([])

      expect(() => sum.atPrefix('xyz')).toThrow()
    })

    it('correctly computes the size', () => {
      const tree = RadixTree.from(keyValues)
      const sum = tree.atPrefix('sum')
      expect(sum.size).toEqual(strings.filter(string => string.startsWith('sum')).length)
    })
  })

  describe('fuzzyGet', () => {
    const terms = ['summer', 'acqua', 'aqua', 'acquire', 'poisson', 'qua']
    const keyValues = terms.map((key, i) => [key, i])
    const tree = RadixTree.from(keyValues)

    it('returns all entries having the given maximum edit distance from the given key', () => {
      [1, 2, 3].forEach(distance => {
        const results = tree.fuzzyGet('acqua', distance)
        expect(results.map(([key, value, dist]) => [key, dist]).sort())
          .toEqual(terms.map(term => [term, editDistance('acqua', term)]).filter(([, d]) => d <= distance).sort())
        expect(results.every(([key, value]) => tree.get(key) === value)).toBe(true)
      })
    })

    it('returns results sorted by ascending distance', () => {
      const results = tree.fuzzyGet('acqua', 3)
      expect(results).toEqual([['acqua', 1, 0], ['aqua', 2, 1], ['qua', 5, 2], ['acquire', 3, 3]])
    })
  })

  describe('with generated test data', () => {
    it('adds and removes entries', () => {
      const arrayOfStrings = fc.array(fc.oneof(fc.unicodeString(), fc.string()), 70)
      const string = fc.oneof(fc.unicodeString(0, 4), fc.string(0, 4))

      fc.assert(fc.property(arrayOfStrings, string, (terms, prefix) => {
        const tree = new RadixTree()
        const map = new Map()
        const uniqueTerms = [...new Set(terms)]

        terms.forEach((term, i) => {
          tree.set(term, i)
          map.set(term, i)
          expect(tree.has(term)).toBe(true)
          expect(tree.get(term)).toEqual(i)
        })

        expect(tree.size).toEqual(map.size)
        expect(Array.from(tree.entries()).sort()).toEqual(Array.from(map.entries()).sort())

        expect(Array.from(tree.atPrefix(prefix).keys()).sort())
          .toEqual(Array.from(new Set(terms)).filter(t => t.startsWith(prefix)).sort())

        const fuzzy = tree.fuzzyGet(terms[0], 2)
        expect(fuzzy.map(([key, value, dist]) => [key, dist]).sort())
          .toEqual(uniqueTerms.map(term => [term, editDistance(terms[0], term)]).filter(([, d]) => d <= 2).sort())

        terms.forEach(term => {
          tree.delete(term)
          expect(tree.has(term)).toBe(false)
          expect(tree.get(term)).toEqual(undefined)
        })

        expect(tree.size).toEqual(0)
      }))
    })
  })
})
