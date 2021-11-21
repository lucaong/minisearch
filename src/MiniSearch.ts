import SearchableMap from './SearchableMap/SearchableMap'

const OR = 'or'
const AND = 'and'
const AND_NOT = 'and_not'

/**
 * Search options to customize the search behavior.
 */
export type SearchOptions = {
  /**
   * Names of the fields to search in. If omitted, all fields are searched.
   */
  fields?: string[],

  /**
   * Function used to filter search results, for example on the basis of stored
   * fields. It takes as argument each search result and should return a boolean
   * to indicate if the result should be kept or not.
   */
  filter?: (result: SearchResult) => boolean,

  /**
   * Key-value object of field names to boosting values. By default, fields are
   * assigned a boosting factor of 1. If one assigns to a field a boosting value
   * of 2, a result that matches the query in that field is assigned a score
   * twice as high as a result matching the query in another field, all else
   * being equal.
   */
  boost?: { [fieldName: string]: number },

  /**
   * Relative weights to assign to prefix search results and fuzzy search
   * results. Exact matches are assigned a weight of 1.
   */
  weights?: { fuzzy: number, prefix: number },

  /**
   * Function to calculate a boost factor for documents. It takes as arguments
   * the document ID, and a term that matches the search in that document, and
   * should return a boosting factor.
   */
  boostDocument?: (documentId: any, term: string) => number,

  /**
   * Controls whether to perform prefix search. It can be a simple boolean, or a
   * function.
   *
   * If a boolean is passed, prefix search is performed if true.
   *
   * If a function is passed, it is called upon search with a search term, the
   * positional index of that search term in the tokenized search query, and the
   * tokenized search query. The function should return a boolean to indicate
   * whether to perform prefix search for that search term.
   */
  prefix?: boolean | ((term: string, index: number, terms: string[]) => boolean),

  /**
   * Controls whether to perform fuzzy search. It can be a simple boolean, or a
   * number, or a function.
   *
   * If a boolean is given, fuzzy search with a default fuzziness parameter is
   * performed if true.
   *
   * If a number higher or equal to 1 is given, fuzzy search is performed, with
   * a mazimum edit distance (Levenshtein) equal to the number.
   *
   * If a number between 0 and 1 is given, fuzzy search is performed within a
   * maximum edit distance corresponding to that fraction of the term length,
   * approximated to the nearest integer. For example, 0.2 would mean an edit
   * distance of 20% of the term length, so 1 character in a 5-characters term.
   *
   * If a function is passed, the function is called upon search with a search
   * term, a positional index of that term in the tokenized search query, and
   * the tokenized search query. It should return a boolean or a number, with
   * the meaning documented above.
   */
  fuzzy?: boolean | number | ((term: string, index: number, terms: string[]) => boolean | number),

  /**
   * The operand to combine partial results for each term. By default it is
   * "OR", so results matching _any_ of the search terms are returned by a
   * search. If "AND" is given, only results matching _all_ the search terms are
   * returned by a search.
   */
  combineWith?: string,

  /**
   * Function to tokenize the search query. By default, the same tokenizer used
   * for indexing is used also for search.
   */
  tokenize?: (text: string) => string[],

  /**
   * Function to process or normalize terms in the search query. By default, the
   * same term processor used for indexing is used also for search.
   */
  processTerm?: (term: string) => string | null | undefined | false
}

type SearchOptionsWithDefaults = SearchOptions & {
  boost: { [fieldName: string]: number },

  weights: { fuzzy: number, prefix: number },

  prefix: boolean | ((term: string, index: number, terms: string[]) => boolean),

  fuzzy: boolean | number | ((term: string, index: number, terms: string[]) => boolean | number),

  combineWith: string
}

/**
 * Configuration options passed to the [[MiniSearch]] constructor
 *
 * @typeParam T  The type of documents being indexed.
 */
export type Options<T = any> = {
   /**
    * Names of the document fields to be indexed.
    */
  fields: string[],

   /**
    * Name of the ID field, uniquely identifying a document.
    */
  idField?: string,

   /**
    * Names of fields to store, so that search results would include them. By
    * default none, so resuts would only contain the id field.
    */
  storeFields?: string[],

   /**
    * Function used to extract the value of each field in documents. By default,
    * the documents are assumed to be plain objects with field names as keys,
    * but by specifying a custom `extractField` function one can completely
    * customize how the fields are extracted.
    *
    * The function takes as arguments the document, and the name of the field to
    * extract from it. It should return the field value as a string.
    */
  extractField?: (document: T, fieldName: string) => string,

   /*
    * Function used to split a field value into individual terms to be indexed.
    * The default tokenizer separates terms by space or punctuation, but a
    * custom tokenizer can be provided for custom logic.
    *
    * The function takes as arguments string to tokenize, and the name of the
    * field it comes from. It should return the terms as an array of strings.
    * When used for tokenizing a search query instead of a document field, the
    * `fieldName` is undefined.
    */
  tokenize?: (text: string, fieldName?: string) => string[],

   /**
    * Function used to process a term before indexing or search. This can be
    * used for normalization (such as stemming). By default, terms are
    * downcased, and otherwise no other normalization is performed.
    *
    * The function takes as arguments a term to process, and the name of the
    * field it comes from. It should return the processed term as a string, or a
    * falsy value to reject the term entirely.
    */
  processTerm?: (term: string, fieldName?: string) => string | null | undefined | false,

   /**
    * Default search options (see the [[SearchOptions]] type and the
    * [[MiniSearch.search]] method for details)
    */
  searchOptions?: SearchOptions
}

