import { withExpo } from "@expo/next-adapter";
import NextBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

// TODO: import from providers/s3.ts when migrating to next.config.ts
const S3_AVATAR_PREFIX = "avatars";
const getS3Parts = () => {
	const s3Bucket = process.env.S3_BUCKET;
	if (!s3Bucket) {
		throw new Error("Expected to have process.env.S3_BUCKET variable!");
	}
	const s3Endpoint = process.env.S3_ENDPOINT;
	if (!s3Endpoint) {
		throw new Error("Expected to have process.env.S3_ENDPOINT variable!");
	}
	return { s3Endpoint, s3Bucket };
};

const s3Parts = getS3Parts();

/** @type {import('next').NextConfig} */
const nextConfig = {
	// see https://github.com/vercel/next.js/issues/70938
	swcMinify: false,
	reactStrictMode: true,
	eslint: {
		ignoreDuringBuilds: true,
	},
	transpilePackages: [
		"react-native",
		"react-native-web",
		"solito",
		"@expo/html-elements",
		"expo-modules-core",
		"nativewind",
		"react-native-css-interop",
	],
	experimental: {
		optimizeCss: true,
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: new URL(s3Parts.s3Endpoint).hostname,
				port: "",
				pathname: ["", s3Parts.s3Bucket, S3_AVATAR_PREFIX, "**"].join("/"),
			},
		],
	},
};

const plugins = [
	process.env.NODE_ENV !== "production"
		? undefined
		: (config) => withSentryConfig(config, { silent: true }),
	(config) => withExpo(config),
	async (config) => {
		if (process.env.ANALYZE_BUNDLE) {
			return NextBundleAnalyzer()(config);
		}
		return config;
	},
].filter(Boolean);

export default plugins.reduce((acc, plugin) => plugin(acc), nextConfig);
