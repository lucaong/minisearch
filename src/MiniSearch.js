import SearchableMap from './SearchableMap/SearchableMap.js'

class MiniSearch {
  constructor (options = {}) {
    this.options = { ...defaultOptions, ...options }
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

  search (queryString, options = {}) {
    const { tokenize, processTerm, termToQuery } = this.options
    const queries = tokenize(queryString).map(processTerm).map(termToQuery)
    const results = queries.map(query => this.executeQuery(query, options))
    const combinedResults = combineResults(results, options.combineWith)

    return Object.entries(combinedResults)
      .map(([shortDocumentId, score]) => ({ id: this.documentIds[shortDocumentId], score }))
      .sort(({ score: a }, { score: b }) => a < b)
  }

  executeQuery (query, options = {}) {
    // TODO fuzzy and prefix search
    options = { ...this.options.defaultSearchOptions, ...options }
    const fields = options.fields || this.options.fields
    const indexData = this.index.get(query.term)
    if (indexData == null) { return [] }
    return fields.reduce((scores, field) => {
      const { df, ds } = indexData[this.fieldIds[field]] || { ds: [] }
      Object.entries(ds).forEach(([documentId, tf]) => {
        const boost = (options.boost || {})[field] || 1
        scores[documentId] = (scores[documentId] || 0) + boost * tfIdf(tf, df, this.documentCount)
      })
      return scores
    }, {})
  }
}

const addTerm = function (instance, fieldId, documentId, term) {
  instance.index.update(term, indexData => {
    indexData = indexData || {}
    const fieldIndex = indexData[fieldId] || { df: 0, ds: {} }
    if (fieldIndex.ds[documentId] == null) { fieldIndex.df += 1 }
    fieldIndex.ds[documentId] = (fieldIndex.ds[documentId] || 0) + 1
    return { ...indexData, [fieldId]: fieldIndex }
  })
}

const addDocumentId = function (instance, documentId) {
  const shortDocumentId = instance.documentCount
  instance.documentIds[shortDocumentId] = documentId
  instance.documentCount += 1
  return shortDocumentId
}

const addFields = function (instance, fields) {
  fields.forEach((field, i) => { instance.fieldIds[field] = i })
}

const combineResults = function (results, combineWith) {
  // TODO: combine with AND
  return results.reduce((combined, result) => {
    Object.entries(result).forEach(([documentId, score]) => {
      combined[documentId] = (combined[documentId] || 0) + score
    })
    return combined
  }, {})
}

const tfIdf = function (tf, df, n) {
  return tf * Math.log(n / df)
}

const defaultOptions = {
  idField: 'id',
  tokenize: string => string.split(/\W+/).filter(term => term.length > 1),
  processTerm: term => term.toLowerCase(),
  termToQuery: term => ({ term }),
  defaultSearchOptions: {}
}

export default MiniSearch
