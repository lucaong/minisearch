/* eslint-env jest */

import PrefixTree from './PrefixTree.js'

describe('PrefixTree', () => {
  const strings = ['bin', 'border', 'acqua', 'aqua', 'poisson', 'parachute',
    'parapendio', 'acquamarina', 'summertime', 'summer', 'join', 'mediterraneo',
    'perciò', 'borderline', 'bo']
  const keyValues = strings.map((key, i) => [key, i])
  const object = keyValues.reduce((obj, [key, value]) => ({...obj, [key]: value}))

  describe('clear', () => {
    it('empties the tree', () => {
      const tree = PrefixTree.from(keyValues)
      tree.clear()
      expect(Array.from(tree.entries())).toEqual([])
    })
  })

  describe('delete', () => {
    it('deletes the entry at the given key', () => {
      const tree = PrefixTree.from(keyValues)
      tree.delete('border')
      expect(tree.has('border')).toBe(false)
      expect(tree.has('summer')).toBe(true)
      expect(tree.has('borderline')).toBe(true)
      expect(tree.has('bo')).toBe(true)
    })

    it('does nothing if the entry did not exist', () => {
      const tree = new PrefixTree()
      expect(() => tree.delete('something')).not.toThrow()
    })
  })

  describe('entries', () => {
    it('returns an iterator of entries', () => {
      const tree = PrefixTree.from(keyValues)
      const entries = Array.from({ [Symbol.iterator]: () => tree.entries() })
      expect(entries.sort()).toEqual(keyValues.sort())
    })

    it('returns an iterable of entries', () => {
      const tree = PrefixTree.from(keyValues)
      const entries = Array.from(tree.entries())
      expect(entries.sort()).toEqual(keyValues.sort())
    })

    it('returns empty iterator, if the tree is empty', () => {
      const tree = new PrefixTree()
      const entries = Array.from(tree.entries())
      expect(entries).toEqual([])
    })
  })

  describe('forEach', () => {
    it('iterates through each entry', () => {
      const entries = []
      const fn = (key, value) => entries.push([key, value])
      const tree = PrefixTree.from(keyValues)
      tree.forEach(fn)
      expect(entries).toEqual(Array.from(tree.entries()))
    })
  })

  describe('get', () => {
    it('gets the value at key', () => {
      const key = 'foo'
      const value = 42
      const tree = PrefixTree.fromObject({ [key]: value })
      expect(tree.get(key)).toBe(value)
    })

    it('returns undefined if the key is not present', () => {
      const tree = new PrefixTree()
      expect(tree.get('not-existent')).toBe(undefined)
    })
  })

  describe('has', () => {
    it('returns true if the given key exists in the tree', () => {
      const tree = new PrefixTree()
      tree.set('something', 42)
      expect(tree.has('something')).toBe(true)

      tree.set('something else', null)
      expect(tree.has('something else')).toBe(true)
    })

    it('returns false if the given key does not exist in the tree', () => {
      const tree = PrefixTree.fromObject({ something: 42 })
      expect(tree.has('not-existing')).toBe(false)
      expect(tree.has('some')).toBe(false)
    })
  })

  describe('keys', () => {
    it('returns an iterator of keys', () => {
      const tree = PrefixTree.from(keyValues)
      const keys = Array.from({ [Symbol.iterator]: () => tree.keys() })
      expect(keys.sort()).toEqual(strings.sort())
    })

    it('returns an iterable of keys', () => {
      const tree = PrefixTree.from(keyValues)
      const keys = Array.from(tree.keys())
      expect(keys.sort()).toEqual(strings.sort())
    })

    it('returns empty iterator, if the tree is empty', () => {
      const tree = new PrefixTree()
      const keys = Array.from(tree.keys())
      expect(keys).toEqual([])
    })
  })

  describe('set', () => {
    it('sets a value at key', () => {
      const tree = new PrefixTree()
      const key = 'foo'
      const value = 42
      tree.set(key, value)
      expect(tree.get(key)).toBe(value)
    })

    it('overrides a value at key if it already exists', () => {
      const tree = PrefixTree.fromObject({ foo: 123 })
      const key = 'foo'
      const value = 42
      tree.set(key, value)
      expect(tree.get(key)).toBe(value)
    })

    it('throws error if the given key is not a string', () => {
      const tree = new PrefixTree()
      expect(() => tree.set(123, 'foo')).toThrow('key must be a string')
    })
  })

  describe('size', () => {
    it('is a property containing the size of the tree', () => {
      const tree = PrefixTree.from(keyValues)
      expect(tree.size).toEqual(keyValues.length)
      tree.set('foo', 42)
      expect(tree.size).toEqual(keyValues.length + 1)
      tree.delete('border')
      expect(tree.size).toEqual(keyValues.length)
      tree.clear()
      expect(tree.size).toEqual(0)
    })
  })

  describe('values', () => {
    it('returns an iterator of values', () => {
      const tree = PrefixTree.fromObject(object)
      const values = Array.from({ [Symbol.iterator]: () => tree.values() })
      expect(values.sort()).toEqual(Object.values(object).sort())
    })

    it('returns an iterable of values', () => {
      const tree = PrefixTree.fromObject(object)
      const values = Array.from(tree.values())
      expect(values.sort()).toEqual(Object.values(object).sort())
    })

    it('returns empty iterator, if the tree is empty', () => {
      const tree = new PrefixTree()
      const values = Array.from(tree.values())
      expect(values).toEqual([])
    })
  })

  describe('atPrefix', () => {
    it('returns the subtree at the given prefix', () => {
      const tree = PrefixTree.from(keyValues)

      const sum = tree.atPrefix('sum')
      expect(Array.from(sum.keys()).sort()).toEqual(strings.filter(string => string.startsWith('sum')).sort())

      const summer = sum.atPrefix('summer')
      expect(Array.from(summer.keys()).sort()).toEqual(strings.filter(string => string.startsWith('summer')).sort())

      const xyz = tree.atPrefix('xyz')
      expect(Array.from(xyz.keys())).toEqual([])

      expect(() => sum.atPrefix('xyz')).toThrow()
    })

    it('correctly computes the size', () => {
      const tree = PrefixTree.from(keyValues)
      const sum = tree.atPrefix('sum')
      expect(sum.size).toEqual(strings.filter(string => string.startsWith('sum')).length)
    })
  })
})
