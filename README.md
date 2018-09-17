# MiniSearch

MiniSearch is a tiny but powerful embedded full-text search engine for
JavaScript. It is respectful of resources, so it can comfortably run both in
Node and in the browser, but it can do a lot.

## Use case:

MiniSearch addresses use cases where flexible full-text search features are
needed (e.g. prefix search or fuzzy search), but the whole material to be
indexed can fit locally in the process memory. While you won't be able to index
the whole Wikipedia with it, there are surprisingly many use cases that are
served well by MiniSearch. A prominent example is search-as-you-type features in
Web and mobile applications, where keeping the index on the client-side enables
fast and reactive UI, removing the need to make requests to a search server.

## Design goals:

  * Memory-efficient index, able to store tens of thousands of documents and
    terms in memory, even in the browser.

  * Exact match, prefix match and fuzzy match, all with a single performant and
    multi-purpose index data structure.

  * Small and maintainable code base, well tested, with no external dependency.

  * Provide good building blocks that empower developers to build solutions to
    their specific problems, rather than try to offer a general-purpose tool to
    satisfy every use-case at the cost of complexity.
