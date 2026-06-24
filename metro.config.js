const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('@expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Expo SDK 53 + Firebase JS SDK: https://docs.expo.dev/guides/using-firebase/#configure-metro
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

// Required by EAS Build validation (hashAssetFiles plugin check).
config.transformer.assetPlugins = [
  ...(config.transformer.assetPlugins ?? []),
  require.resolve('expo-asset/tools/hashAssetFiles'),
];

module.exports = config;
