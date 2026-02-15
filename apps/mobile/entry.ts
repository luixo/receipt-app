// If you skip this - the app will fail to run
// Not sure why this is happening
// Seems like Expo Router should import that before it runs SafeAreaView context
// But it does not
// Expo Go version of the app runs ok nevertheless
import "react-native/Libraries/Renderer/shims/ReactNative";
// It is expected to have .js extensions for these polyfills
/* eslint-disable import-x/extensions,import-x/no-unresolved */
import "@formatjs/intl-pluralrules/polyfill-force.js";
import "@formatjs/intl-pluralrules/locale-data/en.js";
import "@formatjs/intl-pluralrules/locale-data/ru.js";
import "@formatjs/intl-locale/polyfill-force.js";
import "@formatjs/intl-displaynames/polyfill-force.js";
import "@formatjs/intl-displaynames/locale-data/en.js";
import "@formatjs/intl-displaynames/locale-data/ru.js";
import "@formatjs/intl-numberformat/polyfill-force.js";
import "@formatjs/intl-numberformat/locale-data/en.js";
import "@formatjs/intl-numberformat/locale-data/ru.js";
/* eslint-enable import-x/extensions,import-x/no-unresolved */
import "expo-router/entry";
