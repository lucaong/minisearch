const path = require('path')

module.exports = {
  entry: { minisearch: './src/index.js' },
  output: {
    filename: '[name].js',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: 'typeof self !== \'undefined\' ? self : this',
    path: path.resolve(__dirname, 'dist'),
    library: {
      amd: 'minisearch',
      commonjs: 'minisearch',
      root: 'MiniSearch'
    },
    libraryExport: 'default'
  },
  optimization: {
    minimize: false
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-object-rest-spread']
          }
        }
      }
    ]
  }
}
