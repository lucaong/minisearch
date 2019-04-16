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
  * @param {function(document: Object, fieldName: string): string} [options.extractField] - Function used to get the value of a field in a document
  * @param {function(text: string, [fieldName]: string): Array<string>} [options.tokenize] - Function used to split a field into individual terms
  * @param {function(term: string, [fieldName]: string): string} [options.processTerm] - Function used to process a term before indexing it or searching
  * @param {Object} [options.searchOptions] - Default search options (see the `search` method for details)
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
  *   // extractField: function used to get the value of a field in a document.
  *   // By default, it assumes the document is a flat object with field names as
  *   // property keys and field values as string property values, but custom logic
  *   // can be implemented by setting this option to a custom extractor function.
  *   extractField: (document, fieldName) => document[fieldName],
  *
  *   // tokenize: function used to split fields into individual terms. By
  *   // default, it is also used to tokenize search queries, unless a specific
  *   // `tokenize` search option is supplied. When tokenizing an indexed field,
  *   // the field name is passed as the second argument.
  *   tokenize: (string, _fieldName) => string.split(/[^a-zA-Z0-9\u00C0-\u017F]+/),
  *
  *   // processTerm: function used to process each tokenized term before
  *   // indexing. It can be used for stemming and normalization. Return a falsy
  *   // value in order to discard a term. By default, it is also used to process
  *   // search queries, unless a specific `processTerm` option is supplied as a
  *   // search option. When processing a term from a indexed field, the field
  *   // name is passed as the second argument.
  *   processTerm: (term, _fieldName) => term.length > 1 && term.toLowerCase(),
  *
  *   // searchOptions: default search options, see the `search` method for
  *   // details
  *   searchOptions: undefined,
  *
  *   // fields: document fields to be indexed. Mandatory, but not set by default
  *   fields: undefined
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
    const { extractField, tokenize, processTerm, fields, idField } = this._options
    if (document[idField] == null) {
      throw new Error(`MiniSearch: document does not have ID field "${idField}"`)
    }
    const shortDocumentId = addDocumentId(this, document[idField])
    fields.forEach(field => {
      const tokens = tokenize(extractField(document, field) || '', field)
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
  extractField: (document, fieldName) => document[fieldName],
  tokenize: (string, _fieldName) => string.split(NON_WORD_CHARS),
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

// This regular expression matches any non alphanumeric character. It does what
// [^0-9a-zA-Z]+ does, but supporting Unicode in general and not just ASCII.
const NON_WORD_CHARS = /[^0-9A-Za-z\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u0660-\u0669\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07C0-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0966-\u096F\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09E6-\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A66-\u0A6F\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AE6-\u0AEF\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B66-\u0B6F\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0BE6-\u0BEF\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C66-\u0C6F\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CE6-\u0CEF\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D66-\u0D6F\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DE6-\u0DEF\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F20-\u0F29\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F-\u1049\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u1090-\u1099\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u17E0-\u17E9\u1810-\u1819\u1820-\u1878\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A16\u1A20-\u1A54\u1A80-\u1A89\u1A90-\u1A99\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B50-\u1B59\u1B83-\u1BA0\u1BAE-\u1BE5\u1C00-\u1C23\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEF\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7C6\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8D0-\uA8D9\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA900-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF-\uA9D9\uA9E0-\uA9E4\uA9E6-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB67\uAB70-\uABE2\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]+/u

export default MiniSearch
