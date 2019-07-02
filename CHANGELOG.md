# Changelog

`MiniSearch` follows [semantic versioning](https://semver.org/spec/v2.0.0.html).

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
