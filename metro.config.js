// metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Web preview with fake data (see preview/README.md). Off unless GOSWING_PREVIEW=1.
if (process.env.GOSWING_PREVIEW === '1') {
  const p = (f) => path.resolve(__dirname, 'preview', f);
  const aliases = {
    '@clerk/clerk-expo': p('mocks/clerk.tsx'),
    'react-native-maps': p('mocks/maps.tsx'),
    'expo-location': p('mocks/location.ts'),
  };
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (aliases[moduleName]) return { type: 'sourceFile', filePath: aliases[moduleName] };
    if (moduleName === '../../App' && context.originModulePath.includes(`${path.sep}expo${path.sep}AppEntry`)) {
      return { type: 'sourceFile', filePath: p('PreviewApp.tsx') };
    }
    return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = withNativeWind(config, { input: './style/globals.css' });
