const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// getSentryExpoConfig already extends Expo's default config
// It should properly handle the entry point from package.json
const config = getSentryExpoConfig(__dirname);

module.exports = config;

