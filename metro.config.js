const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ─── Fix 1: strip expo/src/winter + @expo/metro-runtime from runBeforeMainModule ───
// Defence-in-depth: remove winter runtime from run-before-main list.
const originalGetModules = config.serializer.getModulesRunBeforeMainModule;
config.serializer.getModulesRunBeforeMainModule = () => {
  const modules = originalGetModules();
  return modules.filter(
    m =>
      !m.includes('expo/src/winter') &&
      !m.includes('@expo/metro-runtime'),
  );
};

// ─── Fix 2: block expo/virtual/streams.js from the polyfills list ─────────────────
// @expo/cli's withWebPolyfills() runs AFTER metro.config.js is loaded and directly
// replaces config.serializer.getPolyfills with a version that appends
// expo/virtual/streams.js for every platform (iOS, Android, web).
//
// expo/virtual/streams.js is a pre-built copy of web-streams-polyfill emitted as a
// "js/script" polyfill (= raw IIFE, no __d() wrapper).  That IIFE contains
// require("@babel/runtime/helpers/defineProperty"), which runs BEFORE the Metro
// module system (__d / require) is initialised.  JSC on iOS has no built-in
// require() → crash: "Property 'require' doesn't exist".
//
// React Native already provides ReadableStream natively on iOS/Android; the polyfill
// is only needed for web.  We wrap the customSerializer so that, regardless of what
// getPolyfills ultimately produces, we strip the streams polyfill from preModules
// before the bundle is serialised on native platforms.
const originalCustomSerializer = config.serializer.customSerializer ?? null;

config.serializer.customSerializer = async (entryPoint, preModules, graph, options) => {
  const platform = graph?.transformOptions?.platform;

  // Strip expo/virtual/streams.js from preModules on native platforms.
  // It is a js/script polyfill that contains require() calls which crash JSC
  // before the module system is ready.
  let filteredPreModules = preModules;
  if (platform === 'ios' || platform === 'android') {
    filteredPreModules = preModules.filter(
      m => !m.path || !m.path.includes('expo/virtual/streams'),
    );
  }

  if (originalCustomSerializer) {
    return originalCustomSerializer(entryPoint, filteredPreModules, graph, options);
  }

  // Fallback: use the default Metro serializer (bundleToString + baseJSBundle).
  // This path is only reached if no customSerializer was set by @expo/metro-config,
  // which should not happen in practice.
  const { default: baseJSBundle } = require('@expo/metro/metro/DeltaBundler/Serializers/baseJSBundle');
  const { default: bundleToString } = require('@expo/metro/metro/lib/bundleToString');
  return bundleToString(baseJSBundle(entryPoint, filteredPreModules, graph, options)).code;
};

// ─── Resolver ─────────────────────────────────────────────────────────────────────
// Disable package exports to use CJS builds and avoid Supabase circular deps.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
