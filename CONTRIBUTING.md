# Contributing

Contributions to `MiniSearch` are welcome :) Just follow the guidelines below.

## Bugs and feature requests

If you have an idea for a feature, or spotted a bug, please [open an
issue on GitHub](https://github.com/lucaong/minisearch/issues).

  - Make sure to search if your issue was already reported. In that case, better
      to comment on the existing issue rather than open a duplicate one.

  - When reporting a bug, whenever possible, provide example code to reproduce
      the bug: that will make the process of fixing it much faster.

  - Remember this is an open-source project. Your feature requests will be
      discussed and taken into consideration, but please do not take it
      personally if the feature does not get implemented. This project uses a
      permissive license, so pull requests are welcome and forks are permitted.

  - Always be respectful of others when discussing issues. The project
      maintainer reserves the right to remove or close discussions where the
      tone or language is derogatory or offensive toward others.

## Pull requests

Thinking about sending a pull request? That is great :) Here is how you can
setup your development environment:

  1. Clone the [repository](https://github.com/lucaong/minisearch)
  2. Install the development dependencies with `yarn install`
  3. Run the tests with `yarn test`. You can also automatically run tests for
     the code that you change by running `yarn test-watch`
  4. If you are working on optimising the performance, you can run performance
     benchmarks with `yarn benchmark`
  5. If you are improving the documentation, you can build the docs with `yarn
     build-docs`

In order to understand implementation details and design goals, read the [design
document](https://lucaong.github.io/minisearch/manual/DESIGN_DOCUMENT.html).

Also, please follow these guidelines:

  - Add tests for your code. This ensures that your feature won't be broken by
    further code changes. If you are not sure of how to test, feel free to send
    the pull request and ask for advices in the comment.

  - Don't change the version number. That will be done by the mainteiner upon
    releasing a new version.

  - Make sure you run the full test suite before sending the pull request.
