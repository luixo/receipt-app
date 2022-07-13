/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	webpack5: true,
	serverRuntimeConfig: {
		port: process.env.PORT,
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
};

const { withExpo } = require("@expo/next-adapter");
const withPlugins = require("next-compose-plugins");
const withTM = require("next-transpile-modules")([
	"solito",
	"dripsy",
	"@dripsy/core",
	"app",
]);

module.exports = withPlugins(
	[withTM, [withExpo, { projectRoot: __dirname }]],
	nextConfig
);
