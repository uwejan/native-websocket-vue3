import path from 'path'
import { fileURLToPath } from 'url'
import TerserPlugin from 'terser-webpack-plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const baseConfig = {
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
    concatenateModules: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        resolve: {
          fullySpecified: false
        }
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime']
          }
        }
      }
    ]
  }
}

export default [
  // CommonJS/UMD build
  {
    ...baseConfig,
    entry: './src/Main.js',
    externals: {
      vue: {
        commonjs: 'vue',
        commonjs2: 'vue',
        amd: 'vue',
        root: 'Vue'
      }
    },
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: 'build.js',
      library: {
        name: 'VueNativeSock',
        type: 'umd',
        export: 'default'
      },
      globalObject: 'this'
    }
  },
  // ESM build
  {
    ...baseConfig,
    entry: './src/Main.js',
    experiments: {
      outputModule: true
    },
    externals: {
      vue: 'vue'
    },
    externalsType: 'module',
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: 'build.esm.js',
      library: {
        type: 'module'
      },
      module: true,
      chunkFormat: 'module'
    }
  }
]
