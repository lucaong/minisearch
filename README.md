# [![MiniSearch](https://lucaong.github.io/minisearch/MiniSearch.svg)](https://lucaong.github.io/minisearch/) MiniSearch

[![Build Status](https://travis-ci.org/lucaong/minisearch.svg?branch=master)](https://travis-ci.org/lucaong/minisearch)

`MiniSearch` is a tiny but powerful in-memory fulltext search engine for
JavaScript. It is respectful of resources, so it can comfortably run both in
Node and in the browser, but it can do a lot.

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

  * Memory-efficient index, smaller than most other libraries, designed to
    support memory-constrained use cases like mobile browsers.

  * Exact match, prefix match and fuzzy match, all with a single performant and
    multi-purpose index data structure.

  * Boosting of document fields

  * Mutable index: documents can be added and removed at any time

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

### Tokenization

By default, documents and queries are tokenized splitting on non-word
characters. No stop-word list is applied, but single-character words are
excluded. The tokenization logic can be easily changed by passing a custom
tokenizer function as the `tokenize` option:

```javascript
let stopWords = new Set(['and', 'or', 'to', 'in', 'a', 'the', /* ...and more */ ])

// Tokenize splitting by space and apply a stop-word list
let miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  tokenize: (string) => string.split(/\s+/).filter(word => !stopWords.has(word))
})
```

### Term processing

Terms are downcased by default. No stemming is performed. To customize how the
terms are processed upon indexing or searching, for example to normalize them or
to apply stemming, the `processTerm` option can be used:

```javascript
const removeAccents = (term) =>
  term.replace(/[àá]/, 'a')
      .replace(/[èé]/, 'e')
      .replace(/[ìí]/, 'i')
      .replace(/[òó]/, 'o')
      .replace(/[ùú]/, 'u')

// Perform custom term processing (here removing accents)
let miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  processTerm: (term) => removeAccents(term.toLowerCase())
})
```

Refer to the [API documentation](https://lucaong.github.io/minisearch/identifiers.html)
for details about configuration options and methods.


## Browser compatibility

`MiniSearch` should natively supports all modern browsers implementing
JavaScript standards, but requires a polyfill when used in Internet Explorer, as
it makes use of `Object.entries`, `Array.includes` and `Array.from`. The
[`@babel/polyfill`](https://babeljs.io/docs/en/babel-polyfill) is one such
polyfill that can be used to provide those functions.