type OptionsWithDefaults<T = any> = Options<T> & {
  storeFields: string[],

  idField: string,

  extractField: (document: T, fieldName: string) => string,

  tokenize: (text: string, fieldName: string) => string[],

  processTerm: (term: string, fieldName: string) => string | null | undefined | false,

  searchOptions: SearchOptionsWithDefaults
}

/**
 * The type of auto-suggestions
 */
export type Suggestion = {
  /**
   * The suggestion
   */
  suggestion: string,

  /**
   * Suggestion as an array of terms
   */
  terms: string[],

  /**
   * Score for the suggestion
   */
  score: number
}

/**
 * Match information for a search result. It is a key-value object where keys
 * are terms that matched, and values are the list of fields that the term was
 * found in.
 */
export type MatchInfo = {
  [term: string]: string[]
}

/**
 * Type of the search results. Each search result indicates the document ID, the
 * terms that matched, the match information, the score, and all the stored
 * fields.
 */
export type SearchResult = {
  /**
   * The document ID
   */
  id: any,

  /**
   * List of terms that matched
   */
  terms: string[],

  /**
   * Score of the search results
   */
  score: number,

  /**
   * Match information, see [[MatchInfo]]
   */
  match: MatchInfo,

  /**
   * Stored fields
   */
  [key: string]: any
}

/**
 * @ignore
 */
export type AsPlainObject = {
  index: { _tree: {}, _prefix: string },
  documentCount: number,
  nextId: number,
  documentIds: { [shortId: string]: any }
  fieldIds: { [fieldName: string]: number }
  fieldLength: { [shortId: string]: { [fieldId: string]: number } },
  averageFieldLength: { [fieldId: string]: number },
  storedFields: { [shortId: string]: any }
}

export type QueryCombination = SearchOptions & { queries: Query[] }

/**
 * Search query expression, either a query string or an expression tree
 * combining several queries with a combination of AND or OR.
 */
export type Query = QueryCombination | string

type QuerySpec = {
  prefix: boolean,
  fuzzy: number | boolean,
  term: string
}

type IndexData = {
  [fieldId: string]: { df: number, ds: { [shortId: string]: number } }
}

type RawResult = {
  [shortId: string]: { score: number, match: MatchInfo, terms: string[] }
}

/**
 * [[MiniSearch]] is the main entrypoint class, implementing a full-text search
 * engine in memory.
 *
 * @typeParam T  The type of the documents being indexed.
 *
 * ### Basic example:
 *
 * ```javascript
 * const documents = [
 *   {
 *     id: 1,
 *     title: 'Moby Dick',
 *     text: 'Call me Ishmael. Some years ago...',
 *     category: 'fiction'
 *   },
 *   {
 *     id: 2,
 *     title: 'Zen and the Art of Motorcycle Maintenance',
 *     text: 'I can see by my watch...',
 *     category: 'fiction'
 *   },
 *   {
 *     id: 3,
 *     title: 'Neuromancer',
 *     text: 'The sky above the port was...',
 *     category: 'fiction'
 *   },
 *   {
 *     id: 4,
 *     title: 'Zen and the Art of Archery',
 *     text: 'At first sight it must seem...',
 *     category: 'non-fiction'
 *   },
 *   // ...and more
 * ]
 *
 * // Create a search engine that indexes the 'title' and 'text' fields for
 * // full-text search. Search results will include 'title' and 'category' (plus the
 * // id field, that is always stored and returned)
 * const miniSearch = new MiniSearch({
 *   fields: ['title', 'text'],
 *   storeFields: ['title', 'category']
 * })
 *
 * // Add documents to the index
 * miniSearch.addAll(documents)
 *
 * // Search for documents:
 * let results = miniSearch.search('zen art motorcycle')
 * // => [
 * //   { id: 2, title: 'Zen and the Art of Motorcycle Maintenance', category: 'fiction', score: 2.77258 },
 * //   { id: 4, title: 'Zen and the Art of Archery', category: 'non-fiction', score: 1.38629 }
 * // ]
 * ```
 */
