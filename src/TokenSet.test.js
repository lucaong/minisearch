/* eslint-env jest */

import TokenSet from './TokenSet.js'

describe('TokenSet', () => {
  describe('toArray', () => {
    it('returns an array of tokens', () => {
      const tokens = ['bin', 'border', 'acqua', 'aqua', 'poisson', 'parachute',
        'parapendio', 'acquamarina', 'summertime', 'summer', 'join', 'mediterraneo',
        'perciò']
      const set = TokenSet.fromArray(tokens)
      expect(set.toArray().sort()).toEqual(tokens.sort())
    })

    it('returns empty array, if the set is empty', () => {
      const set = new TokenSet()
      expect(set.toArray()).toEqual([])
    })
  })

  describe('add', () => {
    it('adds element to a set', () => {
      const set = new TokenSet()
      const token = 'foo'
      expect(set.includes(token)).toBe(false)
      set.add(token)
      expect(set.includes(token)).toBe(true)
    })
  })

  describe('atPrefix', () => {
    it('returns the subtree at the given prefix', () => {
      const set = TokenSet.of('summertime', 'join', 'summer', 'summation', 'situation', 'sum')

      const sum = set.atPrefix('sum')
      expect(sum.toArray().sort()).toEqual(['sum', 'summation', 'summer', 'summertime'])

      const summer = sum.atPrefix('summer')
      expect(summer.toArray().sort()).toEqual(['summer', 'summertime'])

      const xyz = set.atPrefix('xyz')
      expect(xyz.toArray()).toEqual([])

      expect(() => sum.atPrefix('xyz')).toThrow()
    })
  })
})
