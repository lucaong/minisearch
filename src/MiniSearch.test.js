/* eslint-env jest */

import MiniSearch from './MiniSearch.js'

describe('MiniSearch', () => {
  describe('constructor', () => {
    it('throws error if fields option is missing', () => {
      expect(() => new MiniSearch()).toThrow('Option "fields" must be provided')
    })

    it('initializes the attributes', () => {
      const options = { fields: ['title', 'text'] }
      const ms = new MiniSearch(options)
      expect(ms._documentCount).toEqual(0)
      expect(ms._fieldIds).toEqual({ title: 0, text: 1 })
      expect(ms._documentIds).toEqual({})
      expect(ms._options).toMatchObject(options)
    })
  })

  describe('add', () => {
    it('adds the document to the index', () => {
      const ms = new MiniSearch({ fields: ['text'] })
      ms.add({ id: 1, text: 'Nel mezzo del cammin di nostra vita' })
      expect(ms.documentCount).toEqual(1)
    })

    it('does not throw error if a field is missing', () => {
      const ms = new MiniSearch({ fields: ['title', 'text'] })
      ms.add({ id: 1, text: 'Nel mezzo del cammin di nostra vita' })
      expect(ms.documentCount).toEqual(1)
    })
  })

  describe('addAll', () => {
    it('adds all the documents to the index', () => {
      const ms = new MiniSearch({ fields: ['text'] })
      const documents = [
        { id: 1, text: 'Nel mezzo del cammin di nostra vita' },
        { id: 2, text: 'Mi ritrovai per una selva oscura' }
      ]
      ms.addAll(documents)
      expect(ms.documentCount).toEqual(documents.length)
    })
  })

  describe('search', () => {
    const documents = [
      { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita' },
      { id: 2, title: 'I Promessi Sposi', text: 'Quel ramo del lago di Como' },
      { id: 3, title: 'Vita Nova', text: 'In quella parte del libro della mia memoria' }
    ]
    const ms = new MiniSearch({ fields: ['title', 'text'] })
    ms.addAll(documents)

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

    it('combines results with OR by default', () => {
      const results = ms.search('cammin como')
      expect(results.length).toEqual(2)
      expect(results.map(({ id }) => id)).toEqual([1, 2])
    })

    it('combines results with AND if combineWith is AND', () => {
      const results = ms.search('vita cammin', { combineWith: 'AND' })
      expect(results.length).toEqual(1)
      expect(results.map(({ id }) => id)).toEqual([1])
    })

    it('executes fuzzy search', () => {
      const results = ms.search('camin memory', { termToQuery: term => ({ term, fuzzy: 2 }) })
      expect(results.length).toEqual(2)
      expect(results.map(({ id }) => id)).toEqual([1, 3])
    })

    it('executes prefix search', () => {
      const results = ms.search('que', { termToQuery: term => ({ term, prefix: true }) })
      expect(results.length).toEqual(2)
      expect(results.map(({ id }) => id)).toEqual([2, 3])
    })

    it('combines prefix search and fuzzy search', () => {
      const results = ms.search('cammino quel', { termToQuery: term => ({ term, fuzzy: 0.25, prefix: true }) })
      expect(results.length).toEqual(3)
      expect(results.map(({ id }) => id)).toEqual([2, 1, 3])
    })

    describe('match data', () => {
      const documents = [
        { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita' },
        { id: 2, title: 'I Promessi Sposi', text: 'Quel ramo del lago di Como' },
        { id: 3, title: 'Vita Nova', text: 'In quella parte del libro della mia memoria ... vita' }
      ]
      const ms = new MiniSearch({ fields: ['title', 'text'] })
      ms.addAll(documents)

      it('reports information about matched terms and fields', () => {
        const results = ms.search('vita nova')
        expect(results.length).toBeGreaterThan(0)
        expect(results.map(({ match }) => match)).toEqual([
          { vita: ['title', 'text'], nova: ['title'] },
          { vita: ['text'] }
        ])
      })

      it('reports correct info when combining terms with AND', () => {
        const results = ms.search('vita nova', { combineWith: 'AND' })
        expect(results.map(({ match }) => match)).toEqual([
          { vita: ['title', 'text'], nova: ['title'] }
        ])
      })

      it('reports correct info for fuzzy and prefix queries', () => {
        const results = ms.search('vi nuova', { termToQuery: term => ({ term, fuzzy: 0.2, prefix: true }) })
        expect(results.map(({ match }) => match)).toEqual([
          { vita: ['title', 'text'], nova: ['title'] },
          { vita: ['text'] }
        ])
      })
    })
  })

  describe('loadJSON', () => {
    it('loads a JSON-serialized search index', () => {
      const documents = [
        { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita' },
        { id: 2, title: 'I Promessi Sposi', text: 'Quel ramo del lago di Como' },
        { id: 3, title: 'Vita Nova', text: 'In quella parte del libro della mia memoria' }
      ]
      const options = { fields: ['title', 'text'] }
      const ms = new MiniSearch(options)
      ms.addAll(documents)
      const json = JSON.stringify(ms)
      const deserialized = MiniSearch.loadJSON(json, options)
      expect(ms.search('vita')).toEqual(deserialized.search('vita'))
    })
  })
})
