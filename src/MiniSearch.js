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
* const documents = [
*   { id: 1, title: 'Moby Dick', text: 'Call me Ishmael. Some years ago...' },
*   { id: 2, title: 'Zen and the Art of Motorcycle Maintenance', text: 'I can see by my watch...' },
*   { id: 3, title: 'Neuromancer', text: 'The sky above the port was...' },
*   { id: 4, title: 'Zen and the Art of Archery', text: 'At first sight it must seem...' },
*   // ...and more
* ]
*
* // Add documents to the index
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
  * @param {function(text: string, fieldName: [string]): Array<string>} [options.tokenize] - Function used to split a field into individual terms
  * @param {function(term: string, fieldName: [string]): string} [options.processTerm] - Function used to process a term before indexing it or searching
  * @param {?Object} options.searchOptions - Default search options (see the `search` method for details)
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
  *   // tokenize: function used to split fields into individual terms. By
  *   // default, it is also used to tokenize search queries, unless a specific
  *   // `tokenize` search option is supplied. When tokenizing an indexed field,
  *   // the field name is passed as the second argument.
  *   tokenize: (string, _fieldName) => string.split(/[^a-zA-Z0-9\u00C0-\u017F]+/)
  *
  *   // processTerm: function used to process each tokenized term before
  *   // indexing. It can be used for stemming and normalization. Return a falsy
  *   // value in order to discard a term. By default, it is also used to process
  *   // search queries, unless a specific `processTerm` option is supplied as a
  *   // search option. When processing a term from a indexed field, the field
  *   // name is passed as the second argument.
  *   processTerm: (term, _fieldName) => term.length > 1 && term.toLowerCase()
  *
  *   // searchOptions: default search options, see the `search` method for
  *   // details
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
      throw new Error('MiniSearch: option "fields" must be provided')
    }

    /** @private */
    this._index = new SearchableMap()

    /** @private */
    this._documentCount = 0

    /** @private */
    this._documentIds = {}

    /** @private */
    this._fieldIds = {}

    /** @private */
    this._fieldLength = {}

    /** @private */
    this._averageFieldLength = {}

    /** @private */
    this._nextId = 0

    addFields(this, fields)
  }

  /**
  * Adds a document to the index
  *
  * @param {Object} document - the document to be indexed
  */
  add (document) {
    const { tokenize, processTerm, fields, idField } = this._options
    if (document[idField] == null) {
      throw new Error(`MiniSearch: document does not have ID field "${idField}"`)
    }
    const shortDocumentId = addDocumentId(this, document[idField])
    fields.forEach(field => {
      const tokens = tokenize(document[field] || '', field)
      addFieldLength(this, shortDocumentId, this._fieldIds[field], this.documentCount - 1, tokens.length)
      tokens.forEach(term => {
        const processedTerm = processTerm(term, field)
        if (isTruthy(processedTerm)) {
          addTerm(this, this._fieldIds[field], shortDocumentId, processedTerm)
        }
      })
    })
  }

  /**
  * Adds all the given documents to the index
  *
  * @param {Object[]} documents - an array of documents to be indexed
  */
  addAll (documents) {
    documents.forEach(document => this.add(document))
  }

  /**
  * Removes the given document from the index.
  *
  * The document to delete must NOT have changed between indexing and deletion,
  * otherwise the index will be corrupted. Therefore, when reindexing a document
  * after a change, the correct order of operations is:
  *
  *   1. remove old version
  *   2. apply changes
  *   3. index new version
  *
  * @param {Object} document - the document to be indexed
  */
  remove (document) {
    const { tokenize, processTerm, fields, idField } = this._options
    if (document[idField] == null) {
      throw new Error(`MiniSearch: document does not have ID field "${idField}"`)
    }
    const [shortDocumentId] = Object.entries(this._documentIds)
      .find(([_, longId]) => document[idField] === longId) || []
    if (shortDocumentId == null) {
      throw new Error(`MiniSearch: cannot remove document with ID ${document[idField]}: it is not in the index`)
    }
    fields.filter(field => document[field] != null).forEach(field => {
      tokenize(document[field]).forEach(term => {
        const processedTerm = processTerm(term)
        if (isTruthy(processedTerm)) {
          removeTerm(this, this._fieldIds[field], shortDocumentId, processTerm(term))
        }
      })
    })
    delete this._documentIds[shortDocumentId]
    this._documentCount -= 1
  }

  /**
  * Search for documents matching the given search query.
  *
  * The result is a list of scored document IDs matching the query, sorted by
  * descending score, and each including data about which terms were matched and
  * in which fields.
  *
  * @param {string} queryString - Query string to search for
  * @param {Object} [options] - Search options. Each option, if not given, defaults to the corresponding value of `searchOptions` given to the constructor, or to the library default.
  * @param {Array<string>} [options.fields] - Fields to search in. If omitted, all fields are searched
  * @param {Object<string, number>} [options.boost] - Key-value object of boosting values for fields
  * @param {boolean|function(term: string, i: number, terms: Array<string>): boolean} [options.prefix=false] - Whether to perform prefix search. Value can be a boolean, or a function computing the boolean from each tokenized and processed query term. If a function is given, it is called with the following arguments: `term: string` - the query term; `i: number` - the term index in the query terms; `terms: Array<string>` - the array of query terms.
  * @param {number|function(term: string, i: number, terms: Array<string>): boolean|number} [options.fuzzy=false] - If set to a number greater than or equal 1, it performs fuzzy search within a maximum edit distance equal to that value. If set to a number less than 1, it performs fuzzy search with a maximum edit distance equal to the term length times the value, rouded at the nearest integer. If set to a function, it calls the function for each tokenized and processed query term and expects a numeric value indicating the maximum edit distance, or a falsy falue if fuzzy search should not be performed. If a function is given, it is called with the following arguments: `term: string` - the query term; `i: number` - the term index in the query terms; `terms: Array<string>` - the array of query terms.
  * @param {string} [options.combineWith='OR'] - How to combine term queries (it can be 'OR' or 'AND')
  * @param {function(query: string): Array<string>} [options.tokenize] - Function used to tokenize the search query. It defaults to the same tokenizer used for indexing.
  * @param {function(term: string): string|null|undefined|false} [options.processTerm] - Function used to process each search term. Return a falsy value to discard a term. Defaults to the same function used to process terms upon indexing.
  * @return {Array<{ id: any, score: number, match: Object }>} A sorted array of scored document IDs matching the search
  *
  * @example
  * // Search for "zen art motorcycle" with default options: terms have to match
  * // exactly, and individual terms are joined with OR
  * miniSearch.search('zen art motorcycle')
  * // => [ { id: 2, score: 2.77258, match: { ... } }, { id: 4, score: 1.38629, match: { ... } } ]
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
  * miniSearch.search('moto neuro', { prefix: true })
  *
  * @example
  * // Search for "ismael" with fuzzy search (it will match documents containing
  * // terms similar to "ismael", with a maximum edit distance of 0.2 term.length
  * // (rounded to nearest integer)
  * miniSearch.search('ismael', { fuzzy: 0.2 })
  *
  * @example
  * // Mix of exact match, prefix search, and fuzzy search
  * miniSearch.search('ismael mob', {
  *  prefix: true,
  *  fuzzy: 0.2
  * })
  *
  * @example
  * // Perform fuzzy and prefix search depending on the search term. Here
  * // performing prefix and fuzzy search only on terms longer than 3 characters
  * miniSearch.search('ismael mob', {
  *  prefix: term => term.length > 3
  *  fuzzy: term => term.length > 3 ? 0.2 : null
  * })
  *
  * @example
  * // Combine search terms with AND (to match only documents that contain both
  * // "motorcycle" and "art")
  * miniSearch.search('motorcycle art', { combineWith: 'AND' })
  */
  search (queryString, options = {}) {
    const { tokenize, processTerm, searchOptions } = this._options
    options = { tokenize, processTerm, ...searchOptions, ...options }
    const { tokenize: searchTokenize, processTerm: searchProcessTerm } = options
    const queries = searchTokenize(queryString)
      .map((term) => searchProcessTerm(term))
      .filter(isTruthy)
      .map(termToQuery(options))
    const results = queries.map(query => this.executeQuery(query, options))
    const combinedResults = this.combineResults(results, options.combineWith)

    return Object.entries(combinedResults)
      .map(([docId, { score, match, terms }]) => ({ id: this._documentIds[docId], terms: uniq(terms), score, match }))
      .sort(({ score: a }, { score: b }) => a < b ? 1 : -1)
  }

  /**
  * Provide suggestions for the given search query
  *
  * The result is a list of suggested modified search queries, derived from the
  * given search query, each with a relevance score, sorted by descending score.
  *
  * @param {string} queryString - Query string to be expanded into suggestions
  * @param {Object} [options] - Search options. The supported options and default values are the same as for the `search` method, except that `options.fuzzy` defaults to `true`.
  * @return {Array<{ suggestion: string, score: number }>} A sorted array of suggestions sorted by relevance score.
  *
  * @example
  * // Get suggestions for 'neuro':
  * miniSearch.autoSuggest('neuro')
  * // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 0.46240 } ]
  *
  * @example
  * // Get suggestions for 'zen ar':
  * miniSearch.autoSuggest('zen ar')
  * // => [ { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
  * //      { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 } ]
  *
  * @example
  * // Correct spelling mistakes using fuzzy search:
  * miniSearch.autoSuggest('neromancer', { fuzzy: 0.2 })
  * // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 1.03998 } ]
  */
  autoSuggest (queryString, options = {}) {
    options = { ...defaultAutoSuggestOptions, ...options }
    const suggestions = this.search(queryString, options).reduce((suggestions, { score, terms }) => {
      const phrase = terms.join(' ')
      if (suggestions[phrase] == null) {
        suggestions[phrase] = { score, terms, count: 1 }
      } else {
        suggestions[phrase].score += score
        suggestions[phrase].count += 1
      }
      return suggestions
    }, {})
    return Object.entries(suggestions)
      .map(([suggestion, { score, terms, count }]) => ({ suggestion, terms, score: score / count }))
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
  * Deserializes a JSON index (serialized with `miniSearch.toJSON()`) and
  * instantiates a MiniSearch instance. It should be given the same options
  * originally used when serializing the index.
  *
  * **Warning:** JSON (de)serialization of the index is currently tightly
  * coupled to the index implementation. For this reason, the current
  * implementation is to be considered a _beta_ feature, subject to breaking
  * changes changes in future releases. If a breaking change is introduced,
  * though, it will be properly reported in the changelog.
  *
  * @param {string} json - JSON-serialized index
  * @param {Object} options - configuration options, same as the constructor
  * @return {MiniSearch} an instance of MiniSearch
  */
  static loadJSON (json, options = {}) {
    return MiniSearch.loadJS(JSON.parse(json), options)
  }

  /**
  * Get the default value of an option. It will throw an error if no option with
  * the given name exists.
  *
  * @param {string} optionName - name of the option
  * @return {*} the default value of the given option
  *
  * @example
  * // Get default tokenizer
  * MiniSearch.getDefault('tokenize')
  *
  * @example
  * // Get default term processor
  * MiniSearch.getDefault('processTerm')
  *
  * @example
  * // Unknown options will throw an error
  * MiniSearch.getDefault('notExisting')
  * // => throws 'MiniSearch: unknown option "notExisting"'
  */
  static getDefault (optionName) {
    const validKeys = Object.keys(defaultOptions)
    if (validKeys.includes(optionName)) {
      return defaultOptions[optionName]
    } else {
      throw new Error(`MiniSearch: unknown option "${optionName}"`)
    }
  }

  /**
  * @private
  */
  static loadJS (js, options = {}) {
    const {
      index: { _tree, _prefix },
      documentCount,
      nextId,
      documentIds,
      fieldIds,
      fieldLength,
      averageFieldLength
    } = js
    const miniSearch = new MiniSearch(options)
    miniSearch._index = new SearchableMap(_tree, _prefix)
    miniSearch._documentCount = documentCount
    miniSearch._nextId = nextId
    miniSearch._documentIds = documentIds
    miniSearch._fieldIds = fieldIds
    miniSearch._fieldLength = fieldLength
    miniSearch._averageFieldLength = averageFieldLength
    miniSearch._fieldIds = fieldIds
    return miniSearch
  }

  /**
  * @private
  * @ignore
  */
  executeQuery (query, options = {}) {
    options = { ...this._options.searchOptions, ...options }

    const boosts = (options.fields || this._options.fields).reduce((boosts, field) =>
      ({ ...boosts, [field]: boosts[field] || 1 }), options.boost || {})

    const {
      boostDocument,
      weights: { fuzzy: fuzzyWeight = 0.9, prefix: prefixWeight = 0.75 }
    } = options

    const exactMatch = termResults(this, query.term, boosts, boostDocument, this._index.get(query.term))

    if (!query.fuzzy && !query.prefix) { return exactMatch }

    const results = [exactMatch]

    if (query.prefix) {
      this._index.atPrefix(query.term).forEach((term, data) => {
        const weightedDistance = (0.3 * (term.length - query.term.length)) / term.length
        results.push(termResults(this, term, boosts, boostDocument, data, prefixWeight, weightedDistance))
      })
    }

    if (query.fuzzy) {
      const maxDistance = query.fuzzy < 1 ? Math.round(query.term.length * query.fuzzy) : query.fuzzy
      Object.entries(this._index.fuzzyGet(query.term, maxDistance)).forEach(([term, [data, distance]]) => {
        const weightedDistance = distance / term.length
        results.push(termResults(this, term, boosts, boostDocument, data, fuzzyWeight, weightedDistance))
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
  * Allows serialization of the index to JSON, to possibly store it and later
  * deserialize it with MiniSearch.fromJSON
  *
  * **Warning:** JSON (de)serialization of the index is currently tightly
  * coupled to the index implementation. For this reason, the current
  * implementation is to be considered a _beta_ feature, subject to breaking
  * changes changes in future releases. If a breaking change is introduced,
  * though, it will be reported in the changelog.
  *
  * @return {Object} the serializeable representation of the search index
  */
  toJSON () {
    return {
      index: this._index,
      documentCount: this._documentCount,
      nextId: this._nextId,
      documentIds: this._documentIds,
      fieldIds: this._fieldIds,
      fieldLength: this._fieldLength,
      averageFieldLength: this._averageFieldLength
    }
  }
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

const removeTerm = function (self, fieldId, documentId, term) {
  if (!self._index.has(term)) {
    warnDocumentChanged(self, documentId, fieldId, term)
    return
  }
  self._index.update(term, indexData => {
    const fieldIndex = indexData[fieldId]
    if (fieldIndex == null || fieldIndex.ds[documentId] == null) {
      warnDocumentChanged(self, documentId, fieldId, term)
      return indexData
    }
    if (fieldIndex.ds[documentId] <= 1) {
      if (fieldIndex.df <= 1) {
        delete indexData[fieldId]
        return indexData
      }
      fieldIndex.df -= 1
    }
    if (fieldIndex.ds[documentId] <= 1) {
      delete fieldIndex.ds[documentId]
      return indexData
    }
    fieldIndex.ds[documentId] -= 1
    return { ...indexData, [fieldId]: fieldIndex }
  })
  if (Object.keys(self._index.get(term)).length === 0) {
    self._index.delete(term)
  }
}

const warnDocumentChanged = function (self, shortDocumentId, fieldId, term) {
  if (console == null || console.warn == null) { return }
  const fieldName = Object.entries(self._fieldIds).find(([name, id]) => id === fieldId)[0]
  console.warn(`MiniSearch: document with ID ${self._documentIds[shortDocumentId]} has changed before removal: term "${term}" was not present in field "${fieldName}". Removing a document after it has changed can corrupt the index!`)
}

const addDocumentId = function (self, documentId) {
  const shortDocumentId = self._nextId.toString(36)
  self._documentIds[shortDocumentId] = documentId
  self._documentCount += 1
  self._nextId += 1
  return shortDocumentId
}

const addFields = function (self, fields) {
  fields.forEach((field, i) => { self._fieldIds[field] = i })
}

const termResults = function (self, term, boosts, boostDocument, indexData, weight = 1, editDistance = 0) {
  if (indexData == null) { return {} }
  return Object.entries(boosts).reduce((results, [field, boost]) => {
    const fieldId = self._fieldIds[field]
    const { df, ds } = indexData[fieldId] || { ds: {} }
    Object.entries(ds).forEach(([documentId, tf]) => {
      const docBoost = boostDocument ? boostDocument(self._documentIds[documentId], term) : 1
      if (!docBoost) { return }
      const normalizedLength = self._fieldLength[documentId][fieldId] / self._averageFieldLength[fieldId]
      results[documentId] = results[documentId] || { score: 0, match: {}, terms: [] }
      results[documentId].terms.push(term)
      results[documentId].match[term] = results[documentId].match[term] || []
      results[documentId].score += docBoost * score(tf, df, self._documentCount, normalizedLength, boost, editDistance)
      results[documentId].match[term].push(field)
    })
    return results
  }, {})
}

const addFieldLength = function (self, documentId, fieldId, count, length) {
  self._averageFieldLength[fieldId] = self._averageFieldLength[fieldId] || 0
  const totalLength = (self._averageFieldLength[fieldId] * count) + length
  self._fieldLength[documentId] = self._fieldLength[documentId] || {}
  self._fieldLength[documentId][fieldId] = length
  self._averageFieldLength[fieldId] = totalLength / (count + 1)
}

const combinators = {
  [OR]: function (a, b) {
    return Object.entries(b).reduce((combined, [documentId, { score, match, terms }]) => {
      if (combined[documentId] == null) {
        combined[documentId] = { score, match, terms }
      } else {
        combined[documentId].score += score
        combined[documentId].score *= 1.5
        combined[documentId].terms = [...combined[documentId].terms, ...terms]
        Object.assign(combined[documentId].match, match)
      }
      return combined
    }, a || {})
  },
  [AND]: function (a, b) {
    if (a == null) { return b }
    return Object.entries(b).reduce((combined, [documentId, { score, match, terms }]) => {
      if (a[documentId] === undefined) { return combined }
      combined[documentId] = combined[documentId] || {}
      combined[documentId].score = a[documentId].score + score
      combined[documentId].match = { ...a[documentId].match, ...match }
      combined[documentId].terms = [...a[documentId].terms, ...terms]
      return combined
    }, {})
  }
}

const tfIdf = function (tf, df, n) {
  return tf * Math.log(n / df)
}

const score = function (termFrequency, documentFrequency, documentCount, normalizedLength, boost, editDistance) {
  const weight = boost / (1 + (0.333 * boost * editDistance))
  return weight * tfIdf(termFrequency, documentFrequency, documentCount) / normalizedLength
}

const termToQuery = (options) => (term, i, terms) => {
  const fuzzy = (typeof options.fuzzy === 'function')
    ? options.fuzzy(term, i, terms)
    : options.fuzzy
  const prefix = (typeof options.prefix === 'function')
    ? options.prefix(term, i, terms)
    : options.prefix
  return { term, fuzzy, prefix }
}

const uniq = function (array) {
  return array.filter((element, i, array) => array.indexOf(element) === i)
}

const isTruthy = (x) => !!x

const defaultOptions = {
  idField: 'id',
  tokenize: (string, _fieldName) => string.split(/[^a-zA-Z0-9\u00C0-\u017F]+/),
  processTerm: (term, _fieldName) => term.length > 1 && term.toLowerCase(),
  fields: undefined,
  searchOptions: undefined
}

const defaultSearchOptions = {
  combineWith: OR,
  prefix: false,
  fuzzy: false,
  weights: {}
}

const defaultAutoSuggestOptions = {
  prefix: true
}

export default MiniSearch
