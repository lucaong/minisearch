# Design Document

This design document has the aim to explain the details of `MiniSearch`
design and implementation to library developers that intend to contribute to
this project, or that are simply curious about the internals.

**Latest update: Oct. 22, 2019**

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
     lookup by exact match, prefix match, and fuzzy match
  2. An API layer on top of this data structure, providing the search
    features

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

The algorithm used to provide fuzzy search of keys within a maximum [Levenshtein
distance](https://en.wikipedia.org/wiki/Levenshtein_distance) from a given term
is the following:

  - The search starts with a budget of edit distance, initially equal to the
    given maximum distance.
  - The radix tree is traversed, starting from the root, visiting each path and
    propagating the remaining budget along each path, but quitting any search
    path along which the budget is exhausted.
  - For each visited node in the radix tree, the string contained in the node is
    traversed character by character using cursors that are kept on a stack.
  - Each cursor has: a pointer to a position in the node string; a pointer to a
    corresponding position in the search string; the type of the last edit,
    either `deletion`, or `insertion`, or `change`, or `none`; a budget of
    "available edits". This budget is decremented whenever an edit is required.
    The budget is passed from parent to children cursors.
  - The algorithm pulls cursors from the stack, and compares the pointed
    character in the node string with the pointed character in the search
    string:
    * if they are the same, one single child cursor is created, advancing both
      pointers of 1 position. No edit was necessary, so the last edit type is
      `none`.
    * if they are not the same, and the remaining budget is higher than zero, up
      to three children cursors are created: one corresponding to a character
      `change`, where both pointers are incremented by 1; one corresponding to a
      `deletion`, where only the search string pointer is incremented; one
      corresponding to an `insertion`, where only the node string pointer is
      incremented. Each of the children cursors have a budget that is one less
      the parent budget.
    * Some special cases are considered to avoid creating unnecessary cursors. A
      sequence of adjacent `deletion`-`insertion`, or `insertion`-`deletion`,
      would have the same effect of a change, but would consume more budget:
      therefore, a delete cursor is never created after a insertion cursor, and
      vice-versa. Similarily, adjacent `change`-`deletion` and
      `deletion`-`change`, or `change`-`insertion` and `insertion`-`change`, are
      equivalent. Therefore, only one of these cases is generated, by never
      producing a change cursor after a deletion or insertion one.
  - Whenever the algorithm finds a leaf node, it reports it as a result.

Note that this algorithm can get complex if the maximum edit distance is large,
as many paths would be followed. The reason why this algorithm is employed is a
trade-off:

  - For full-text search purposes, the maximum edit distance is small, so the
    algorithm is performant enough
  - The alternatives (e.g. trigram indexes), would require much more space
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
term -> field -> { document frequency, posting list }
```

When performing a search, the entries corresponding to the search term are
looked up in the index (optionally searching the index with prefix or fuzzy
search), then the documents are scored with a variant of
[Tf-Idf](https://en.wikipedia.org/wiki/Tf–idf), and finally results for
different search terms are merged with the given combinator function (by default
`OR`, but `AND` can be specified).

As the document IDs necessarily occur many times in the posting list, as a space
optimization they are substituted by short generated IDs. An index of short ID
to original ID is maintained alongside the search index, to reconstruct the
original IDs. A similar optimization is applied to the field names.