export default class MiniSearch<T = any> {
  protected _options: OptionsWithDefaults<T>
  protected _index: SearchableMap
  protected _documentCount: number
  protected _documentIds: { [shortId: string]: any }
  protected _fieldIds: { [fieldName: string]: number }
  protected _fieldLength: { [shortId: string]: { [fieldId: string]: number } }
  protected _averageFieldLength: { [fieldId: string]: number }
  protected _nextId: number
  protected _storedFields: { [shortId: string]: any }

  /**
   * @param options  Configuration options
   *
   * ### Examples:
   *
   * ```javascript
   * // Create a search engine that indexes the 'title' and 'text' fields of your
   * // documents:
   * const miniSearch = new MiniSearch({ fields: ['title', 'text'] })
   * ```
   *
   * ### ID Field:
   *
   * ```javascript
   * // Your documents are assumed to include a unique 'id' field, but if you want
   * // to use a different field for document identification, you can set the
   * // 'idField' option:
   * const miniSearch = new MiniSearch({ idField: 'key', fields: ['title', 'text'] })
   * ```
   *
   * ### Options and defaults:
   *
   * ```javascript
   * // The full set of options (here with their default value) is:
   * const miniSearch = new MiniSearch({
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
   *   tokenize: (string, _fieldName) => string.split(SPACE_OR_PUNCTUATION),
   *
   *   // processTerm: function used to process each tokenized term before
   *   // indexing. It can be used for stemming and normalization. Return a falsy
   *   // value in order to discard a term. By default, it is also used to process
   *   // search queries, unless a specific `processTerm` option is supplied as a
   *   // search option. When processing a term from a indexed field, the field
   *   // name is passed as the second argument.
   *   processTerm: (term, _fieldName) => term.toLowerCase(),
   *
   *   // searchOptions: default search options, see the `search` method for
   *   // details
   *   searchOptions: undefined,
   *
   *   // fields: document fields to be indexed. Mandatory, but not set by default
   *   fields: undefined
   *
   *   // storeFields: document fields to be stored and returned as part of the
   *   // search results.
   *   storeFields: []
   * })
   * ```
   */
  constructor (options: Options<T>) {
    if (options?.fields == null) {
      throw new Error('MiniSearch: option "fields" must be provided')
    }

    this._options = {
      ...defaultOptions,
      ...options,
      searchOptions: { ...defaultSearchOptions, ...(options.searchOptions || {}) }
    }

    this._index = new SearchableMap()

    this._documentCount = 0

    this._documentIds = {}

    this._fieldIds = {}

    this._fieldLength = {}

    this._averageFieldLength = {}

    this._nextId = 0

    this._storedFields = {}

    this.addFields(this._options.fields)
  }

  /**
   * Adds a document to the index
   *
   * @param document  The document to be indexed
   */
  add (document: T): void {
    const { extractField, tokenize, processTerm, fields, idField } = this._options
    const id = extractField(document, idField)
    if (id == null) {
      throw new Error(`MiniSearch: document does not have ID field "${idField}"`)
    }
    const shortDocumentId = this.addDocumentId(id)
    this.saveStoredFields(shortDocumentId, document)

    fields.forEach(field => {
      const fieldValue = extractField(document, field)
      if (fieldValue == null) { return }

      const tokens = tokenize(fieldValue.toString(), field)

      this.addFieldLength(shortDocumentId, this._fieldIds[field], this.documentCount - 1, tokens.length)

      tokens.forEach(term => {
        const processedTerm = processTerm(term, field)
        if (processedTerm) {
          this.addTerm(this._fieldIds[field], shortDocumentId, processedTerm)
        }
      })
    })
  }

  /**
   * Adds all the given documents to the index
   *
   * @param documents  An array of documents to be indexed
   */
  addAll (documents: T[]): void {
    documents.forEach(document => this.add(document))
  }

