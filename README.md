# MiniSearch

`MiniSearch` is a tiny but powerful in-memory full-text search engine for
JavaScript. It is respectful of resources, so it can comfortably run both in
Node and in the browser, but it can do a lot.

## Use case:

`MiniSearch` addresses use cases where full-text search features are needed
(e.g. prefix search, fuzzy search, boosting of fields), but the data to be
indexed can fit locally in the process memory. While you may not index the whole
Wikipedia with it, there are surprisingly many use cases that are served well by
`MiniSearch`. By storing the index in local memory, `MiniSearch` can work
offline, and can process queries quickly, without network latency.

A prominent use-case is search-as-you-type features in web and mobile
applications, where keeping the index on the client-side enables fast and
reactive UI, removing the need to make requests to a search server.

## Design goals:

  * Memory-efficient index, able to store tens of thousands of documents and
    terms in memory, even in the browser.

  * Exact match, prefix match and fuzzy match, all with a single performant and
    multi-purpose index data structure.

  * Small and maintainable code base, well tested, with no external dependency.

  * Provide good building blocks that empower developers to build solutions to
    their specific problems, rather than try to offer a general-purpose tool to
    satisfy every use-case at the cost of complexity.

## Installation:

With `npm`:

```
npm install --save minisearch
```

With `yarn`:

```
yarn add minisearch
```

## Usage:

Refer to the [API
documentation](https://lucaong.github.io/minisearch/identifiers.html) for
details, but here are some quick examples. All the examples use the `ES6`
syntax.

### Basic usage:

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

### Search options:

`MiniSearch` supports several options for more advanced search behavior:

```javascript
// Search only specific fields
miniSearch.search('zen', { fields: ['title'] })

// Boost some fields (here "title")
miniSearch.search('zen', { boost: { title: 2 } })

// Prefix search (so that 'moto' will match 'motorcycle')
miniSearch.search('moto', {
  termToQuery: (term) => {
    return { term, prefix: true }
  }
})

// Fuzzy search, in this example, with a max edit distance of 0.2 * term length,
// rounded to nearest integer. The mispelled 'ismael' will match 'ishmael'.
miniSearch.search('ismael', {
  termToQuery: (term) => {
    return { term, fuzzy: 0.2 }
  }
})

// You can set the default search options upon initialization
miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  searchOptions: {
    boost: { title: 2 },
    termToQuery: (term) => ({ term, fuzzy: 0.2 })
  }
})
miniSearch.addAll(documents)

// It will now by default perform fuzzy search and boost "title":
miniSearch.search('zen and motorcycles')
```

The [API documentation](https://lucaong.github.io/minisearch/identifiers.html)
has more details about other configuration options (tokenization, term
processing, etc.)


# Comparison with other libraries

There are other great libraries besides `MiniSearch` for in-memory full-text
search in JavaScript, the most widely used being [Lunr.js](https://lunrjs.com).
`MiniSearch` was created with slightly different goals in mind, which make it
better for some use-cases, and worse for others. Here is a list of the most
notable differences between `MiniSearch` and `Lunr`:

  - `MiniSearch` focuses on minimizing the index size, to run even on
      memory-constrained devices. `MiniSearch` index is typically much smaller
      than `Lunr` index.
  - On the side of search speed, `MiniSearch` and `Lunr` are on-par
  - `MiniSearch` provides a simple API that provides the building blocks for
      more complex use-cases. `Lunr` provides more feature out-of-the-box
      (stemming, a query language, arbitrary wildcards, etc.).
  - `Lunr` index is immutable, while `MiniSearch` supports removing and
      re-indexing documents at any time.

In summary, if you need the additional features provided by `Lunr`, and you are
fine with an immutable index, definitely go with it, it's a great library. If
you don't need those features or need to dynamically add and remove documents,
you could benefit from the much smaller index size and API simplicity offered by
`MiniSearch`.
