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

  search (queryString, options = {}) {
    const { tokenize, processTerm, searchOptions } = this.options
    options = { ...searchOptions, ...options }
    const queries = tokenize(queryString).map(processTerm).map(options.termToQuery)
    const results = queries.map(query => this.executeQuery(query, options))
    const combinedResults = this.combineResults(results, options.combineWith)

    return Object.entries(combinedResults)
      .map(([shortDocumentId, score]) => ({ id: this.documentIds[shortDocumentId], score }))
      .sort(({ score: a }, { score: b }) => a < b)
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
      Object.values(this.index.fuzzyGet(query.term, maxDistance))
        .forEach(([data, distance]) => results.push(termResults(this, fields, data, options.boost, distance)))
    }
    if (query.prefix) {
      this.index.atPrefix(query.term)
        .forEach((term, data) =>
          results.push(termResults(this, fields, data, options.boost, term.length - query.term.length)))
    }
    return results.reduce(combinators[OR], {})
  }

  combineResults (results, combineWith = OR) {
    if (results.length === 0) { return {} }
    const operator = combineWith.toLowerCase()
    return results.reduce(combinators[operator], null)
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

const termResults = function (instance, fields, indexData, boosts, distance = 0) {
  if (indexData == null) { return {} }
  return fields.reduce((scores, field) => {
    const { df, ds } = indexData[instance.fieldIds[field]] || { ds: {} }
    Object.entries(ds).forEach(([documentId, tf]) => {
      const boost = ((boosts || {})[field] || 1) * (1 / (1 + 0.5 * distance))
      scores[documentId] = (scores[documentId] || 0) + boost * tfIdf(tf, df, instance.documentCount)
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
