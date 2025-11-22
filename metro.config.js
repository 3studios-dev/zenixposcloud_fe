const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// 👉 aggiungiamo il supporto SVG
config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts.push("svg");

// 👉 manteniamo NativeWind
module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: 16,
});
