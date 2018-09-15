const path = require('path')

const common = {
  entry: { minisearch: './src/index.js' },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: 'minisearch'
  }
}

const browser = {
  ...common,
  target: 'web'
}

const node = {
  ...common,
  target: 'node',
  output: {
    ...common.output,
    libraryTarget: 'umd',
    filename: '[name].node.js'
  }
}

module.exports = [browser, node]
