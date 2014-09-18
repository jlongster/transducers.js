var webpack = require('webpack');

var config = {
  cache: true,
  entry: './transducers.js',
  output: {
    filename: './dist/transducers.js',
    library: 'transducers'
  },
  plugins: []
};

if(process.env.NODE_ENV === 'production') {
  config.plugins = config.plugins.concat([
    new webpack.optimize.UglifyJsPlugin()
  ]);
}

module.exports = config;
