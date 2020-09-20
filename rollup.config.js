import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import { terser } from 'rollup-plugin-terser'

const config = ({ format, output, name, dir }) => ({
  input: 'src/index.ts',
  output: {
    sourcemap: output !== 'dts',
    dir: `dist/${dir || format}`,
    format,
    name,
    entryFileNames: output === 'dts' ? '[name].d.ts' : (process.env.MINIFY === 'true' ? '[name].min.js' : '[name].js'),
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
  plugins: [output === 'dts' ? dts() : typescript()]
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
  config({ format: 'umd', output: 'umd', name: 'MiniSearch' }),
  config({ format: 'es', output: 'dts', dir: 'types' }),
]
