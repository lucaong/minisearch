# [![MiniSearch](https://lucaong.github.io/minisearch/MiniSearch.svg)](https://lucaong.github.io/minisearch/) MiniSearch

[![Build Status](https://travis-ci.org/lucaong/minisearch.svg?branch=master)](https://travis-ci.org/lucaong/minisearch)
[![Coverage Status](https://coveralls.io/repos/github/lucaong/minisearch/badge.svg?branch=master)](https://coveralls.io/github/lucaong/minisearch?branch=master)
[![Minzipped Size](https://img.shields.io/bundlephobia/minzip/minisearch.svg?style=flat)](https://bundlephobia.com/result?p=minisearch)

`MiniSearch` is a tiny but powerful in-memory fulltext search engine for
JavaScript. It is respectful of resources, and it can comfortably run both in
Node and in the browser.

Try out the [demo application](https://lucaong.github.io/minisearch/examples/).


## Use case

`MiniSearch` addresses use cases where full-text search features are needed
(e.g. prefix search, fuzzy search, boosting of fields), but the data to be
indexed can fit locally in the process memory. While you may not index the whole
Wikipedia with it, there are surprisingly many use cases that are served well by
`MiniSearch`. By storing the index in local memory, `MiniSearch` can work
offline, and can process queries quickly, without network latency.

A prominent use-case is search-as-you-type features in web and mobile
applications, where keeping the index on the client-side enables fast and
reactive UI, removing the need to make requests to a search server.


## Features

  * Memory-efficient index, designed to support memory-constrained use cases
    like mobile browsers.

  * Exact, prefix, and fuzzy search

  * Auto-suggestion engine, for auto-completion of search queries

  * Documents can be added and removed from the index at any time

  * Simple API, providing building blocks to build specific solutions

  * Zero external dependencies, small and well tested code-base


## Installation

With `npm`:

```
npm install --save minisearch
```

With `yarn`:

```
yarn add minisearch
```

Then `require` or `import` it in your project.

Alternatively, to manually build the library, clone the repository and run `yarn
build` (or `yarn build-minified` for a minified version + source maps). The
compiled source will be created in the `dist` folder.


## Usage

### Basic usage

```javascript
// A collection of documents for our examples
const documents = [
  { id: 1, title: 'Moby Dick', text: 'Call me Ishmael. Some years ago...' },
  { id: 2, title: 'Zen and the Art of Motorcycle Maintenance', text: 'I can see by my watch...' },
  { id: 3, title: 'Neuromancer', text: 'The sky above the port was...' },
  { id: 4, title: 'Zen and the Art of Archery', text: 'At first sight it must seem...' },
  // ...and more
]

let miniSearch = new MiniSearch({ fields: ['title', 'text'] })

// Index all documents
miniSearch.addAll(documents)

// Search with default options
let results = miniSearch.search('zen art motorcycle')
// => [ { id: 2, score: 2.77258, match: { ... } }, { id: 4, score: 1.38629, match: { ... } } ]
```

### Search options

`MiniSearch` supports several options for more advanced search behavior:

```javascript
// Search only specific fields
miniSearch.search('zen', { fields: ['title'] })

// Boost some fields (here "title")
miniSearch.search('zen', { boost: { title: 2 } })

// Prefix search (so that 'moto' will match 'motorcycle')
miniSearch.search('moto', { prefix: true })

// Fuzzy search, in this example, with a max edit distance of 0.2 * term length,
// rounded to nearest integer. The mispelled 'ismael' will match 'ishmael'.
miniSearch.search('ismael', { fuzzy: 0.2 })

// You can set the default search options upon initialization
miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  searchOptions: {
    boost: { title: 2 },
    fuzzy: 0.2
  }
})
miniSearch.addAll(documents)

// It will now by default perform fuzzy search and boost "title":
miniSearch.search('zen and motorcycles')
```

### Auto suggestions

`MiniSearch` can suggest search queries given an incomplete query:

```javascript
miniSearch.autoSuggest('zen ar')
// => [ { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
//      { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 } ]
```

The `autoSuggest` method takes the same options as the `search` method, so you
can get suggestions for misspelled words using fuzzy search:

```javascript
miniSearch.autoSuggest('neromancer', { fuzzy: 0.2 })
// => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 1.03998 } ]
```

Suggestions are ranked by the relevance of the documents that would be returned
by that search.

### Tokenization

By default, documents are tokenized by splitting on non-alphanumeric characters
(accented characters and other diacritics are considered alphanumeric). The
tokenization logic can be easily changed by passing a custom tokenizer function
as the `tokenize` option:

```javascript
// Tokenize splitting by hyphen
let miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  tokenize: (string, _fieldName) => string.split('-')
})
```

Upon search, the same tokenization is used by default, but it is possible to
pass a `tokenize` search option in case a different search-time tokenization is
necessary:

```javascript
// Tokenize splitting by hyphen
let miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  tokenize: (string) => string.split('-'), // indexing tokenizer
  searchOptions: {
    tokenize: (string) => string.split(/[\s-]+/) // search query tokenizer
  }
})
```

The default tokenizer can be obtained by calling
`MiniSearch.getDefault('tokenize')`.

### Term processing

Terms are downcased by default. No stemming is performed, and no stop-word list
is applied, but single-character words are excluded. To customize how the terms
are processed upon indexing, for example to normalize them, filter them, or to
apply stemming, the `processTerm` option can be used:

```javascript
let stopWords = new Set(['and', 'or', 'to', 'in', 'a', 'the', /* ...and more */ ])

const removeAccents = (term) =>
  term.replace(/[àá]/, 'a')
      .replace(/[èé]/, 'e')
      .replace(/[ìí]/, 'i')
      .replace(/[òó]/, 'o')
      .replace(/[ùú]/, 'u')

// Perform custom term processing (here removing accents, downcasing, and
// discarding stop words)
let miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  processTerm: (term, _fieldName) =>
    stopWords.has(term) ? null : removeAccents(term.toLowerCase())
})
```

By default, the same processing is applied to search queries. In order to apply
a different processing to search queries, supply a `processTerm` search option:

```javascript
let miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  processTerm: (term) =>
    stopWords.has(term) ? null : removeAccents(term.toLowerCase()), // index term processing
  searchOptions: {
    processTerm: (term) => removeAccents(term.toLowerCase()) // search query processing
  }
})
```

The default term processor can be obtained by calling
`MiniSearch.getDefault('processTerm')`.

### API Documentation

Refer to the [API documentation](https://lucaong.github.io/minisearch/identifiers.html)
for details about configuration options and methods.


## Browser compatibility

`MiniSearch` natively supports all modern browsers implementing JavaScript
standards, but requires a polyfill when used in Internet Explorer, as it makes
use functions like `Object.entries`, `Array.includes`, and `Array.from`, which
are standard but not available on older browsers. The
[`@babel/polyfill`](https://babeljs.io/docs/en/babel-polyfill) is one such
polyfill that can be used to provide those functions.

## Contributing

Contributions to `MiniSearch` are welcome! Please read the [contributions
guidelines](https://lucaong.github.io/minisearch/manual/CONTRIBUTING.html).
Reading the [design
document](https://lucaong.github.io/minisearch/manual/DESIGN_DOCUMENT.html) is
also useful to understand the project goals and the technical implementation.
