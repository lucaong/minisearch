import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'

const config = ({ format, output, name, dir }) => ({
  input: 'src/index.ts',
  output: {
    sourcemap: true,
    dir: `dist/${dir || format}`,
    format,
    name,
    entryFileNames: process.env.MINIFY === 'true' ? '[name].min.js' : '[name].js',
    plugins: process.env.MINIFY === 'true'
      ? [terser({
        mangle: {
          properties: {
            regex: /^_/
          }
        }
      })]
      : []
  },
  plugins: [typescript()]
})

const benchmarks = {
  input: 'benchmarks/index.js',
  output: {
    sourcemap: true,
    dir: 'benchmarks/dist',
    format: 'commonjs',
    entryFileNames: '[name].js',
    plugins: []
  },
  plugins: [typescript()]
}

export default process.env.BENCHMARKS === 'true' ? [benchmarks] : [
  config({ format: 'es', output: 'es6' }),
  config({ format: 'es', output: 'es5m', dir: 'es5m' }),
  config({ format: 'umd', output: 'es5m', name: 'MiniSearch' }),
]
