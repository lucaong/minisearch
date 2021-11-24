# Changelog

`MiniSearch` follows [semantic versioning](https://semver.org/spec/v2.0.0.html).

# v3.2.0

  - Add AND_NOT combinator to subtract results of a subquery from another (for
    example to find documents that match one term and not another)

# v3.1.0

  - Add possibility for advanced combination of subqueries as query expression
    trees

# v3.0.4

  - [fix] Keep radix tree property (no node with a single child) after removal
    of an entry

# v3.0.3

  - [fix] Adjust data about field lengths upon document removal

# v3.0.2

  - [fix] `addAllAsync` now allows events to be processed between chunks, avoid
    blocking the UI (by [@grimmen](https://github.com/grimmen))

# v3.0.1

  - [fix] Fix type signature of `removeAll` to allow calling it with no
    arguments. Also, throw a more informative error if called with a falsey
    value. Thanks to [https://github.com/nilclass](@nilclass).

# v3.0.0

  This major version ports the source code to TypeScript. That made it possible
  to improve types and documentation, making sure that both are in sync with the
  actual code. It is mostly backward compatible: JavaScript users should
  experience no breaking change, while TypeScript users _might_ have toadapt
  some types.

  - Port source to [TypeScript](https://www.typescriptlang.org), adding type
    safety
  - Improved types and documentation (now generated with [TypeDoc](http://typedoc.org))
  - [breaking change, fix] TypeScript `SearchOptions` type is not generic
    anymore
  - [breaking change] `SearchableMap` is not a static field of `MiniSearch`
    anymore: it can instead be imported separately as `minisearch/SearchableMap`

# v2.6.2

  - [fix] Improve TypeScript types: default generic document type is `any`, not `object`

# v2.6.1

  - No change from 2.6.0

# v2.6.0

  - Better TypeScript typings using generics, letting the user (optionally)
    specify the document type.

# v2.5.1

  - [fix] Fix document removal when using a custom `extractField` function
    (thanks [@ahri](https://github.com/ahri) for reporting and reproducting)

# v2.5.0

  - Make `idField` extraction customizeable and consistent with other fields,
    using `extractField`

# v2.4.1

  - [fix] Fix issue with the term `constructor` (reported by
    [@scambier](https://github.com/scambier))

  - [fix] Fix issues when a field is named like a default property of JavaScript
    objects

# v2.4.0

  - Convert field value to string before tokenization and indexing. This makes
    a custom field extractor unnecessary for basic cases like integers or simple
    arrays.

# v2.3.1

  - Version `v2.3.1` mistakenly did not contain the commit adding `removeAll`,
    this patch release fixes it.

# v2.3.0

  - Add `removeAll` method, to remove many documents, or all documents, at once.

# v2.2.2

  - Avoid destructuring variables named with an underscore prefix. This plays
    nicer to some common minifier and builder configurations.

  - Performance improvement in `getDefault` (by
    [stalniy](https://github.com/stalniy))

  - Fix the linter setup, to ensure code style consistency

## v2.2.1

  - Add `"sideEffects": false` to `package.json` to allow bundlers to perform
    tree shaking

## v2.2.0

  - [fix] Fix documentation of `SearchableMap.prototype.atPrefix` (by
    [@graphman65](https://github.com/graphman65))
  - Switch to Rollup for bundling (by [stalniy](https://github.com/stalniy)),
    reducing size of build and providing ES6 and ES5 module versions too.

## v2.1.4

  - [fix] Fix document removal in presence of custom per field tokenizer, field
    extractor, or term processor (thanks [@CaptainChaos](https://github.com/CaptainChaos))

## v2.1.3

  - [fix] Fix TypeScript definition for `storeFields` option (by
    [@ryan-codingintrigue](https://github.com/ryan-codingintrigue))

## v2.1.2

  - [fix] Fix TypeScript definition for `fuzzy` option (by
    [@alessandrobardini](https://github.com/alessandrobardini))

## v2.1.1

  - [fix] Fix TypeScript definitions adding `filter` and `storeFields` options
    (by [@emilianox](https://github.com/emilianox))

## v2.1.0

  - [feature] Add support for stored fields

  - [feature] Add filtering of search results and auto suggestions

## v2.0.6

  - Better TypeScript definitions (by [@samuelmeuli](https://github.com/samuelmeuli))

## v2.0.5

  - Add TypeScript definitions for ease of use in TypeScript projects

## v2.0.4

  - [fix] tokenizer behavior with newline characters (by [@samuelmeuli](https://github.com/samuelmeuli))

## v2.0.3

  - Fix small imprecision in documentation

## v2.0.2

  - Add `addAllAsync` method, adding many documents asynchronously and in chunks
    to avoid blocking the main thread

## v2.0.1

  - Throw a more descriptive error when `loadJSON` is called without options

## v2.0.0

This release introduces better defaults. It is considered a major release, as
the default options are slightly different, but the API is not changed.

  - *Breaking change*: default tokenizer splits by Unicode space or punctuation
    (before it was splitting by space, punctuation, or _symbol_). The difference
    is that currency symbols and other non-punctuation symbols will not be
    discarded: "it's 100€" is now tokenized as `["it", "s", "100€"]` instead of
    `["it", "s", "100"]`.

  - *Breaking change*: default term processing does not discard 1-character
    words.

  - *Breaking change*: auto suggestions by default perform prefix search only on
    the last term in the query. So "super cond" will suggest "super
    conductivity", but not "superposition condition".

## v1.3.1

  - Better and more compact regular expression in the default tokenizer,
    separating on Unicode spaces, punctuation, and symbols

## v1.3.0

  - Support for non-latin scripts

## v1.2.1

  - Improve fuzzy search performance (common cases are now ~4x faster, as shown
    by the benchmark)

## v1.2.0

  - Add possibility to configure a custom field extraction function by setting
      the `extractField` option (to support cases like nested fields, non-string
      fields, getter methods, field pre-processing, etc.)

## v1.1.2

  - Add `getDefault` static method to get the default value of configuration options

## v1.1.1

  - Do not minify library when published as NPM package. Run `yarn
    build-minified` (or `npm run build-minified`) to produce a minified build
    with source maps.
  - **Bugfix**: as per specification, `processTerm` is called with only one
    argument upon search (see [#5](https://github.com/lucaong/minisearch/issues/5))

## v1.1.0

  - Add possibility to configure separate index-time and search-time
    tokenization and term processing functions
  - The `processTerm` function can now reject a term by returning a falsy value
  - Upon indexing, the `tokenize` and `processTerm` functions receive the field
    name as the second argument. This makes it possible to process or tokenize
    each field differently.

## v1.0.1

  - Reduce bundle size by optimizing babel preset env options

## v1.0.0

Production-ready release.

Features:

  - Space-optimized index
  - Exact match, prefix match, fuzzy search
  - Auto suggestions
  - Add/remove documents at any time
