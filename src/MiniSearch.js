import SearchableMap from './SearchableMap/SearchableMap.js'

const OR = 'or'
const AND = 'and'

class MiniSearch {
  constructor (options = {}) {
    this.options = { ...defaultOptions, ...options }
    this.options.searchOptions = { ...defaultSearchOptions, ...(this.options.searchOptions || {}) }
    const { fields } = this.options

    if (fields == null) {
      throw new Error('Option "fields" must be provided')
    }

    this.index = new SearchableMap()
    this.documentCount = 0
    this.documentIds = {}
    this.fieldIds = {}

    addFields(this, fields)
  }

  add (document) {
    const { tokenize, processTerm, fields, idField } = this.options
    if (document[idField] == null) {
      throw new Error(`Document does not have ID field "${idField}"`)
    }
    const shortDocumentId = addDocumentId(this, document[idField])
    fields.filter(field => document[field] != null).forEach(field => {
      tokenize(document[field]).forEach(term => {
        addTerm(this, this.fieldIds[field], shortDocumentId, processTerm(term))
      })
    })
  }

  addAll (documents) {
    documents.forEach(document => this.add(document))
  }

  search (queryString, options = {}) {
    const { tokenize, processTerm, searchOptions } = this.options
    options = { ...searchOptions, ...options }
    const queries = tokenize(queryString).map(processTerm).map(options.termToQuery)
    const results = queries.map(query => this.executeQuery(query, options))
    const combinedResults = this.combineResults(results, options.combineWith)

    return Object.entries(combinedResults)
      .map(([shortDocumentId, score]) => ({ id: this.documentIds[shortDocumentId], score }))
      .sort(({ score: a }, { score: b }) => a < b ? 1 : -1)
  }

  executeQuery (query, options = {}) {
    options = { ...this.options.defaultSearchOptions, ...options }
    const fields = options.fields || this.options.fields
    if (!query.fuzzy && !query.prefix) {
      return termResults(this, fields, this.index.get(query.term), options.boost)
    }
    const results = []
    if (query.fuzzy) {
      const maxDistance = query.fuzzy < 1 ? Math.round(query.term.length * query.fuzzy) : query.fuzzy
      Object.values(this.index.fuzzyGet(query.term, maxDistance)).forEach(([data, distance]) => {
        if (query.prefix && distance === 0) { return }
        results.push(termResults(this, fields, data, options.boost, distance))
      })
    }
    if (query.prefix) {
      this.index.atPrefix(query.term).forEach((term, data) => {
        results.push(termResults(this, fields, data, options.boost, term.length - query.term.length))
      })
    }
    return results.reduce(combinators[OR], {})
  }

  combineResults (results, combineWith = OR) {
    if (results.length === 0) { return {} }
    const operator = combineWith.toLowerCase()
    return results.reduce(combinators[operator], null)
  }

  toJSON () {
    return {
      index: this.index,
      documentCount: this.documentCount,
      documentIds: this.documentIds,
      fieldIds: this.fieldIds
    }
  }

  toJS () {
    this.toJSON()
  }
}

MiniSearch.loadJSON = function (json, options = {}) {
  return MiniSearch.loadJS(JSON.parse(json), options)
}

MiniSearch.loadJS = function (js, options = {}) {
  const { index: { _tree, _prefix }, documentCount, documentIds, fieldIds } = js
  const miniSearch = new MiniSearch(options)
  miniSearch.index = new SearchableMap(_tree, _prefix)
  miniSearch.documentCount = documentCount
  miniSearch.documentIds = documentIds
  miniSearch.fieldIds = fieldIds
  return miniSearch
}

MiniSearch.SearchableMap = SearchableMap

const addTerm = function (self, fieldId, documentId, term) {
  self.index.update(term, indexData => {
    indexData = indexData || {}
    const fieldIndex = indexData[fieldId] || { df: 0, ds: {} }
    if (fieldIndex.ds[documentId] == null) { fieldIndex.df += 1 }
    fieldIndex.ds[documentId] = (fieldIndex.ds[documentId] || 0) + 1
    return { ...indexData, [fieldId]: fieldIndex }
  })
}

const addDocumentId = function (self, documentId) {
  const shortDocumentId = self.documentCount
  self.documentIds[shortDocumentId] = documentId
  self.documentCount += 1
  return shortDocumentId
}

const addFields = function (self, fields) {
  fields.forEach((field, i) => { self.fieldIds[field] = i })
}

const termResults = function (self, fields, indexData, boosts, distance = 0) {
  if (indexData == null) { return {} }
  return fields.reduce((scores, field) => {
    const { df, ds } = indexData[self.fieldIds[field]] || { ds: {} }
    Object.entries(ds).forEach(([documentId, tf]) => {
      const boost = ((boosts || {})[field] || 1) * (1 / (1 + (0.2 * distance)))
      scores[documentId] = (scores[documentId] || 0) + (boost * tfIdf(tf, df, self.documentCount))
    })
    return scores
  }, {})
}

const combinators = {
  [OR]: function (a, b) {
    return Object.entries(b).reduce((combined, [documentId, score]) => {
      combined[documentId] = (combined[documentId] || 0) + score
      return combined
    }, a || {})
  },
  [AND]: function (a, b) {
    if (a == null) { return b }
    return Object.entries(b).reduce((combined, [documentId, score]) => {
      if (a[documentId] === undefined) { return combined }
      combined[documentId] = Math.min(a[documentId], score)
      return combined
    }, {})
  }
}

const tfIdf = function (tf, df, n) {
  return tf * Math.log(n / df)
}

const defaultOptions = {
  idField: 'id',
  tokenize: string => string.split(/\W+/).filter(term => term.length > 1),
  processTerm: term => term.toLowerCase()
}

const defaultSearchOptions = {
  termToQuery: term => ({ term })
}

export default MiniSearch
