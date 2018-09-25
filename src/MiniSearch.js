import SearchableMap from './SearchableMap/SearchableMap.js'

const OR = 'or'
const AND = 'and'

/**
* MiniSearch is the main entrypoint class, and represents a full-text search
* engine.
*
* @example
* // Create a search engine that indexes the 'title' and 'text' fields of your
* // documents:
* const miniSearch = MiniSearch.new({ fields: ['title', 'text'] })
*
* // Add documents to the index
* const documents = [
*   { id: 1, title: 'Moby Dick', text: 'Call me Ishmael. Some years ago...' },
*   { id: 2, title: 'Zen and the Art of Motorcycle Maintenance', text: 'I can see by my watch...' },
*   { id: 3, title: 'Neuromancer', text: 'The sky above the port was...' },
*   { id: 4, title: 'Zen and the Art of Archery', text: 'At first sight it must seem...' },
*   // ...and more
* ]
*
* documents.forEach(document => miniSearch.add(document))
*
* // Or, equivalently:
* miniSearch.addAll(documents)
*
* // Search for documents:
* let results = miniSearch.search('zen art motorcycle')
* // => [ { id: 2, score: 2.77258 }, { id: 4, score: 1.38629 } ]
* */
class MiniSearch {
  /**
  * @param {Object} options - Configuration options
  * @param {Array<string>} options.fields - Fields to be indexed. Required.
  * @param {string} [options.idField='id'] - ID field, uniquely identifying a document
  * @param {function(text: string): Array<string>} [options.tokenize] - Function used to split a field into individual terms
  * @param {function(term: string): string} [options.processTerm] - Function used to process a term before indexing it or searching
  * @param {?Object} options.searchOptions - Default search options (see search method for details)
  *
  * @example
  * // Create a search engine that indexes the 'title' and 'text' fields of your
  * // documents:
  * const miniSearch = MiniSearch.new({ fields: ['title', 'text'] })
  *
  * @example
  * // Your documents are assumed to include a unique 'id' field, but if you want
  * // to use a different field for document identification, you can set the
  * // 'idField' option:
  * const miniSearch = MiniSearch.new({ idField: 'key', fields: ['title', 'text'] })
  *
  * @example
  * // The full set of options (here with their default value) is:
  * const miniSearch = MiniSearch.new({
  *   // idField: field that uniquely identifies a document
  *   idField: 'id',
  *
  *   // tokenize: function used to split fields and queries into individual
  *   // terms
  *   tokenize: string => string.split(/\W+/).filter(term => term.length > 1),
  *
  *   // processTerm: function used to process document and query terms before
  *   // indexing or searching. It can be used for stemming and normalization.
  *   processTerm: term => term.toLowerCase()
  *
  *   // searchOptions: default search options, see `search` method for details
  *   searchOptions: undefined
  *
  *   // fields: document fields to be indexed. Mandatory, but not set by default
  *   fields: undefined,
  * })
  */
  constructor (options = {}) {
    /** @private */
    this._options = { ...defaultOptions, ...options }

    this._options.searchOptions = { ...defaultSearchOptions, ...(this._options.searchOptions || {}) }
    const { fields } = this._options

    if (fields == null) {
      throw new Error('Option "fields" must be provided')
    }

    /** @private */
    this._index = new SearchableMap()

    /** @private */
    this._documentCount = 0

    /** @private */
    this._documentIds = {}

    /** @private */
    this._fieldIds = {}

    addFields(this, fields)
  }

  /**
  * Adds a document to the index
  * @param {Object} document - the document to be indexed
  */
  add (document) {
    const { tokenize, processTerm, fields, idField } = this._options
    if (document[idField] == null) {
      throw new Error(`Document does not have ID field "${idField}"`)
    }
    const shortDocumentId = addDocumentId(this, document[idField])
    fields.filter(field => document[field] != null).forEach(field => {
      tokenize(document[field]).forEach(term => {
        addTerm(this, this._fieldIds[field], shortDocumentId, processTerm(term))
      })
    })
  }

  /**
  * Adds all the given documents to the index
  * @param {Object[]} documents - an array of documents to be indexed
  */
  addAll (documents) {
    documents.forEach(document => this.add(document))
  }

