/* eslint-disable unicorn/prefer-module */
const config = (api) => {
	api.cache(true);
	return {
		presets: ["babel-preset-expo"],
		plugins: ["react-native-reanimated/plugin"],
	};
};

module.exports = config;
