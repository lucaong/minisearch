const CONFIG = {
  default: {
    plugins: [
      '@babel/plugin-proposal-object-rest-spread'
    ],
  },
  commonjs: {
    presets: [
      ['@babel/preset-env', {
        loose: true,
        targets: {
          node: '10'
        }
      }]
    ],
  },
  es5m: {
    presets: [
      ['@babel/preset-env', {
        modules: false,
        loose: true,
        targets: {
          browsers: ['last 3 versions']
        }
      }]
    ],
  },
  test: {
    presets: [
      ['@babel/preset-env', {
        loose: true,
        targets: {
          node: '10'
        }
      }]
    ],
  }
};

module.exports = (api) => {
  let format;
  api.caller(caller => format = caller.output || process.env.BABEL_OUTPUT || process.env.NODE_ENV);
  api.cache.using(() => format);

  if (format === 'default' || !CONFIG[format]) {
    return CONFIG.default;
  }

  const { presets = [], plugins = [] } = CONFIG[format];

  return {
    presets: presets.concat(CONFIG.default.presets || []),
    plugins: plugins.concat(CONFIG.default.plugins || []),
  };
};
