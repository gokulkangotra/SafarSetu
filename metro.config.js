// metro.config.js — Fix css-tree ESM issue from react-native-svg
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package.json "exports" field resolution.
// react-native-svg depends on css-tree which uses ESM "exports" only,
// which Metro (CommonJS bundler) cannot resolve — this disables that behaviour.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
