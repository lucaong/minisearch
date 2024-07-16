import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import terser from '@rollup/plugin-terser'

const config = ({ format, input, output, name, dir, extension = 'js', exports = undefined }) => {
  const shouldMinify = process.env.MINIFY === 'true' && output !== 'dts'

  return {
    input,
    output: {
      sourcemap: output !== 'dts',
      dir: `dist/${dir || format}`,
      exports,
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
    entryFileNames: '[name].cjs',
    plugins: []
  },
  external: ['benchmark'],
  plugins: [typescript()]
}

export default process.env.BENCHMARKS === 'true' ? [benchmarks] : [
  // Main (MiniSearch)
  config({ format: 'es', input: 'src/index.ts', output: 'es6' }),
  config({ format: 'cjs', input: 'src/index.ts', output: 'cjs', dir: 'cjs', extension: 'cjs', exports: 'default' }),
  config({ format: 'umd', input: 'src/index.ts', output: 'umd', name: 'MiniSearch' }),

  // SearchableMap
  config({ format: 'es', input: 'src/SearchableMap/SearchableMap.ts', output: 'es6' }),
  config({ format: 'cjs', input: 'src/SearchableMap/SearchableMap.ts', output: 'cjs', dir: 'cjs', extension: 'cjs', exports: 'default' }),
  config({ format: 'umd', input: 'src/SearchableMap/SearchableMap.ts', output: 'umd', name: 'MiniSearch' }),

  // Type declarations
  config({ format: 'es', input: 'src/index.ts', output: 'dts', extension: 'd.ts' }),
  config({ format: 'es', input: 'src/SearchableMap/SearchableMap.ts', output: 'dts', extension: 'd.ts' }),
  config({ format: 'cjs', input: 'src/index.ts', output: 'dts', extension: 'd.cts' }),
  config({ format: 'cjs', input: 'src/SearchableMap/SearchableMap.ts', output: 'dts', extension: 'd.cts' })
]
