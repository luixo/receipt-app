// TODO: put back when getting back to Expo
const { withExpo } = require("@expo/next-adapter");
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	serverRuntimeConfig: {
		port: process.env.PORT,
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	transpilePackages: [
		"react-native",
		"react-native-web",
		"solito",
		"@expo/html-elements",
		"expo-constants",
		"expo-modules-core",
		"nativewind",
		"react-native-css-interop",
	],
	// see patch
	ignorePages: "\\.spec\\.tsx?$",
};

const plugins = [
	(config) => withSentryConfig(config, { silent: true }),
	(config) => withExpo(config),
];
module.exports = plugins.reduce((acc, plugin) => plugin(acc), nextConfig);
