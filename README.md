# MiniSearch

`MiniSearch` is a tiny but powerful embedded full-text search engine for
JavaScript. It is respectful of resources, so it can comfortably run both in
Node and in the browser, but it can do a lot.

## Use case:

`MiniSearch` addresses use cases where full-text search features are needed
(e.g. prefix search, fuzzy search, boosting of fields), but the data to be
indexed can fit locally in the process memory. While you won't be able to index
the whole Wikipedia with it, there are surprisingly many use cases that are
served well by `MiniSearch`. By storing the index locally, `MiniSearch` can work
offline, and can process queries quickly, without network latency.

A prominent use-case is search-as-you-type features in Web and mobile
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

## Usage:

```javascript
// A collection of documents for our example
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
// => [ { id: 2, score: 2.77258 }, { id: 4, score: 1.38629 } ]

// Search only specific fields
results = miniSearch.search('zen', { fields: ['title'] })

// Boost fields
results = miniSearch.search('zen', { boost: { title: 2 } })

// Prefix search
results = miniSearch.search('moto', {
  termToQuery: term => ({ term, prefix: true })
})

// Fuzzy search (in this example, with a max edit distance of 0.2 * term length,
// rounded to nearest integer)
results = miniSearch.search('ismael', {
  termToQuery: term => ({ term, fuzzy: 0.2 })
})

// Set default search options upon initialization
miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  searchOptions: {
    boost: { title: 2 },
    termToQuery: term => ({ term, fuzzy: 0.2 })
  }
})

results = ms2.search('zen and motorcycles') // Will default to fuzzy search
```
