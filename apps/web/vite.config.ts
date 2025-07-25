import { wrapVinxiConfigWithSentry } from "@sentry/tanstackstart-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import initModuleAlias, { addAlias } from "module-alias";
import fsp from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { analyzer } from "vite-bundle-analyzer";
import { cjsInterop } from "vite-plugin-cjs-interop";
import commonjs from "vite-plugin-commonjs";
import vitePluginInspect from "vite-plugin-inspect";
import reactNativeWeb from "vite-plugin-react-native-web";
import viteTsConfigPaths from "vite-tsconfig-paths";

// This is the only way I found to make SSR render with `react-native-web` so far
initModuleAlias();
addAlias("react-native", "react-native-web");

const optimizedDeps = [
	"react-native-web",
	"@expo/html-elements",
	"expo-modules-core",
	"nativewind",
	"react-native-css-interop",
	"react-native-safe-area-context",
	// https://github.com/ValentinH/react-easy-crop/issues/490#issuecomment-2034722747
	"react-easy-crop",
	"tslib",
	// SSR has a problem because of default export
	"boring-avatars",
];

const rootDir = path.resolve(url.fileURLToPath(import.meta.url), "../../..");

const replaceImportPlugin = (
	baseDir: string,
	sources: Partial<Record<string, string>>,
	ignoreFn: (
		// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
		options: Parameters<Extract<NonNullable<Plugin["resolveId"]>, Function>>[2],
	) => boolean = () => false,
): Plugin => ({
	name: "react-native-css-interop-src",
	enforce: "pre",
	resolveId: (source, _importer, options) => {
		if (ignoreFn(options)) {
			return;
		}
		const matchedSource = sources[source];
		if (!matchedSource) {
			return;
		}
		return path.join(baseDir, "node_modules", matchedSource);
	},
});

const config = defineConfig({
	resolve: {
		extensions: [
			// Prioritizing .ts(x) over .js(x) to keep proper imports
			".web.tsx",
			".tsx",
			".web.mts",
			".mts",
			".web.ts",
			".ts",
			".web.jsx",
			".jsx",
			".web.mjs",
			".mjs",
			".web.js",
			".js",
			".json",
		],
	},
	plugins: [
		vitePluginInspect(),
		tanstackStart({
			tsr: {
				srcDirectory: "./src/entry",
				routesDirectory: "./src/pages",
				routeFileIgnorePattern: "test.",
			},
			react: {
				jsxImportSource: "nativewind",
				babel: {
					presets: ["nativewind/babel"],
					plugins: [["babel-plugin-react-compiler", {}]],
				},
			},
		}),
		replaceImportPlugin(
			rootDir,
			// A mix of CJS and ESM in SSR in nativewind / react-native-css-interop is a mess
			// We better import source typescript that Vite will process on its own
			{
				"react-native-css-interop/jsx-runtime":
					"react-native-css-interop/src/runtime/jsx-runtime.ts",
				"nativewind/jsx-runtime":
					"react-native-css-interop/src/runtime/jsx-runtime.ts",
				"react-native-css-interop/jsx-dev-runtime":
					"react-native-css-interop/src/runtime/jsx-dev-runtime.ts",
				"nativewind/jsx-dev-runtime":
					"react-native-css-interop/src/runtime/jsx-dev-runtime.ts",
				nativewind: "nativewind/src/index.tsx",
				"react-native-css-interop/runtime":
					"react-native-css-interop/src/runtime/index.ts",
				"react-native-css-interop": "react-native-css-interop/src/index.ts",
				"react-native-css-interop/runtime/components":
					"react-native-css-interop/src/runtime/components.ts",
			},
			// We skip import only client-side in dev environment
			// Because gods told us so (also, experiments)
			(options) => !options.ssr && process.env.NODE_ENV !== "production",
		),
		// Aliasing a component remap so it can be imported
		replaceImportPlugin(rootDir, {
			"react-native-css-interop/runtime/components":
				"react-native-css-interop/src/runtime/components.ts",
		}),
		commonjs({
			filter: (id) =>
				optimizedDeps.some((dep) => id.includes(`node_modules/${dep}/`)),
		}),
		reactNativeWeb(),
		cjsInterop({
			dependencies: [
				// This is needed on SSR when we import CJS modules from ESM `react-native-web`
				// Whenever you get `<...>.default() is not a function, add an imported CJS module in here
				"inline-style-prefixer/lib/plugins/backgroundClip",
				"inline-style-prefixer/lib/plugins/crossFade",
				"inline-style-prefixer/lib/plugins/cursor",
				"inline-style-prefixer/lib/plugins/filter",
				"inline-style-prefixer/lib/plugins/imageSet",
				"inline-style-prefixer/lib/plugins/logical",
				"inline-style-prefixer/lib/plugins/position",
				"inline-style-prefixer/lib/plugins/sizing",
				"inline-style-prefixer/lib/plugins/transition",
				"inline-style-prefixer/lib/createPrefixer",
			],
		}),
		viteTsConfigPaths({
			projects: ["../../tsconfig.json"],
		}),
		analyzer({
			analyzerMode: "json",
			enabled: Boolean(process.env.ANALYZE_BUNDLE),
		}),
	],
	ssr: {
		noExternal: optimizedDeps,
	},
	optimizeDeps: {
		exclude: ["sharp"],
	},
	server: {
		port: Number(process.env.PORT) || 3000,
	},
});

// We need this to place stats.json
await fsp.mkdir("dist").catch(() => {});

export default process.env.NODE_ENV !== "production"
	? config
	: wrapVinxiConfigWithSentry(config, {
			authToken: process.env.SENTRY_AUTH_TOKEN,
			silent: !process.env.CI,
		});
