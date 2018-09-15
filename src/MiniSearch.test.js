/* eslint-env jest */

import MiniSearch from './MiniSearch.js'

describe('MiniSearch', () => {
  describe('constructor', () => {
    it('throws error if fields option is missing', () => {
      expect(() => new MiniSearch()).toThrow('Option "fields" must be provided')
    })

    it('initializes the attributes', () => {
      const ms = new MiniSearch({ fields: ['title', 'text'] })
      expect(ms.documentCount).toEqual(0)
      expect(ms.fieldIds).toEqual({ title: 0, text: 1 })
      expect(ms.documentIds).toEqual({})
    })
  })

  describe('add', () => {
    it('adds the document to the index', () => {
      const ms = new MiniSearch({ fields: ['text'] })
      ms.add({ id: 1, text: 'Nel mezzo del cammin di nostra vita' })
      expect(ms.documentCount).toEqual(1)
    })
  })

  describe('search', () => {
    const documents = [
      { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita' },
      { id: 2, title: 'I Promessi Sposi', text: 'Quel ramo del lago di Como' },
      { id: 3, title: 'Vita Nova', text: 'In quella parte del libro della mia memoria' }
    ]
    const ms = new MiniSearch({ fields: ['title', 'text'] })
    documents.forEach(document => ms.add(document))

    it('returns scored results', () => {
      const results = ms.search('vita')
      expect(results.length).toBeGreaterThan(0)
      expect(results.map(({ id }) => id).sort()).toEqual([1, 3])
      expect(results[0].score).toEqual(results[1].score)
    })

    it('boosts fields', () => {
      const results = ms.search('vita', { boost: { title: 2 } })
      expect(results.map(({ id }) => id)).toEqual([3, 1])
      expect(results[0].score).toBeGreaterThan(results[1].score)
    })

    it('searches in the given fields', () => {
      const results = ms.search('vita', { fields: ['title'] })
      expect(results).toHaveLength(1)
      expect(results[0].id).toEqual(3)
    })
  })
})
