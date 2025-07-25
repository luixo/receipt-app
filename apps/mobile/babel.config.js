/* eslint-disable unicorn/prefer-module */
const config = (api) => {
	api.cache(true);
	return {
		presets: [
			["babel-preset-expo", { jsxImportSource: "nativewind" }],
			"nativewind/babel",
		],
		plugins: ["react-native-reanimated/plugin"],
	};
};

module.exports = config;
