// Hermes (React Native runtime) has no native `Temporal`, so we ship the polyfill and assign it to the global.
import "~utils/temporal-polyfill";
// It is expected to have .js extensions for these polyfills
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
import "expo-router/entry";
