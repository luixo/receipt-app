import { wrapVinxiConfigWithSentry } from "@sentry/tanstackstart-react";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import initModuleAlias, { addAlias } from "module-alias";
import fsp from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { uniwind } from "uniwind/vite";
import { defineConfig } from "vite";
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
	"expo-modules-core",
	"uniwind",
	"react-native-safe-area-context",
	"react-native-reanimated",
	"react-native-worklets",
	// https://github.com/ValentinH/react-easy-crop/issues/490#issuecomment-2034722747
	"react-easy-crop",
	"tslib",
	// SSR has a problem because of default export
	"boring-avatars",
];

const rootDir = path.resolve(url.fileURLToPath(import.meta.url), "../../..");

const webDir = path.join(rootDir, "apps/web");
const config = defineConfig({
	root: rootDir,
	publicDir: path.join(webDir, "public"),
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
		devtools(),
		vitePluginInspect(),
		tailwindcss(),
		uniwind({
			cssEntryFile: path.join(rootDir, "apps/web/src/app.css"),
			dtsFile: path.join(rootDir, "packages/app/uniwind-types.d.ts"),
		}),
		tanstackStart({
			root: webDir,
			tsr: {
				srcDirectory: "./src/entry",
				routesDirectory: "./src/pages",
				routeFileIgnorePattern: "test.",
			},
			customViteReactPlugin: true,
		}),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
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
		viteTsConfigPaths(),
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
await fsp.mkdir(path.resolve(rootDir, "dist")).catch((error) => {
	if (
		typeof error === "object" &&
		error &&
		"code" in error &&
		error.code === "EEXIST"
	) {
		return;
	}
	throw error;
});

export default process.env.NODE_ENV !== "production"
	? config
	: wrapVinxiConfigWithSentry(config, {
			authToken: process.env.SENTRY_AUTH_TOKEN,
			silent: !process.env.CI,
		});
