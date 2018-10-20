const path = require('path')

module.exports = {
  entry: { app: './src/index.js' },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                'shippedProposals': true,
                'useBuiltIns': 'usage',
                'targets': { 'browsers': '> 1%' }
              }],
              ['@babel/preset-react', {}]
            ],
            plugins: [require('@babel/plugin-proposal-object-rest-spread')]
          }
        }
      }
    ]
  }
}
