const merge = require('webpack-merge')
const config = require('./webpack.config.js')

module.exports = merge(config, {
  optimization: {
    minimize: true
  },
  output: {
    filename: '[name].min.js'
  },
  devtool: 'source-map'
})
