const { withGradleProperties } = require('@expo/config-plugins');

// Restricts the native Android build to arm64-v8a only. Skips 32-bit ARM
// (armeabi-v7a, which crashed the NDK compiler on this machine) and both
// x86 variants (only needed for emulators, not for a real device).
module.exports = function withArm64OnlyBuild(config) {
  return withGradleProperties(config, (config) => {
    const key = 'reactNativeArchitectures';
    const value = 'arm64-v8a';
    const existing = config.modResults.find(
      (item) => item.type === 'property' && item.key === key
    );
    if (existing) {
      existing.value = value;
    } else {
      config.modResults.push({ type: 'property', key, value });
    }
    return config;
  });
};
