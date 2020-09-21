import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import { terser } from 'rollup-plugin-terser'

const config = ({ format, input, output, name, dir, extension = 'js' }) => {
  const shouldMinify = process.env.MINIFY === 'true' && output !== 'dts'

  return {
    input,
    output: {
      sourcemap: output !== 'dts',
      dir: `dist/${dir || format}`,
      format,
      name,
      entryFileNames: shouldMinify ? `[name].min.${extension}` : `[name].${extension}`,
      plugins: shouldMinify
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
  }
}

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
  // Main (MiniSearch)
  config({ format: 'es', input: 'src/index.ts', output: 'es6' }),
  config({ format: 'es', input: 'src/index.ts', output: 'es5m', dir: 'es5m' }),
  config({ format: 'umd', input: 'src/index.ts', output: 'umd', name: 'MiniSearch' }),

  // Type declarations
  config({ format: 'es', input: 'src/index.ts', output: 'dts', dir: 'types', extension: 'd.ts' }),

  // SearchableMap
  config({ format: 'es', input: 'src/SearchableMap/SearchableMap.ts', output: 'es6' }),
  config({ format: 'es', input: 'src/SearchableMap/SearchableMap.ts', output: 'es5m', dir: 'es5m' }),
  config({ format: 'umd', input: 'src/SearchableMap/SearchableMap.ts', output: 'umd', name: 'MiniSearch' })
]