  /**
  * Search for documents matching the query
  * @param {string} queryString - Query string to search for
  * @param {Object} [options] - Search options
  * @param {Array<string>} [options.fields] - Fields to search in. If omitted, all fields are searched
  * @param {Object<string, number>} [options.boost] - Key-value object of boosting values for fields
  * @param {function(term: string): {term: !string, prefix: ?boolean, fuzzy: ?number}} [options.termToQuery] - Function specifying how a term is turned into a query (whether to perform fuzzy search, prefix search, etc.)
  * @param {string} [options.combineWith='OR'] - How to combine term queries (it can be 'OR' or 'AND')
  * @return {Array<{ id: any, score: number }>} A sorted array of scored document IDs matching the search
  *
  * @example
  * // Search for "zen art motorcycle" with default options: terms have to match
  * // exactly, and individual terms are joined with OR
  * miniSearch.search('zen art motorcycle')
  * // => [ { id: 2, score: 2.77258 }, { id: 4, score: 1.38629 } ]
  *
  * @example
  * // Search only in the 'title' field
  * miniSearch.search('zen', { fields: ['title'] })
  *
  * @example
  * // Boost a field
  * miniSearch.search('zen', { boost: { title: 2 } })
  *
  * @example
  * // Search for "moto" with prefix search (it will match documents
  * // containing terms that start with "moto" or "neuro")
  * miniSearch.search('moto neuro', {
  *   termToQuery: term => ({ term, prefix: true })
  * })
  *
  * @example
  * // Search for "ismael" with fuzzy search (it will match documents containing
  * // terms similar to "ismael", with a maximum edit distance of 0.2 term.length
  * // (rounded to nearest integer)
  * miniSearch.search('ismael', {
  *   termToQuery: term => ({ term, fuzzy: 0.2 })
  * })
  *
  * @example
  * // Mix of exact match, prefix search, and fuzzy search
  * miniSearch.search('ismael mob', {
  *   termToQuery: term => ({ term, prefix: true, fuzzy: 0.2 })
  * })
  *
  * @example
  * // Combine search terms with AND (to match only documents that contain both
  * // "motorcycle" and "art")
  * miniSearch.search('motorcycle art', { combineWith: 'AND' })
  */
  search (queryString, options = {}) {
    const { tokenize, processTerm, searchOptions } = this._options
    options = { ...searchOptions, ...options }
    const queries = tokenize(queryString).map(processTerm).map(options.termToQuery)
    const results = queries.map(query => this.executeQuery(query, options))
    const combinedResults = this.combineResults(results, options.combineWith)

    return Object.entries(combinedResults)
      .map(([shortDocumentId, score]) => ({ id: this._documentIds[shortDocumentId], score }))
      .sort(({ score: a }, { score: b }) => a < b ? 1 : -1)
  }

  /**
  * Number of documents in the index
  *
  * @type {number}
  */
  get documentCount () {
    return this._documentCount
  }

  /**
  * @private
  * @ignore
  */
  executeQuery (query, options = {}) {
    options = { ...this._options.defaultSearchOptions, ...options }
    const fields = options.fields || this._options.fields
    if (!query.fuzzy && !query.prefix) {
      return termResults(this, fields, this._index.get(query.term), options.boost)
    }
    const results = []
    if (query.fuzzy) {
      const maxDistance = query.fuzzy < 1 ? Math.round(query.term.length * query.fuzzy) : query.fuzzy
      Object.values(this._index.fuzzyGet(query.term, maxDistance)).forEach(([data, distance]) => {
        if (query.prefix && distance === 0) { return }
        results.push(termResults(this, fields, data, options.boost, distance))
      })
    }
    if (query.prefix) {
      this._index.atPrefix(query.term).forEach((term, data) => {
        results.push(termResults(this, fields, data, options.boost, term.length - query.term.length))
      })
    }
    return results.reduce(combinators[OR], {})
  }

  /**
  * @private
  * @ignore
  */
  combineResults (results, combineWith = OR) {
    if (results.length === 0) { return {} }
    const operator = combineWith.toLowerCase()
    return results.reduce(combinators[operator], null)
  }

  /**
  * Serializes the index to JSON, to allow storing it and later deserializing
  * with MiniSearch.fromJSON
  * @return {string} the JSON-serialized index
  */
  toJSON () {
    return {
      index: this._index,
      documentCount: this._documentCount,
      documentIds: this._documentIds,
      fieldIds: this._fieldIds
    }
  }

  /**
  * @private
  * @ignore
  */
  toJS () {
    this.toJSON()
  }
}

/**
* Deserializes a JSON index (serialized with `miniSearch.toJSON()`) and
* instantiates a MiniSearch instance. It should be given the same options
* originally used when serializing the index.
* @param {string} json - JSON-serialized index
* @param {Object} options - configuration options, same as the constructor
* @return {MiniSearch} an instance of MiniSearch
*/
MiniSearch.loadJSON = function (json, options = {}) {
  return MiniSearch.loadJS(JSON.parse(json), options)
}

/**
* @private
*/
MiniSearch.loadJS = function (js, options = {}) {
  const { index: { _tree, _prefix }, documentCount, documentIds, fieldIds } = js
  const miniSearch = new MiniSearch(options)
  miniSearch._index = new SearchableMap(_tree, _prefix)
  miniSearch._documentCount = documentCount
  miniSearch._documentIds = documentIds
  miniSearch._fieldIds = fieldIds
  return miniSearch
}

MiniSearch.SearchableMap = SearchableMap

const addTerm = function (self, fieldId, documentId, term) {
  self._index.update(term, indexData => {
    indexData = indexData || {}
    const fieldIndex = indexData[fieldId] || { df: 0, ds: {} }
    if (fieldIndex.ds[documentId] == null) { fieldIndex.df += 1 }
    fieldIndex.ds[documentId] = (fieldIndex.ds[documentId] || 0) + 1
    return { ...indexData, [fieldId]: fieldIndex }
  })
}

const addDocumentId = function (self, documentId) {
  const shortDocumentId = self._documentCount
  self._documentIds[shortDocumentId] = documentId
  self._documentCount += 1
  return shortDocumentId
}

const addFields = function (self, fields) {
  fields.forEach((field, i) => { self._fieldIds[field] = i })
}

const termResults = function (self, fields, indexData, boosts, distance = 0) {
  if (indexData == null) { return {} }
  return fields.reduce((scores, field) => {
    const { df, ds } = indexData[self._fieldIds[field]] || { ds: {} }
    Object.entries(ds).forEach(([documentId, tf]) => {
      const boost = ((boosts || {})[field] || 1) * (1 / (1 + (0.2 * distance)))
      scores[documentId] = (scores[documentId] || 0) + (boost * tfIdf(tf, df, self._documentCount))
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
  termToQuery: term => ({ term }),
  combineWith: OR
}

export default MiniSearch
