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

    it('throws error if the document does not have the ID field', () => {
      const ms = new MiniSearch({ idField: 'foo', fields: ['title', 'text'] })
      expect(() => {
        ms.add({ text: 'I do not have an ID' })
      }).toThrowError('Document does not have ID field "foo"')
    })
  })

  describe('remove', () => {
    const documents = [
      { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita ... cammin' },
      { id: 2, title: 'I Promessi Sposi', text: 'Quel ramo del lago di Como' },
      { id: 3, title: 'Vita Nova', text: 'In quella parte del libro della mia memoria ... cammin' }
    ]

    let ms
    beforeEach(() => {
      ms = new MiniSearch({ fields: ['title', 'text'] })
      ms.addAll(documents)
    })

    it('removes the document from the index', () => {
      expect(ms.documentCount).toEqual(3)
      ms.remove(documents[0])
      expect(ms.documentCount).toEqual(2)
      expect(ms.search('commedia').length).toEqual(0)
      expect(ms.search('vita').map(({ id }) => id)).toEqual([3])
    })

    it('cleans up the index', () => {
      ms.remove(documents[0])
      expect(ms._index.has('commedia')).toEqual(false)
      expect(Object.keys(ms._index.get('vita'))).toEqual([ms._fieldIds.title.toString()])
    })

    it('throws error if the document does not have the ID field', () => {
      const ms = new MiniSearch({ idField: 'foo', fields: ['title', 'text'] })
      expect(() => {
        ms.remove({ text: 'I do not have an ID' })
      }).toThrowError('Document does not have ID field "foo"')
    })

    describe('when the document was not in the index', () => {
      it('throws an error', () => {
        expect(() => ms.remove({ id: 99 }))
          .toThrow('Cannot remove document with ID 99: it is not in the index')
      })
    })

    describe('when the document has changed', () => {
      let _warn
      beforeEach(() => {
        _warn = console.warn
        console.warn = jest.fn()
      })
      afterEach(() => {
        console.warn = _warn
      })

      it('warns of possible index corruption', () => {
        expect(() => ms.remove({ id: 1, title: 'Divina Commedia cammin', text: 'something has changed' }))
          .not.toThrow()
        expect(console.warn).toHaveBeenCalledTimes(4)
        ;[
          ['cammin', 'title'],
          ['something', 'text'],
          ['has', 'text'],
          ['changed', 'text']
        ].forEach(([term, field], i) => {
          expect(console.warn).toHaveBeenNthCalledWith(i + 1, `MiniSearch: document with ID 1 has changed before removal: term "${term}" was not present in field "${field}". Removing a document after it has changed can corrupt the index!`)
        })
      })
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

    it('returns empty results for terms that are not in the index', () => {
      let results
      expect(() => {
        results = ms.search('sottomarino aeroplano')
      }).not.toThrowError()
      expect(results.length).toEqual(0)
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
      const results = ms.search('cammin como sottomarino')
      expect(results.length).toEqual(2)
      expect(results.map(({ id }) => id)).toEqual([1, 2])
    })

    it('combines results with AND if combineWith is AND', () => {
      const results = ms.search('vita cammin', { combineWith: 'AND' })
      expect(results.length).toEqual(1)
      expect(results.map(({ id }) => id)).toEqual([1])
      expect(ms.search('vita sottomarino', { combineWith: 'AND' }).length).toEqual(0)
    })

    it('executes fuzzy search', () => {
      const results = ms.search('camin memory', { fuzzy: 2 })
      expect(results.length).toEqual(2)
      expect(results.map(({ id }) => id)).toEqual([1, 3])
    })

    it('executes prefix search', () => {
      const results = ms.search('que', { prefix: true })
      expect(results.length).toEqual(2)
      expect(results.map(({ id }) => id)).toEqual([2, 3])
    })

    it('combines prefix search and fuzzy search', () => {
      const results = ms.search('cammino quel', { fuzzy: 0.25, prefix: true })
      expect(results.length).toEqual(3)
      expect(results.map(({ id }) => id)).toEqual([2, 1, 3])
    })

    it('accepts a function to compute fuzzy and prefix options from term', () => {
      const fuzzy = jest.fn(term => term.length > 4 ? 2 : false)
      const prefix = jest.fn(term => term.length > 4)
      const results = ms.search('quel comedia', { fuzzy, prefix })
      expect(fuzzy).toHaveBeenNthCalledWith(1, 'quel', 0, ['quel', 'comedia'])
      expect(fuzzy).toHaveBeenNthCalledWith(2, 'comedia', 1, ['quel', 'comedia'])
      expect(prefix).toHaveBeenNthCalledWith(1, 'quel', 0, ['quel', 'comedia'])
      expect(prefix).toHaveBeenNthCalledWith(2, 'comedia', 1, ['quel', 'comedia'])
      expect(results.length).toEqual(2)
      expect(results.map(({ id }) => id)).toEqual([2, 1])
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
        const results = ms.search('vi nuova', { fuzzy: 0.2, prefix: true })
        expect(results.map(({ match }) => match)).toEqual([
          { vita: ['title', 'text'], nova: ['title'] },
          { vita: ['text'] }
        ])
      })
    })
  })

  describe('autoSuggest', () => {
    const documents = [
      { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita' },
      { id: 2, title: 'I Promessi Sposi', text: 'Quel ramo del lago di Como' },
      { id: 3, title: 'Vita Nova', text: 'In quella parte del libro della mia memoria' }
    ]
    const ms = new MiniSearch({ fields: ['title', 'text'] })
    ms.addAll(documents)

    it('returns scored suggestions', () => {
      const results = ms.autoSuggest('com')
      expect(results.length).toBeGreaterThan(0)
      expect(results.map(({ suggestion }) => suggestion)).toEqual(['como', 'commedia'])
      expect(results[0].score).toBeGreaterThan(results[1].score)
    })

    it('returns scored suggestions for multi-word queries', () => {
      const results = ms.autoSuggest('vi no')
      expect(results.length).toBeGreaterThan(0)
      expect(results.map(({ suggestion }) => suggestion)).toEqual(['nova vita', 'nostra vita'])
      expect(results[0].score).toBeGreaterThan(results[1].score)
    })

    it('returns empty suggestions for terms that are not in the index', () => {
      let results
      expect(() => {
        results = ms.autoSuggest('sottomarino aeroplano')
      }).not.toThrowError()
      expect(results.length).toEqual(0)
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
