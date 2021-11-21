/* eslint-env jest */

import MiniSearch from './MiniSearch'

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

    it('extracts the ID field using extractField', () => {
      const extractField = (document, fieldName) => {
        if (fieldName === 'id') { return document.id.value }
        return MiniSearch.getDefault('extractField')(document, fieldName)
      }
      const ms = new MiniSearch({ fields: ['text'], extractField })

      ms.add({ id: { value: 123 }, text: 'Nel mezzo del cammin di nostra vita' })

      const results = ms.search('vita')
      expect(results[0].id).toEqual(123)
    })

    it('rejects falsy terms', () => {
      const processTerm = term => term === 'foo' ? null : term
      const ms = new MiniSearch({ fields: ['title', 'text'], processTerm })
      expect(() => {
        ms.add({ id: 123, text: 'foo bar' })
      }).not.toThrowError()
    })

    it('turns the field to string before tokenization', () => {
      const tokenize = jest.fn(x => x.split(/\W+/))
      const ms = new MiniSearch({ fields: ['id', 'tags', 'isBlinky'], tokenize })
      expect(() => {
        ms.add({ id: 123, tags: ['foo', 'bar'], isBlinky: false })
        ms.add({ id: 321, isBlinky: true })
      }).not.toThrowError()

      expect(tokenize).toHaveBeenCalledWith('123', 'id')
      expect(tokenize).toHaveBeenCalledWith('foo,bar', 'tags')
      expect(tokenize).toHaveBeenCalledWith('false', 'isBlinky')

      expect(tokenize).toHaveBeenCalledWith('321', 'id')
      expect(tokenize).toHaveBeenCalledWith('true', 'isBlinky')
    })

    it('passes document and field name to the field extractor', () => {
      const extractField = jest.fn((document, fieldName) => {
        if (fieldName === 'pubDate') {
          return document[fieldName] && document[fieldName].toLocaleDateString('it-IT')
        }
        return fieldName.split('.').reduce((doc, key) => doc && doc[key], document)
      })
      const tokenize = jest.fn(string => string.split(/\W+/))
      const ms = new MiniSearch({
        fields: ['title', 'pubDate', 'author.name'],
        storeFields: ['category'],
        extractField,
        tokenize
      })
      const document = {
        id: 1,
        title: 'Divina Commedia',
        pubDate: new Date(1320, 0, 1),
        author: { name: 'Dante Alighieri' },
        category: 'poetry'
      }
      ms.add(document)
      expect(extractField).toHaveBeenCalledWith(document, 'title')
      expect(extractField).toHaveBeenCalledWith(document, 'pubDate')
      expect(extractField).toHaveBeenCalledWith(document, 'author.name')
      expect(extractField).toHaveBeenCalledWith(document, 'category')
      expect(tokenize).toHaveBeenCalledWith(document.title, 'title')
      expect(tokenize).toHaveBeenCalledWith('1/1/1320', 'pubDate')
      expect(tokenize).toHaveBeenCalledWith(document.author.name, 'author.name')
      expect(tokenize).not.toHaveBeenCalledWith(document.category, 'category')
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

    it('cleans up all data of the deleted document', () => {
      const otherDocument = { id: 4, title: 'Decameron', text: 'Umana cosa è aver compassione degli afflitti' }
      const originalFieldLength = JSON.parse(JSON.stringify(ms._fieldLength))
      const originalAverageFieldLength = JSON.parse(JSON.stringify(ms._averageFieldLength))

      ms.add(otherDocument)
      ms.remove(otherDocument)

      expect(ms.documentCount).toEqual(3)
      expect(ms._fieldLength).toEqual(originalFieldLength)
      expect(ms._averageFieldLength).toEqual(originalAverageFieldLength)
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

    it('removes documents when using a custom extractField', () => {
      const extractField = (document, fieldName) => {
        const path = fieldName.split('.')
        return path.reduce((doc, key) => doc && doc[key], document)
      }
      const ms = new MiniSearch({ fields: ['text.value'], storeFields: ['id'], extractField })
      const document = { id: 123, text: { value: 'Nel mezzo del cammin di nostra vita' } }
      ms.add(document)

      expect(() => {
        ms.remove(document)
      }).not.toThrowError()

      expect(ms.search('vita')).toEqual([])
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

    it('extracts the ID field using extractField', () => {
      const extractField = (document, fieldName) => {
        if (fieldName === 'id') { return document.id.value }
        return MiniSearch.getDefault('extractField')(document, fieldName)
      }
      const ms = new MiniSearch({ fields: ['text'], extractField })
      const document = { id: { value: 123 }, text: 'Nel mezzo del cammin di nostra vita' }
      ms.add(document)

      expect(() => {
        ms.remove(document)
      }).not.toThrowError()

      expect(ms.search('vita')).toEqual([])
    })

    it('does not crash when the document has field named like default properties of object', () => {
      const ms = new MiniSearch({ fields: ['constructor'] })
      const document = { id: 1 }
      ms.add(document)

      expect(() => {
        ms.remove(document)
      }).not.toThrowError()
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

    describe('when using custom per-field extraction/tokenizer/processing', () => {
      const documents = [
        { id: 1, title: 'Divina Commedia', tags: 'dante,virgilio', author: { name: 'Dante Alighieri' } },
        { id: 2, title: 'I Promessi Sposi', tags: 'renzo,lucia', author: { name: 'Alessandro Manzoni' } },
        { id: 3, title: 'Vita Nova', author: { name: 'Dante Alighieri' } }
      ]

      let ms, _warn
      beforeEach(() => {
        ms = new MiniSearch({
          fields: ['title', 'tags', 'authorName'],
          extractField: (doc, fieldName) => {
            if (fieldName === 'authorName') {
              return doc.author.name
            } else {
              return doc[fieldName]
            }
          },
          tokenize: (field, fieldName) => {
            if (fieldName === 'tags') {
              return field.split(',')
            } else {
              return field.split(/\s+/)
            }
          },
          processTerm: (term, fieldName) => {
            if (fieldName === 'tags') {
              return term.toUpperCase()
            } else {
              return term.toLowerCase()
            }
          }
        })
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

  describe('removeAll', () => {
    const documents = [
      { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita ... cammin' },
      { id: 2, title: 'I Promessi Sposi', text: 'Quel ramo del lago di Como' },
      { id: 3, title: 'Vita Nova', text: 'In quella parte del libro della mia memoria ... cammin' }
    ]

    let ms, _warn
    beforeEach(() => {
      ms = new MiniSearch({ fields: ['title', 'text'] })
      _warn = console.warn
      console.warn = jest.fn()
    })

    afterEach(() => {
      console.warn = _warn
    })

    it('removes all documents from the index if called with no argument', () => {
      const empty = MiniSearch.loadJSON(JSON.stringify(ms), {
        fields: ['title', 'text']
      })

      ms.addAll(documents)
      expect(ms.documentCount).toEqual(3)

      ms.removeAll()

      expect(ms).toEqual(empty)
    })

    it('removes the given documents from the index', () => {
      ms.addAll(documents)
      expect(ms.documentCount).toEqual(3)

      ms.removeAll([documents[0], documents[2]])

      expect(ms.documentCount).toEqual(1)
      expect(ms.search('commedia').length).toEqual(0)
      expect(ms.search('vita').length).toEqual(0)
      expect(ms.search('lago').length).toEqual(1)
    })

    it('raises an error if called with a falsey argument', () => {
      expect(() => { ms.removeAll(null) }).toThrowError()
      expect(() => { ms.removeAll(undefined) }).toThrowError()
      expect(() => { ms.removeAll(false) }).toThrowError()
      expect(() => { ms.removeAll([]) }).not.toThrowError()
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

  describe('addAllAsync', () => {
    it('adds all the documents to the index', () => {
      const ms = new MiniSearch({ fields: ['text'] })
      const documents = [
        { id: 1, text: 'Nel mezzo' },
        { id: 2, text: 'del cammin' },
        { id: 3, text: 'di nostra vita' },
        { id: 4, text: 'Mi ritrovai' },
        { id: 5, text: 'per una' },
        { id: 6, text: 'selva oscura' },
        { id: 7, text: 'ché la' },
        { id: 8, text: 'diritta via' },
        { id: 9, text: 'era smarrita' },
        { id: 10, text: 'ahi quanto' },
        { id: 11, text: 'a dir' },
        { id: 12, text: 'qual era' },
        { id: 13, text: 'è cosa dura' }
      ]

      return ms.addAllAsync(documents).then(() => {
        expect(ms.documentCount).toEqual(documents.length)
      })
    })

    it('accepts a chunkSize option', () => {
      const ms = new MiniSearch({ fields: ['text'] })
      const documents = [
        { id: 1, text: 'Nel mezzo' },
        { id: 2, text: 'del cammin' },
        { id: 3, text: 'di nostra vita' },
        { id: 4, text: 'Mi ritrovai' },
        { id: 5, text: 'per una' },
        { id: 6, text: 'selva oscura' },
        { id: 7, text: 'ché la' },
        { id: 8, text: 'diritta via' },
        { id: 9, text: 'era smarrita' },
        { id: 10, text: 'ahi quanto' },
        { id: 11, text: 'a dir' },
        { id: 12, text: 'qual era' },
        { id: 13, text: 'è cosa dura' }
      ]

      return ms.addAllAsync(documents, { chunkSize: 3 }).then(() => {
        expect(ms.documentCount).toEqual(documents.length)
      })
    })
  })

  describe('search', () => {
    const documents = [
      { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita' },
      { id: 2, title: 'I Promessi Sposi', text: 'Quel ramo del lago di Como', category: 'fiction' },
      { id: 3, title: 'Vita Nova', text: 'In quella parte del libro della mia memoria', category: 'poetry' }
    ]
    const ms = new MiniSearch({ fields: ['title', 'text'], storeFields: ['category'] })
    ms.addAll(documents)

    it('returns scored results', () => {
      const results = ms.search('vita')
      expect(results.length).toBeGreaterThan(0)
      expect(results.map(({ id }) => id).sort()).toEqual([1, 3])
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
    })

    it('returns stored fields in the results', () => {
      const results = ms.search('del')
      expect(results.length).toBeGreaterThan(0)
      expect(results.map(({ category }) => category).sort()).toEqual(['fiction', 'poetry', undefined])
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

    it('computes a meaningful score when fields are named liked default properties of object', () => {
      const ms = new MiniSearch({ fields: ['constructor'] })
      ms.add({ id: 1, constructor: 'something' })
      ms.add({ id: 1, constructor: 'something else' })

      const results = ms.search('something')
      results.forEach((result) => {
        expect(Number.isFinite(result.score)).toBe(true)
      })
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

    it('combines results with AND_NOT if combineWith is AND_NOT', () => {
      const results = ms.search('vita cammin', { combineWith: 'AND_NOT' })
      expect(results.length).toEqual(1)
      expect(results.map(({ id }) => id)).toEqual([3])
      expect(ms.search('vita sottomarino', { combineWith: 'AND_NOT' }).length).toEqual(2)
      expect(ms.search('sottomarino vita', { combineWith: 'AND_NOT' }).length).toEqual(0)
    })

    it('returns empty results for empty search', () => {
      expect(ms.search('')).toEqual([])
      expect(ms.search('', { combineWith: 'OR' })).toEqual([])
      expect(ms.search('', { combineWith: 'AND' })).toEqual([])
      expect(ms.search('', { combineWith: 'AND_NOT' })).toEqual([])
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

    it('allows custom filtering of results on the basis of stored fields', () => {
      const results = ms.search('del', {
        filter: ({ category }) => category === 'poetry'
      })
      expect(results.length).toBe(1)
      expect(results.every(({ category }) => category === 'poetry')).toBe(true)
    })

    describe('when passing a query tree', () => {
      it('searches according to the given combination', () => {
        const results = ms.search({
          combineWith: 'OR',
          queries: [
            {
              combineWith: 'AND',
              queries: ['vita', 'cammin']
            },
            'como sottomarino',
            {
              combineWith: 'AND',
              queries: ['nova', 'pappagallo']
            }
          ]
        })
        expect(results.length).toEqual(2)
        expect(results.map(({ id }) => id)).toEqual([1, 2])
      })

      it('uses the given options for each subquery, cascading them properly', () => {
        const results = ms.search({
          combineWith: 'OR',
          fuzzy: true,
          queries: [
            {
              prefix: true,
              fields: ['title'],
              queries: ['vit']
            },
            {
              combineWith: 'AND',
              queries: ['bago', 'coomo']
            }
          ]
        })
        expect(results.length).toEqual(2)
        expect(results.map(({ id }) => id)).toEqual([3, 2])
      })
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

      it('does not break when special properties of object are used as a term', () => {
        const specialWords = ['constructor', 'hasOwnProperty', 'isPrototypeOf']
        const ms = new MiniSearch({ fields: ['text'] })
        const processTerm = MiniSearch.getDefault('processTerm')

        ms.add({ id: 1, text: specialWords.join(' ') })

        specialWords.forEach((word) => {
          expect(() => { ms.search(word) }).not.toThrowError()

          const results = ms.search(word)
          expect(results[0].id).toEqual(1)
          expect(results[0].match[processTerm(word)]).toEqual(['text'])
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
          text: 'The estimates range from roughly 1 in 100 to 1 in 100,000. The higher figures come from the working engineers, and the very low figures from management. What are the causes and consequences of this lack of agreement? Since 1 part in 100,000 would imply that one could put a Shuttle up each day for 300 years expecting to lose only one, we could properly ask "What is the cause of management\'s fantastic faith in the machinery?"'
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

    it('supports non-latin alphabets', () => {
      const documents = [
        { id: 1, title: 'София София' },
        { id: 2, title: 'アネモネ' },
        { id: 3, title: '«τέχνη»' },
        { id: 4, title: 'سمت  الرأس' },
        { id: 5, title: '123 45' }
      ]
      const ms = new MiniSearch({ fields: ['title'] })
      ms.addAll(documents)

      expect(ms.search('софия').map(({ id }) => id)).toEqual([1])
      expect(ms.search('アネモネ').map(({ id }) => id)).toEqual([2])
      expect(ms.search('τέχνη').map(({ id }) => id)).toEqual([3])
      expect(ms.search('الرأس').map(({ id }) => id)).toEqual([4])
      expect(ms.search('123').map(({ id }) => id)).toEqual([5])
    })
  })

  describe('autoSuggest', () => {
    const documents = [
      { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita', category: 'poetry' },
      { id: 2, title: 'I Promessi Sposi', text: 'Quel ramo del lago di Como', category: 'fiction' },
      { id: 3, title: 'Vita Nova', text: 'In quella parte del libro della mia memoria', category: 'poetry' }
    ]
    const ms = new MiniSearch({ fields: ['title', 'text'], storeFields: ['category'] })
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
      const results = ms.autoSuggest('vita no')
      expect(results.length).toBeGreaterThan(0)
      expect(results.map(({ suggestion }) => suggestion)).toEqual(['vita nova', 'vita nostra'])
      expect(results[0].score).toBeGreaterThan(results[1].score)
    })

    it('respects the order of the terms in the query', () => {
      const results = ms.autoSuggest('nostra vi')
      expect(results.map(({ suggestion }) => suggestion)).toEqual(['nostra vita', 'vita'])
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

    it('applies the given custom filter', () => {
      let results = ms.autoSuggest('que', {
        filter: ({ category }) => category === 'fiction'
      })
      expect(results[0].suggestion).toEqual('quel')
      expect(results).toHaveLength(1)

      results = ms.autoSuggest('que', {
        filter: ({ category }) => category === 'poetry'
      })
      expect(results[0].suggestion).toEqual('quella')
      expect(results).toHaveLength(1)
    })
  })

  describe('loadJSON', () => {
    const documents = [
      { id: 1, title: 'Divina Commedia', text: 'Nel mezzo del cammin di nostra vita', category: 'poetry' },
      { id: 2, title: 'I Promessi Sposi', text: 'Quel ramo del lago di Como', category: 'fiction' },
      { id: 3, title: 'Vita Nova', text: 'In quella parte del libro della mia memoria', category: 'poetry' }
    ]

    it('loads a JSON-serialized search index', () => {
      const options = { fields: ['title', 'text'], storeFields: ['category'] }
      const ms = new MiniSearch(options)
      ms.addAll(documents)
      const json = JSON.stringify(ms)
      const deserialized = MiniSearch.loadJSON(json, options)
      expect(ms.search('vita')).toEqual(deserialized.search('vita'))
      expect(ms.toJSON()).toEqual(deserialized.toJSON())
    })

    it('raises an error if called without options', () => {
      const options = { fields: ['title', 'text'] }
      const ms = new MiniSearch(options)
      ms.addAll(documents)
      const json = JSON.stringify(ms)
      expect(() => {
        MiniSearch.loadJSON(json)
      }).toThrowError('MiniSearch: loadJSON should be given the same options used when serializing the index')
    })
  })

  describe('getDefault', () => {
    it('returns the default value of the given option', () => {
      expect(MiniSearch.getDefault('idField')).toEqual('id')
      expect(MiniSearch.getDefault('extractField')).toBeInstanceOf(Function)
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
