# Design Document

This design document has the aim to explain the details of `MiniSearch`
design and implementation to library developers that intend to contribute to
this project, or that are simply curious about the internals.

**Latest update: Feb. 21, 2022**

## Goals (and non-goals)

`MiniSearch` is aimed at providing rich full-text search functionalities in a
local setup (e.g. client side, in the browser). It is therefore optimized for:

  1. Small memory footprint of the index data structure
  2. Fast indexing of documents
  3. Versatile and performant search features, to the extent possible while
     meeting goals 1 and 2
  4. Small and simple API surface, on top of which more specific solutions can
     be built by application developers
  5. Possibility to add and remove documents from the index at any time

`MiniSearch` is therefore NOT directly aimed at offering:

  - A solution for use cases requiring large index data structure size
  - Distributed setup where the index resides on multiple nodes and need to be
    kept in sync
  - Turn-key opinionated solutions (e.g. supporting specific locales with custom
    stemmers, stopwords, etc.): `MiniSearch` _enables_ developer to build these
    on top of its core API, but does not provide them out of the box.

For these points listed as non-goals, other solutions exist that should be
preferred to `MiniSearch`. Adapting `MiniSearch` to support those goals would in
fact necessarily go against the primary project goals.


## Technical design

`MiniSearch` is composed of two layers:

  1. A compact and versatile data structure for indexing terms, providing
     lookup by exact match, prefix match, and fuzzy match.
  2. An API layer on top of this data structure, providing the search
     features.

Here follows a description of these two layers.

### Index data structure

