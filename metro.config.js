const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Performance optimizations
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Enable faster bundling
config.transformer.enableBabelRCLookup = false;
config.transformer.enableBabelRuntime = false;

// Optimize bundle size
config.resolver.assetExts.push('bin');

module.exports = config;