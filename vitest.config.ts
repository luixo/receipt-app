import path from "node:path";
import { defineConfig } from "vitest/config";

const rootPath = import.meta.dirname;
const vitestRoot = path.resolve(rootPath, "testing/vitest");

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		globalSetup: path.resolve(vitestRoot, "./global.setup.ts"),
		coverage: {
			enabled: true,
			skipFull: true,
			thresholds: {
				"100": true,
			},
			reporter: ["text", "html", "lcov", "json-summary", "json"],
			include: ["apps/web/src/**/*.{ts,tsx}", "packages/db/src/**/*.{ts,tsx}"],
			exclude: [
				path.resolve(rootPath, "apps/web/src/providers/**/*"),
				path.resolve(rootPath, "apps/web/src/hooks/**/*"),
				path.resolve(rootPath, "apps/web/src/entry/**/*"),
				path.resolve(rootPath, "apps/web/src/pages/*"),
				path.resolve(rootPath, "apps/web/src/pages/!(api)**/*"),
				// TODO: untested — see /api/mcp follow-up
				path.resolve(rootPath, "apps/web/src/pages/api/mcp/**/*"),
				path.resolve(rootPath, "apps/web/src/utils/navigation.ts"),
				path.resolve(rootPath, "apps/web/src/utils/request.ts"),
				path.resolve(rootPath, "apps/web/src/utils/sentry.ts"),
				path.resolve(rootPath, "apps/web/src/utils/ssr.tsx"),
				path.resolve(rootPath, "apps/web/src/utils/store.ts"),
				path.resolve(rootPath, "apps/web/src/utils/storage.ts"),
				path.resolve(rootPath, "apps/web/src/utils/i18n.ts"),
			],
			allowExternal: true,
			reportsDirectory: path.resolve(vitestRoot, "./coverage"),
		},
		projects: ["apps/*/vitest.config.ts", "packages/*/vitest.config.ts"],
		pool: "vmThreads",
		env: {
			// This regulates timezone with which expected dates are creates in tests
			TZ: "UTC",
		},
		watch: false,
		retry: process.env.CI ? 2 : 0,
	},
});