The data structure chosen for the index is a [radix
tree](https://en.wikipedia.org/wiki/Radix_tree), which is a prefix tree where
nodes with no siblings are merged with the parent node. The reason for choosing
this data structure follows from the project goals:

  - The radix tree minimizes the memory footprint of the index, because common
    prefixes are stored only once, and nodes are compressed into a single
    multi-character node whenever possible.
  - Radix trees offer fast key lookup, with performance proportional to the key
    length, and fast lookup of subtrees sharing the same key prefix. These
    properties make it possible to offer performant exact match and prefix
    search.
  - On top of a radix tree it is possible to implement lookup of keys that are
    within a certain maximum edit distance from a given key. This search rapidly
    becomes complex as the maximum distance grows, but for practical search
    use-cases the maximum distance is small enough for this algorithm to be
    performant. Other more performant solutions for fuzzy search would require
    more space (e.g. n-gram indexes).

The class implementing the radix tree is called `SearchableMap`, because it
implements the standard JavaScript [`Map`
interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map),
adding on top of it some key lookup methods:

  - `SearchableMap.prototype.atPrefix(prefix)`, returning another
    `SearchableMap` representing a mutable view of the original one, containing
    only entries where the keys share the given prefix.
  - `SearchableMap.prototype.fuzzyGet(searchKey, maxEditDistance)`, returning
    all the entries where the key is within the given edit (Levenshtein)
    distance from `searchKey`.

As a trade-off for offering these additional features, `SearchableMap` is
restricted to use only string keys.

The `SearchableMap` data type is part of the public API of `MiniSearch`, exposed
as `MiniSearch.SearchableMap`. Its usefulness is in fact not limited to
providing a data structure for the inverted index, and developers can use it as
a building block for other solutions. When modifying this class, one should
think about it in terms of a generic data structure, that could in principle be
released as a separate library.

### Fuzzy search algorithm

Fuzzy search is performed by calculating the [Levenshtein
distance](https://en.wikipedia.org/wiki/Levenshtein_distance) between the search
term and the keys in the radix tree. The algorithm used is a variation on the
[Wagner-Fischer
algorithm](https://en.wikipedia.org/wiki/Wagner–Fischer_algorithm). This
algorithm constructs a matrix to calculate the edit distance between two terms.
Because the search terms are stored in a radix tree, the same matrix can be
reused for comparisons of child nodes if we do a depth-first traversal of the
tree.

The algorithm to find matching keys within a maximum edit distance from a given
term is the following:

  - Create a matrix with `query length + 1` columns and `query length + edit
    distance + 1` rows. The columns `1..n` correspond to the query characters
    `0..n-1`. The rows `1..m` correspond to the characters `0..m-1` for every
    key in the radix tree that is visited.
  - The first row and and first column is filled with consecutive numbers 0, 1,
    2, 3, ..., up to at least the edit distance. All other entries are set to
    `max distance + 1`.
  - The radix tree is traversed, starting from the root, visiting each node in a
    depth-first traversal and updating the matrix.
  - The matrix is updated according to the [Wagner-Fischer
    algorithm](https://en.wikipedia.org/wiki/Wagner–Fischer_algorithm): the keys
    for every child node are compared with the characters in the query, and the
    edit distance for the current matrix entry is calculated based on the
    positions in the previous column and previous row.
  - Only the diagonal band of `2 * edit distance + 1` needs to be calculated.
  - When the current row of the matrix only contains entries above the maximum
    edit distance, it is guaranteed that any child nodes below the current node
    will not yield any matches and the entire subtree can be skipped.
  - For every leaf node, if the edit distance in the lower right corner is equal
    to or below the maximum edit distance, it is recorded as a match.

Note that this algorithm can get complex if the maximum edit distance is large,
as many paths would be followed. The reason why this algorithm is employed is a
trade-off:

  - For full-text search purposes, the maximum edit distance is small, so the
    algorithm is performant enough.
  - A [Levenshtein
    automaton](https://en.wikipedia.org/wiki/Levenshtein_automaton) is a fast
    alternative for low edit distances (1 or 2), but can get excessively complex
    and memory hungry for edit distances above 3. It is also a much more complex
    algorithm.
  - Trigram indexes require much more space and often yield worse results (a
    trigram index cannot match `votka` to `vodka`).
  - As `MiniSearch` is optimized for local and possibly memory-constrained
    setup, higher computation complexity is traded in exchange for smaller space
    requirement for the index.

### Search API layer

The search API layer offers a small and simple API surface for application
developers. It does not assume that a specific locale is used in the indexed
documents, therefore no stemming nor stop-word filtering is performed, but
instead offers easy options for developers to provide their own implementation.
This heuristic will be followed in future development too: rather than providing
an opinionated solution, the project will offer simple building blocks for
application developers to implement their own solutions.

The inverted index is implemented with `SearchableMap`, and posting lists are
stored as values in the Map. This way, the same data structure provides both the
inverted index and the set of indexed terms. Different document fields are
indexed within the same index, to further save space. The index is therefore
structured as following:

```
term -> field -> document -> term frequency
```

The fields and documents are referenced in the index with a short numeric ID for
performance and to save space.

### Search result scoring

When performing a search, the entries corresponding to the search term are
looked up in the index (optionally searching the index with prefix or fuzzy
search). If the combination of term, field and document is found, then this
indicates that the term was present in this particular document field. But it is
not helpful to return all matching documents in an arbitrary order. We want to
return the results in order of _relevance_.

For every document field matching a term, a relevance score is calculated. It
indicates the quality of the match, with a higher score indicating a better
match. The variables that are used to calculate the score are:
  - The frequency of the term in the document field that is being scored.
  - The total number of documents with matching fields for this term.
  - The total number of indexed documents.
  - The length of this field.
  - The average length of this field for all indexed documents.

The scoring algorithm is based on
[BM25](https://en.wikipedia.org/wiki/Okapi_BM25) (and its derivative BM25+),
which is also used in other popular search engines such as Lucene. BM25 is an
improvement on [TF-IDF](https://en.wikipedia.org/wiki/Tf–idf) and incorporates
the following ideas:
  - If a term is less common, the score should be higher (like TD-IDF).
  - If a term occurs more frequently, the score should be higher (so far this is
    the same as TD-IDF). But the relationship is not linear. If a term occurs
    twice as often, the score is _not_ twice as high.
  - If a document field is shorter, it requires fewer term occurrences to be
    achieve the same relevance as a longer document field. This encodes the idea
    that a term occurring once in, say, a title is more relevant than a word
    occuring once in a long paragraph.

The scores are calculated for every document field matching a query term. The
results are added. To reward documents that match the most terms, the final
score is multiplied by the number of matching terms in the query.
