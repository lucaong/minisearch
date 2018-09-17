const path = require('path')

module.exports = {
  entry: { minisearch: './src/index.js' },
  output: {
    filename: '[name].js',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: 'typeof self !== \'undefined\' ? self : this',
    path: path.resolve(__dirname, 'dist'),
    library: 'minisearch',
    libraryExport: 'default'
  }
}
