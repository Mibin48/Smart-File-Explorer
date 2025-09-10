const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config();

const fs = require('fs');
const copyFilePlugin = {
  apply: (compiler) => {
    compiler.hooks.afterEmit.tapAsync('CopyStylesPlugin', (compilation, callback) => {
      const srcPath = path.join(__dirname, 'styles.css');
      const destPath = path.join(__dirname, 'dist', 'styles.css');
      fs.copyFileSync(srcPath, destPath);
      callback();
    });
  }
};

module.exports = {
  entry: './src/index.tsx',
  target: 'electron-renderer',
  mode: 'development',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    fallback: {
      "path": false,
      "fs": false,
      "os": false
    }
  },
  externals: {
    'electron': 'commonjs2 electron'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html',
      filename: 'index.html',
    }),
    new webpack.DefinePlugin({
      'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
    copyFilePlugin,
  ],
};