  /**
   * Adds all the given documents to the index asynchronously.
   *
   * Returns a promise that resolves (to `undefined`) when the indexing is done.
   * This method is useful when index many documents, to avoid blocking the main
   * thread. The indexing is performed asynchronously and in chunks.
   *
   * @param documents  An array of documents to be indexed
   * @param options  Configuration options
   * @return A promise resolving to `undefined` when the indexing is done
   */
  addAllAsync (documents: T[], options: { chunkSize?: number } = {}): Promise<void> {
    const { chunkSize = 10 } = options
    const acc: { chunk: T[], promise: Promise<void> } = { chunk: [], promise: Promise.resolve() }

    const { chunk, promise } = documents.reduce(({ chunk, promise }, document: T, i: number) => {
      chunk.push(document)
      if ((i + 1) % chunkSize === 0) {
        return {
          chunk: [],
          promise: promise
            .then(() => new Promise(resolve => setTimeout(resolve, 0)))
            .then(() => this.addAll(chunk))
        }
      } else {
        return { chunk, promise }
      }
    }, acc)

    return promise.then(() => this.addAll(chunk))
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
   * @param document  The document to be removed
   */
  remove (document: T): void {
    const { tokenize, processTerm, extractField, fields, idField } = this._options
    const id = extractField(document, idField)

    if (id == null) {
      throw new Error(`MiniSearch: document does not have ID field "${idField}"`)
    }

    const [shortDocumentId] = Object.entries(this._documentIds)
      .find(([_, longId]) => id === longId) || []

    if (shortDocumentId == null) {
      throw new Error(`MiniSearch: cannot remove document with ID ${id}: it is not in the index`)
    }

    fields.forEach(field => {
      const fieldValue = extractField(document, field)
      if (fieldValue == null) { return }

      const tokens = tokenize(fieldValue.toString(), field)

      tokens.forEach(term => {
        const processedTerm = processTerm(term, field)
        if (processedTerm) {
          this.removeTerm(this._fieldIds[field], shortDocumentId, processedTerm)
        }
      })

      this.removeFieldLength(shortDocumentId, this._fieldIds[field], this.documentCount, tokens.length)
    })

    delete this._storedFields[shortDocumentId]
    delete this._documentIds[shortDocumentId]
    delete this._fieldLength[shortDocumentId]
    this._documentCount -= 1
  }

  /**
   * Removes all the given documents from the index. If called with no arguments,
   * it removes _all_ documents from the index.
   *
   * @param documents  The documents to be removed. If this argument is omitted,
   * all documents are removed. Note that, for removing all documents, it is
   * more efficient to call this method with no arguments than to pass all
   * documents.
   */
  removeAll (documents?: T[]): void {
    if (documents) {
      documents.forEach(document => this.remove(document))
    } else if (arguments.length > 0) {
      throw new Error('Expected documents to be present. Omit the argument to remove all documents.')
    } else {
      this._index = new SearchableMap()
      this._documentCount = 0
      this._documentIds = {}
      this._fieldLength = {}
      this._averageFieldLength = {}
      this._storedFields = {}
      this._nextId = 0
    }
  }

  /**
   * Search for documents matching the given search query.
   *
   * The result is a list of scored document IDs matching the query, sorted by
   * descending score, and each including data about which terms were matched and
   * in which fields.
   *
   * ### Basic usage:
   *
   * ```javascript
   * // Search for "zen art motorcycle" with default options: terms have to match
   * // exactly, and individual terms are joined with OR
   * miniSearch.search('zen art motorcycle')
   * // => [ { id: 2, score: 2.77258, match: { ... } }, { id: 4, score: 1.38629, match: { ... } } ]
   * ```
   *
   * ### Restrict search to specific fields:
   *
   * ```javascript
   * // Search only in the 'title' field
   * miniSearch.search('zen', { fields: ['title'] })
   * ```
   *
   * ### Field boosting:
   *
   * ```javascript
   * // Boost a field
   * miniSearch.search('zen', { boost: { title: 2 } })
   * ```
   *
   * ### Prefix search:
   *
   * ```javascript
   * // Search for "moto" with prefix search (it will match documents
   * // containing terms that start with "moto" or "neuro")
   * miniSearch.search('moto neuro', { prefix: true })
   * ```
   *
   * ### Fuzzy search:
   *
   * ```javascript
   * // Search for "ismael" with fuzzy search (it will match documents containing
   * // terms similar to "ismael", with a maximum edit distance of 0.2 term.length
   * // (rounded to nearest integer)
   * miniSearch.search('ismael', { fuzzy: 0.2 })
   * ```
   *
   * ### Combining strategies:
   *
   * ```javascript
   * // Mix of exact match, prefix search, and fuzzy search
   * miniSearch.search('ismael mob', {
   *  prefix: true,
   *  fuzzy: 0.2
   * })
   * ```
   *
   * ### Advanced prefix and fuzzy search:
   *
   * ```javascript
   * // Perform fuzzy and prefix search depending on the search term. Here
   * // performing prefix and fuzzy search only on terms longer than 3 characters
   * miniSearch.search('ismael mob', {
   *  prefix: term => term.length > 3
   *  fuzzy: term => term.length > 3 ? 0.2 : null
   * })
   * ```
   *
   * ### Combine with AND:
   *
   * ```javascript
   * // Combine search terms with AND (to match only documents that contain both
   * // "motorcycle" and "art")
   * miniSearch.search('motorcycle art', { combineWith: 'AND' })
   * ```
   *
   * ### Combine with AND_NOT:
   *
   * There is also an AND_NOT combinator, that finds documents that match the
   * first term, but do not match any of the other terms. This combinator is
   * rarely useful with simple queries, and is meant to be used with advanced
   * query combinations (see later for more details).
   *
   * ### Filtering results:
   *
   * ```javascript
   * // Filter only results in the 'fiction' category (assuming that 'category'
   * // is a stored field)
   * miniSearch.search('motorcycle art', {
   *   filter: (result) => result.category === 'fiction'
   * })
   * ```
   *
   * ### Advanced combination of queries:
   *
   * It is possible to combine different subqueries with OR, AND, and AND_NOT,
   * and even with different search options, by passing a query expression
   * tree object as the first argument, instead of a string.
   *
   * ```javascript
   * // Search for documents that contain "zen" and ("motorcycle" or "archery")
   * miniSearch.search({
   *   combineWith: 'AND',
   *   queries: [
   *     'zen',
   *     {
   *       combineWith: 'OR',
   *       queries: ['motorcycle', 'archery']
   *     }
   *   ]
   * })
   *
   * // Search for documents that contain ("apple" or "pear") but not "juice" and
   * // not "tree"
   * miniSearch.search({
   *   combineWith: 'AND_NOT',
   *   queries: [
   *     {
   *       combineWith: 'OR',
   *       queries: ['apple', 'pear']
   *     },
   *     'juice',
   *     'tree'
   *   ]
   * })
   * ```
   *
   * Each node in the expression tree can be either a string, or an object that
   * supports all `SearchOptions` fields, plus a `queries` array field for
   * subqueries.
   *
   * Note that, while this can become complicated to do by hand for complex or
   * deeply nested queries, it provides a formalized expression tree API for
   * external libraries that implement a parser for custom query languages.
   *
   * @param query  Search query
   * @param options  Search options. Each option, if not given, defaults to the corresponding value of `searchOptions` given to the constructor, or to the library default.
   */
  search (query: Query, searchOptions: SearchOptions = {}): SearchResult[] {
    const combinedResults = this.executeQuery(query, searchOptions)

    return Object.entries(combinedResults)
      .reduce((results: SearchResult[], [docId, { score, match, terms }]) => {
        const result = {
          id: this._documentIds[docId],
          terms: uniq(terms),
          score,
          match
        }
        Object.assign(result, this._storedFields[docId])
        if (searchOptions.filter == null || searchOptions.filter(result)) {
          results.push(result)
        }
        return results
      }, [])
      .sort(({ score: a }, { score: b }) => a < b ? 1 : -1)
  }

  /**
   * Provide suggestions for the given search query
   *
   * The result is a list of suggested modified search queries, derived from the
   * given search query, each with a relevance score, sorted by descending score.
   *
   * ### Basic usage:
   *
   * ```javascript
   * // Get suggestions for 'neuro':
   * miniSearch.autoSuggest('neuro')
   * // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 0.46240 } ]
   * ```
   *
   * ### Multiple words:
   *
   * ```javascript
   * // Get suggestions for 'zen ar':
   * miniSearch.autoSuggest('zen ar')
   * // => [
   * //  { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
   * //  { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 }
   * // ]
   * ```
   *
   * ### Fuzzy suggestions:
   *
   * ```javascript
   * // Correct spelling mistakes using fuzzy search:
   * miniSearch.autoSuggest('neromancer', { fuzzy: 0.2 })
   * // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 1.03998 } ]
   * ```
   *
   * ### Filtering:
   *
   * ```javascript
   * // Get suggestions for 'zen ar', but only within the 'fiction' category
   * // (assuming that 'category' is a stored field):
   * miniSearch.autoSuggest('zen ar', {
   *   filter: (result) => result.category === 'fiction'
   * })
   * // => [
   * //  { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
   * //  { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 }
   * // ]
   * ```
   *
   * @param queryString  Query string to be expanded into suggestions
   * @param options  Search options. The supported options and default values
   * are the same as for the `search` method, except that by default prefix
   * search is performed on the last term in the query.
   * @return  A sorted array of suggestions sorted by relevance score.
   */
  autoSuggest (queryString: string, options: SearchOptions = {}): Suggestion[] {
    options = { ...defaultAutoSuggestOptions, ...options }
    const suggestions = this.search(queryString, options).reduce((
      suggestions: { [phrase: string]: Omit<Suggestion, 'suggestion'> & { count: number } },
      { score, terms }
    ) => {
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
   */
  get documentCount (): number {
    return this._documentCount
  }

  /**
   * Deserializes a JSON index (serialized with `miniSearch.toJSON()`) and
   * instantiates a MiniSearch instance. It should be given the same options
   * originally used when serializing the index.
   *
   * ### Usage:
   *
   * ```javascript
   * // If the index was serialized with:
   * let miniSearch = new MiniSearch({ fields: ['title', 'text'] })
   * miniSearch.addAll(documents)
   *
   * const json = JSON.stringify(miniSearch)
   * // It can later be deserialized like this:
   * miniSearch = MiniSearch.loadJSON(json, { fields: ['title', 'text'] })
   * ```
   *
   * @param json  JSON-serialized index
   * @param options  configuration options, same as the constructor
   * @return An instance of MiniSearch deserialized from the given JSON.
   */
  static loadJSON<T = any> (json: string, options: Options<T>): MiniSearch<T> {
    if (options == null) {
      throw new Error('MiniSearch: loadJSON should be given the same options used when serializing the index')
    }
    return MiniSearch.loadJS(JSON.parse(json), options)
  }

  /**
   * Returns the default value of an option. It will throw an error if no option
   * with the given name exists.
   *
   * @param optionName  Name of the option
   * @return The default value of the given option
   *
   * ### Usage:
   *
   * ```javascript
   * // Get default tokenizer
   * MiniSearch.getDefault('tokenize')
   *
   * // Get default term processor
   * MiniSearch.getDefault('processTerm')
   *
   * // Unknown options will throw an error
   * MiniSearch.getDefault('notExisting')
   * // => throws 'MiniSearch: unknown option "notExisting"'
   * ```
   */
  static getDefault (optionName: string): any {
    if (defaultOptions.hasOwnProperty(optionName)) {
      return getOwnProperty(defaultOptions, optionName)
    } else {
      throw new Error(`MiniSearch: unknown option "${optionName}"`)
    }
  }

  /**
   * @ignore
   */
  static loadJS<T = any> (js: AsPlainObject, options: Options<T>): MiniSearch<T> {
    const {
      index,
      documentCount,
      nextId,
      documentIds,
      fieldIds,
      fieldLength,
      averageFieldLength,
      storedFields
    } = js
    const miniSearch = new MiniSearch(options)

    miniSearch._index = new SearchableMap(index._tree, index._prefix)
    miniSearch._documentCount = documentCount
    miniSearch._nextId = nextId
    miniSearch._documentIds = documentIds
    miniSearch._fieldIds = fieldIds
    miniSearch._fieldLength = fieldLength
    miniSearch._averageFieldLength = averageFieldLength
    miniSearch._fieldIds = fieldIds
    miniSearch._storedFields = storedFields || {}

    return miniSearch
  }

  /**
   * @ignore
   */
  private executeQuery (query: Query, searchOptions: SearchOptions = {}): RawResult {
    if (typeof query === 'string') {
      return this.executeSearch(query, searchOptions)
    } else {
      const results = query.queries.map((subquery) => {
        const options = { ...searchOptions, ...query, queries: undefined }
        return this.executeQuery(subquery, options)
      })
      return this.combineResults(results, query.combineWith)
    }
  }

  /**
   * @ignore
   */
  private executeSearch (queryString: string, searchOptions: SearchOptions = {}): RawResult {
    const { tokenize, processTerm, searchOptions: globalSearchOptions } = this._options
    const options = { tokenize, processTerm, ...globalSearchOptions, ...searchOptions }
    const { tokenize: searchTokenize, processTerm: searchProcessTerm } = options
    const terms = searchTokenize(queryString)
      .map((term: string) => searchProcessTerm(term))
      .filter((term) => !!term) as string[]
    const queries: QuerySpec[] = terms.map(termToQuerySpec(options))
    const results = queries.map(query => this.executeQuerySpec(query, options))

    return this.combineResults(results, options.combineWith)
  }

  /**
   * @ignore
   */
  private executeQuerySpec (query: QuerySpec, searchOptions: SearchOptions): RawResult {
    const options: SearchOptionsWithDefaults = { ...this._options.searchOptions, ...searchOptions }

    const boosts = (options.fields || this._options.fields).reduce((boosts, field) =>
      ({ ...boosts, [field]: getOwnProperty(boosts, field) || 1 }), options.boost || {})

    const {
      boostDocument,
      weights
    } = options

    const { fuzzy: fuzzyWeight, prefix: prefixWeight } = { ...defaultSearchOptions.weights, ...weights }

    const exactMatch = this.termResults(query.term, boosts, boostDocument, this._index.get(query.term))

    if (!query.fuzzy && !query.prefix) { return exactMatch }

    const results: RawResult[] = [exactMatch]

    if (query.prefix) {
      this._index.atPrefix(query.term).forEach((term: string, data: {}) => {
        const weightedDistance = (0.3 * (term.length - query.term.length)) / term.length
        results.push(this.termResults(term, boosts, boostDocument, data, prefixWeight, weightedDistance))
      })
    }

    if (query.fuzzy) {
      const fuzzy = (query.fuzzy === true) ? 0.2 : query.fuzzy
      const maxDistance = fuzzy < 1 ? Math.round(query.term.length * fuzzy) : fuzzy

      Object.entries(this._index.fuzzyGet(query.term, maxDistance)).forEach(([term, [data, distance]]) => {
        const weightedDistance = distance / term.length
        results.push(this.termResults(term, boosts, boostDocument, data, fuzzyWeight, weightedDistance))
      })
    }

    return results.reduce(combinators[OR])
  }

  /**
   * @ignore
   */
  private combineResults (results: RawResult[], combineWith = OR): RawResult {
    if (results.length === 0) { return {} }
    const operator = combineWith.toLowerCase()
    return results.reduce(combinators[operator]) || {}
  }

  /**
   * Allows serialization of the index to JSON, to possibly store it and later
   * deserialize it with `MiniSearch.loadJSON`.
   *
   * Normally one does not directly call this method, but rather call the
   * standard JavaScript `JSON.stringify()` passing the `MiniSearch` instance,
   * and JavaScript will internally call this method. Upon deserialization, one
   * must pass to `loadJSON` the same options used to create the original
   * instance that was serialized.
   *
   * ### Usage:
   *
   * ```javascript
   * // Serialize the index:
   * let miniSearch = new MiniSearch({ fields: ['title', 'text'] })
   * miniSearch.addAll(documents)
   * const json = JSON.stringify(miniSearch)
   *
   * // Later, to deserialize it:
   * miniSearch = MiniSearch.loadJSON(json, { fields: ['title', 'text'] })
   * ```
   *
   * @return A plain-object serializeable representation of the search index.
   */
  toJSON (): AsPlainObject {
    return {
      index: this._index,
      documentCount: this._documentCount,
      nextId: this._nextId,
      documentIds: this._documentIds,
      fieldIds: this._fieldIds,
      fieldLength: this._fieldLength,
      averageFieldLength: this._averageFieldLength,
      storedFields: this._storedFields
    }
  }

  /**
   * @ignore
   */
  private termResults (
    term: string,
    boosts: { [field: string]: number },
    boostDocument: ((id: any, term: string) => number) | undefined,
    indexData: IndexData,
    weight: number = 1,
    editDistance: number = 0
  ): RawResult {
    if (indexData == null) { return {} }

    return Object.entries(boosts).reduce((
      results: { [shortId: string]: { score: number, match: MatchInfo, terms: string[] } },
      [field, boost]
    ) => {
      const fieldId = this._fieldIds[field]
      const { df, ds } = indexData[fieldId] || { ds: {} }

      Object.entries(ds).forEach(([documentId, tf]) => {
        const docBoost = boostDocument ? boostDocument(this._documentIds[documentId], term) : 1
        if (!docBoost) { return }
        const normalizedLength = this._fieldLength[documentId][fieldId] / this._averageFieldLength[fieldId]
        results[documentId] = results[documentId] || { score: 0, match: {}, terms: [] }
        results[documentId].terms.push(term)
        results[documentId].match[term] = getOwnProperty(results[documentId].match, term) || []
        results[documentId].score += docBoost * score(tf, df, this._documentCount, normalizedLength, boost, editDistance)
        results[documentId].match[term].push(field)
      })
      return results
    }, {})
  }

  /**
   * @ignore
   */
  private addTerm (fieldId: number, documentId: string, term: string): void {
    this._index.update(term, (indexData: IndexData) => {
      indexData = indexData || {}
      const fieldIndex = indexData[fieldId] || { df: 0, ds: {} }
      if (fieldIndex.ds[documentId] == null) { fieldIndex.df += 1 }
      fieldIndex.ds[documentId] = (fieldIndex.ds[documentId] || 0) + 1
      return { ...indexData, [fieldId]: fieldIndex }
    })
  }

  /**
   * @ignore
   */
  private removeTerm (fieldId: number, documentId: string, term: string): void {
    if (!this._index.has(term)) {
      this.warnDocumentChanged(documentId, fieldId, term)
      return
    }
    this._index.update(term, (indexData: IndexData) => {
      const fieldIndex = indexData[fieldId]
      if (fieldIndex == null || fieldIndex.ds[documentId] == null) {
        this.warnDocumentChanged(documentId, fieldId, term)
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
    if (Object.keys(this._index.get(term)).length === 0) {
      this._index.delete(term)
    }
  }

  /**
   * @ignore
   */
  private warnDocumentChanged (shortDocumentId: string, fieldId: number, term: string): void {
    if (console == null || console.warn == null) { return }
    const fieldName = Object.entries(this._fieldIds).find(([name, id]) => id === fieldId)![0]
    console.warn(`MiniSearch: document with ID ${this._documentIds[shortDocumentId]} has changed before removal: term "${term}" was not present in field "${fieldName}". Removing a document after it has changed can corrupt the index!`)
  }

  /**
   * @ignore
   */
  private addDocumentId (documentId: any): string {
    const shortDocumentId = this._nextId.toString(36)
    this._documentIds[shortDocumentId] = documentId
    this._documentCount += 1
    this._nextId += 1
    return shortDocumentId
  }

  /**
   * @ignore
   */
  private addFields (fields: string[]): void {
    fields.forEach((field, i) => { this._fieldIds[field] = i })
  }

  /**
   * @ignore
   */
  private addFieldLength (documentId: string, fieldId: number, count: number, length: number): void {
    this._averageFieldLength[fieldId] = this._averageFieldLength[fieldId] || 0
    const totalLength = (this._averageFieldLength[fieldId] * count) + length
    this._fieldLength[documentId] = this._fieldLength[documentId] || {}
    this._fieldLength[documentId][fieldId] = length
    this._averageFieldLength[fieldId] = totalLength / (count + 1)
  }

  /**
   * @ignore
   */
  private removeFieldLength (documentId: string, fieldId: number, count: number, length: number): void {
    const totalLength = (this._averageFieldLength[fieldId] * count) - length
    this._averageFieldLength[fieldId] = totalLength / (count - 1)
  }

  /**
   * @ignore
   */
  private saveStoredFields (documentId: string, doc: T): void {
    const { storeFields, extractField } = this._options
    if (storeFields == null || storeFields.length === 0) { return }
    this._storedFields[documentId] = this._storedFields[documentId] || {}

    storeFields.forEach((fieldName) => {
      const fieldValue = extractField(doc, fieldName)
      if (fieldValue === undefined) { return }
      this._storedFields[documentId][fieldName] = fieldValue
    })
  }
}

const getOwnProperty = (object: any, property: string) =>
  Object.prototype.hasOwnProperty.call(object, property) ? object[property] : undefined

type CombinatorFunction = (a: RawResult, b: RawResult) => RawResult

const combinators: { [kind: string]: CombinatorFunction } = {
  [OR]: (a: RawResult, b: RawResult) => {
    return Object.entries(b).reduce((combined: RawResult, [documentId, { score, match, terms }]) => {
      if (combined[documentId] == null) {
        combined[documentId] = { score, match, terms }
      } else {
        combined[documentId].score += score
        combined[documentId].score *= 1.5
        combined[documentId].terms.push(...terms)
        Object.assign(combined[documentId].match, match)
      }
      return combined
    }, a || {})
  },
  [AND]: (a: RawResult, b: RawResult) => {
    return Object.entries(b).reduce((combined: RawResult, [documentId, { score, match, terms }]) => {
      if (a[documentId] === undefined) { return combined }
      combined[documentId] = combined[documentId] || {}
      combined[documentId].score = a[documentId].score + score
      combined[documentId].match = { ...a[documentId].match, ...match }
      combined[documentId].terms = [...a[documentId].terms, ...terms]
      return combined
    }, {})
  },
  [AND_NOT]: (a: RawResult, b: RawResult) => {
    return Object.entries(b).reduce((combined: RawResult, [documentId, { score, match, terms }]) => {
      delete combined[documentId]
      return combined
    }, a || {})
  }
}

const tfIdf = (tf: number, df: number, n: number): number => tf * Math.log(n / df)

const score = (
  termFrequency: number,
  documentFrequency: number,
  documentCount: number,
  normalizedLength: number,
  boost: number,
  editDistance: number
): number => {
  const weight = boost / (1 + (0.333 * boost * editDistance))
  return weight * tfIdf(termFrequency, documentFrequency, documentCount) / normalizedLength
}

const termToQuerySpec = (options: SearchOptions) => (term: string, i: number, terms: string[]): QuerySpec => {
  const fuzzy = (typeof options.fuzzy === 'function')
    ? options.fuzzy(term, i, terms)
    : (options.fuzzy || false)
  const prefix = (typeof options.prefix === 'function')
    ? options.prefix(term, i, terms)
    : (options.prefix === true)
  return { term, fuzzy, prefix }
}

const uniq = <T>(array: T[]): T[] =>
  array.filter((element: T, i: number, array: T[]) => array.indexOf(element) === i)

const defaultOptions = {
  idField: 'id',
  extractField: (document: { [key: string]: any }, fieldName: string) => document[fieldName],
  tokenize: (text: string, fieldName?: string) => text.split(SPACE_OR_PUNCTUATION),
  processTerm: (term: string, fieldName?: string) => term.toLowerCase(),
  fields: undefined,
  searchOptions: undefined,
  storeFields: []
}

const defaultSearchOptions = {
  combineWith: OR,
  prefix: false,
  fuzzy: false,
  boost: {},
  weights: { fuzzy: 0.9, prefix: 0.75 }
}

const defaultAutoSuggestOptions = {
  prefix: (term: string, i: number, terms: string[]): boolean =>
    i === terms.length - 1
}

// This regular expression matches any Unicode space or punctuation character
// Adapted from https://unicode.org/cldr/utility/list-unicodeset.jsp?a=%5Cp%7BZ%7D%5Cp%7BP%7D&abb=on&c=on&esc=on
const SPACE_OR_PUNCTUATION = /[\n\r -#%-*,-/:;?@[-\]_{}\u00A0\u00A1\u00A7\u00AB\u00B6\u00B7\u00BB\u00BF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u1680\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2000-\u200A\u2010-\u2029\u202F-\u2043\u2045-\u2051\u2053-\u205F\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u3000-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]+/u
