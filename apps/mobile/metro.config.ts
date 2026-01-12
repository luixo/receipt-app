import { getDefaultConfig } from "expo/metro-config.js";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { withUniwindConfig } =
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	require("uniwind/metro") as typeof import("uniwind/metro");

const projectRoot = import.meta.dirname;
const defaultConfig = getDefaultConfig(projectRoot, {});

const config = withUniwindConfig(
	// @ts-expect-error Types slightly diverge here
	defaultConfig satisfies Parameters<typeof withUniwindConfig>[0],
	{
		cssEntryFile: "./app.css",
		dtsFile: path.join(projectRoot, "../../packages/app/uniwind-types.d.ts"),
	},
);

export default config;
