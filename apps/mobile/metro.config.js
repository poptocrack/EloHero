const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add CJS support for Firebase
config.resolver.sourceExts.push('cjs');

// Disable the package exports feature that's breaking Firebase
config.resolver.unstable_enablePackageExports = false;

// Ensure proper resolution of Firebase modules
config.resolver.alias = {
  ...config.resolver.alias,
  firebase: require.resolve('firebase'),
};

module.exports = config;
