// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support
  isCSSEnabled: true,
});

// Add custom file extensions to support
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
  'cjs',
  'jsx',
  'tsx',
  'ts',
  'js'
];

// Add custom asset extensions
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'db',
  'sqlite'
];

// Configure transformer
config.transformer = {
  ...config.transformer,
  enableBabelRuntime: true,
  experimentalImportSupport: false,
  unstable_allowRequireContext: true,
  babelTransformerPath: require.resolve('react-native-svg-transformer')
};

module.exports = config;