/* eslint-env jest */

import MiniSearch from './MiniSearch.js'

describe('MiniSearch', () => {
  describe('constructor', () => {
    it('throws error if fields option is missing', () => {
      expect(() => new MiniSearch()).toThrow('MiniSearch: option "fields" must be provided')
    })

    it('initializes the attributes', () => {
      const options = { fields: ['title', 'text'] }
      const ms = new MiniSearch(options)
      expect(ms._documentCount).toEqual(0)
      expect(ms._fieldIds).toEqual({ title: 0, text: 1 })
      expect(ms._documentIds).toEqual({})
      expect(ms._fieldLength).toEqual({})
      expect(ms._averageFieldLength).toEqual({})
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
      }).toThrowError('MiniSearch: document does not have ID field "foo"')
    })

    it('rejects falsy terms', () => {
      const processTerm = term => term === 'foo' ? null : term
      const ms = new MiniSearch({ fields: ['title', 'text'], processTerm })
      expect(() => {
        ms.add({ id: 123, text: 'foo bar' })
      }).not.toThrowError()
    })

    it('passes field value and name to tokenizer', () => {
      const tokenize = jest.fn(string => string.split(/\W+/))
      const ms = new MiniSearch({ fields: ['text', 'title'], tokenize })
      const document = { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita' }
      ms.add(document)
      expect(tokenize).toHaveBeenCalledWith(document.text, 'text')
      expect(tokenize).toHaveBeenCalledWith(document.title, 'title')
    })

    it('passes field value and name to term processor', () => {
      const processTerm = jest.fn(term => term.toLowerCase())
      const ms = new MiniSearch({ fields: ['text', 'title'], processTerm })
      const document = { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita' }
      ms.add(document)
      document.text.split(/\W+/).forEach(term => {
        expect(processTerm).toHaveBeenCalledWith(term, 'text')
      })
      document.title.split(/\W+/).forEach(term => {
        expect(processTerm).toHaveBeenCalledWith(term, 'title')
      })
    })
  })

  describe('remove', () => {
    const documents = [
      { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita ... cammin' },
      { id: 2, title: 'I Promessi Sposi', text: 'Quel ramo del lago di Como' },
      { id: 3, title: 'Vita Nova', text: 'In quella parte del libro della mia memoria ... cammin' }
    ]

    let ms, _warn
    beforeEach(() => {
      ms = new MiniSearch({ fields: ['title', 'text'] })
      ms.addAll(documents)
      _warn = console.warn
      console.warn = jest.fn()
    })

    afterEach(() => {
      console.warn = _warn
    })

    it('removes the document from the index', () => {
      expect(ms.documentCount).toEqual(3)
      ms.remove(documents[0])
      expect(ms.documentCount).toEqual(2)
      expect(ms.search('commedia').length).toEqual(0)
      expect(ms.search('vita').map(({ id }) => id)).toEqual([3])
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('does not remove terms from other documents', () => {
      ms.remove(documents[0])
      expect(ms.search('cammin').length).toEqual(1)
    })

    it('removes re-added document', () => {
      ms.remove(documents[0])
      ms.add(documents[0])
      ms.remove(documents[0])
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('cleans up the index', () => {
      const originalIdsLength = Object.keys(ms._documentIds).length
      ms.remove(documents[0])
      expect(ms._index.has('commedia')).toEqual(false)
      expect(Object.keys(ms._documentIds).length).toEqual(originalIdsLength - 1)
      expect(Object.keys(ms._index.get('vita'))).toEqual([ms._fieldIds.title.toString()])
    })

    it('throws error if the document does not have the ID field', () => {
      const ms = new MiniSearch({ idField: 'foo', fields: ['title', 'text'] })
      expect(() => {
        ms.remove({ text: 'I do not have an ID' })
      }).toThrowError('MiniSearch: document does not have ID field "foo"')
    })

    it('does not reassign IDs', () => {
      ms.remove(documents[0])
      ms.add(documents[0])
      expect(ms.search('commedia').map(result => result.id)).toEqual([documents[0].id])
      expect(ms.search('nova').map(result => result.id)).toEqual([documents[documents.length - 1].id])
    })

    it('rejects falsy terms', () => {
      const processTerm = term => term === 'foo' ? null : term
      const ms = new MiniSearch({ fields: ['title', 'text'], processTerm })
      const document = { id: 123, title: 'foo bar' }
      ms.add(document)
      expect(() => {
        ms.remove(document)
      }).not.toThrowError()
    })

    describe('when the document was not in the index', () => {
      it('throws an error', () => {
        expect(() => ms.remove({ id: 99 }))
          .toThrow('MiniSearch: cannot remove document with ID 99: it is not in the index')
      })
    })

    describe('when the document has changed', () => {
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

      it('does not throw error if console.warn is undefined', () => {
        console.warn = undefined
        expect(() => ms.remove({ id: 1, title: 'Divina Commedia cammin', text: 'something has changed' }))
          .not.toThrow()
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
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
    })

    it('returns empty array if there is no match', () => {
      const results = ms.search('paguro')
      expect(results).toEqual([])
    })

    it('returns empty array for empty search', () => {
      const results = ms.search('')
      expect(results).toEqual([])
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
      expect(results.map(({ id }) => id)).toEqual([2, 1])
    })

    it('combines results with AND if combineWith is AND', () => {
      const results = ms.search('vita cammin', { combineWith: 'AND' })
      expect(results.length).toEqual(1)
      expect(results.map(({ id }) => id)).toEqual([1])
      expect(ms.search('vita sottomarino', { combineWith: 'AND' }).length).toEqual(0)
      expect(ms.search('sottomarino vita', { combineWith: 'AND' }).length).toEqual(0)
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

    it('boosts documents by calling boostDocument with document ID and term', () => {
      const query = 'divina commedia'
      const boostFactor = 1.234
      const boostDocument = jest.fn((id, term) => boostFactor)
      const resultsWithoutBoost = ms.search(query)
      const results = ms.search(query, { boostDocument })
      expect(boostDocument).toHaveBeenCalledWith(1, 'divina')
      expect(boostDocument).toHaveBeenCalledWith(1, 'commedia')
      expect(results[0].score).toEqual(resultsWithoutBoost[0].score * boostFactor)
    })

    it('skips document if boostDocument returns a falsy value', () => {
      const query = 'vita'
      const boostDocument = jest.fn((id, term) => id === 3 ? null : 1)
      const resultsWithoutBoost = ms.search(query)
      const results = ms.search(query, { boostDocument })
      expect(resultsWithoutBoost.map(({ id }) => id)).toContain(3)
      expect(results.map(({ id }) => id)).not.toContain(3)
    })

    it('uses a specific search-time tokenizer if specified', () => {
      const tokenize = (string) => string.split('X')
      const results = ms.search('divinaXcommedia', { tokenize })
      expect(results.length).toBeGreaterThan(0)
      expect(results.map(({ id }) => id).sort()).toEqual([1])
    })

    it('uses a specific search-time term processing function if specified', () => {
      const processTerm = (string) => string.replace(/1/g, 'i').replace(/4/g, 'a').toLowerCase()
      const results = ms.search('d1v1n4', { processTerm })
      expect(results.length).toBeGreaterThan(0)
      expect(results.map(({ id }) => id).sort()).toEqual([1])
    })

    it('rejects falsy terms', () => {
      const processTerm = (term) => term === 'quel' ? null : term
      const results = ms.search('quel commedia', { processTerm })
      expect(results.length).toBeGreaterThan(0)
      expect(results.map(({ id }) => id).sort()).toEqual([1])
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
        expect(results.map(({ terms }) => terms)).toEqual([
          ['vita', 'nova'],
          ['vita']
        ])
      })

      it('reports correct info when combining terms with AND', () => {
        const results = ms.search('vita nova', { combineWith: 'AND' })
        expect(results.map(({ match }) => match)).toEqual([
          { vita: ['title', 'text'], nova: ['title'] }
        ])
        expect(results.map(({ terms }) => terms)).toEqual([
          ['vita', 'nova']
        ])
      })

      it('reports correct info for fuzzy and prefix queries', () => {
        const results = ms.search('vi nuova', { fuzzy: 0.2, prefix: true })
        expect(results.map(({ match }) => match)).toEqual([
          { vita: ['title', 'text'], nova: ['title'] },
          { vita: ['text'] }
        ])
        expect(results.map(({ terms }) => terms)).toEqual([
          ['vita', 'nova'],
          ['vita']
        ])
      })

      it('passes only the query to tokenize', () => {
        const tokenize = jest.fn(string => string.split(/\W+/))
        const ms = new MiniSearch({ fields: ['text', 'title'], searchOptions: { tokenize } })
        const query = 'some search query'
        ms.search(query)
        expect(tokenize).toHaveBeenCalledWith(query)
      })

      it('passes only the term to processTerm', () => {
        const processTerm = jest.fn(term => term.toLowerCase())
        const ms = new MiniSearch({ fields: ['text', 'title'], searchOptions: { processTerm } })
        const query = 'some search query'
        ms.search(query)
        query.split(/\W+/).forEach(term => {
          expect(processTerm).toHaveBeenCalledWith(term)
        })
      })
    })
  })

  describe('default tokenization', () => {
    it('splits on non-alphanumeric taking diacritics into account', () => {
      const documents = [
        {
          id: 1,
          text:
          `Se la vita è sventura,
          perché da noi si dura?
          Intatta luna, tale
          è lo stato mortale.
          Ma tu mortal non sei,
          e forse del mio dir poco ti cale`
        },
        {
          id: 2,
          text: `The estimates range from roughly 1 in 100 to 1 in 100,000. The higher figures come from the working engineers, and the very low figures from management. What are the causes and consequences of this lack of agreement? Since 1 part in 100,000 would imply that one could put a Shuttle up each day for 300 years expecting to lose only one, we could properly ask "What is the cause of management's fantastic faith in the machinery?"`
        }
      ]
      const ms = new MiniSearch({ fields: ['text'] })
      ms.addAll(documents)
      expect(ms.search('perché').length).toBeGreaterThan(0)
      expect(ms.search('perch').length).toEqual(0)
      expect(ms.search('luna').length).toBeGreaterThan(0)

      expect(ms.search('300').length).toBeGreaterThan(0)
      expect(ms.search('machinery').length).toBeGreaterThan(0)
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

    it('returns empty array if there is no match', () => {
      const results = ms.autoSuggest('paguro')
      expect(results).toEqual([])
    })

    it('returns empty array for empty search', () => {
      const results = ms.autoSuggest('')
      expect(results).toEqual([])
    })

    it('returns scored suggestions for multi-word queries', () => {
      const results = ms.autoSuggest('vi no')
      expect(results.length).toBeGreaterThan(0)
      expect(results.map(({ suggestion }) => suggestion)).toEqual(['vita nova', 'vita nostra'])
      expect(results[0].score).toBeGreaterThan(results[1].score)
    })

    it('respects the order of the terms in the query', () => {
      const results = ms.autoSuggest('no vi')
      expect(results.map(({ suggestion }) => suggestion)).toEqual(['nova vita', 'nostra vita'])
    })

    it('returns empty suggestions for terms that are not in the index', () => {
      let results
      expect(() => {
        results = ms.autoSuggest('sottomarino aeroplano')
      }).not.toThrowError()
      expect(results.length).toEqual(0)
    })

    it('does not duplicate suggested terms', () => {
      const results = ms.autoSuggest('vita', { fuzzy: true, prefix: true })
      expect(results[0].suggestion).toEqual('vita')
      expect(results[0].terms).toEqual(['vita'])
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
      expect(ms.toJSON()).toEqual(deserialized.toJSON())
    })
  })

  describe('getDefault', () => {
    it('returns the default value of the given option', () => {
      expect(MiniSearch.getDefault('idField')).toEqual('id')
      expect(MiniSearch.getDefault('tokenize')).toBeInstanceOf(Function)
      expect(MiniSearch.getDefault('processTerm')).toBeInstanceOf(Function)
      expect(MiniSearch.getDefault('searchOptions')).toBe(undefined)
      expect(MiniSearch.getDefault('fields')).toBe(undefined)
    })

    it('throws an error if there is no option with the given name', () => {
      expect(() => { MiniSearch.getDefault('foo') }).toThrowError('MiniSearch: unknown option "foo"')
    })
  })
})
