import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";
import "sharp";

const rootPath = __dirname;
const vitestRoot = path.resolve(rootPath, "testing/vitest");

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		globalSetup: path.resolve(vitestRoot, "./global.setup.ts"),
		coverage: {
			all: true,
			enabled: true,
			skipFull: true,
			thresholds: {
				"100": true,
			},
			reporter: ["text", "html", "lcov", "json-summary", "json"],
			exclude: [
				...(configDefaults.coverage.exclude || []),
				path.resolve(rootPath, "*.config.*"),
				path.resolve(rootPath, "apps/web/src/providers/**/*"),
				path.resolve(rootPath, "apps/web/src/hooks/**/*"),
				path.resolve(rootPath, "apps/web/src/entry/**/*"),
				path.resolve(rootPath, "apps/web/src/pages/*"),
				path.resolve(rootPath, "apps/web/src/pages/!(api)**/*"),
				path.resolve(rootPath, "apps/web/src/utils/navigation.ts"),
				path.resolve(rootPath, "apps/web/src/utils/request.ts"),
				path.resolve(rootPath, "apps/web/src/utils/sentry.ts"),
				path.resolve(rootPath, "apps/web/src/utils/ssr.tsx"),
				path.resolve(rootPath, "apps/web/*.config.*"),
				path.resolve(rootPath, "apps/mobile/**/*"),
				path.resolve(rootPath, "packages/app/**/*"),
				path.resolve(rootPath, "packages/utils/**/*"),
				path.resolve(rootPath, "packages/components/**/*"),
				path.resolve(rootPath, "packages/mutations/**/*"),
				path.resolve(rootPath, "packages/db/!(src)/**/*"),
				path.resolve(rootPath, "scripts/**/*"),
				path.resolve(rootPath, "testing/playwright/**/*"),
				path.resolve(vitestRoot, "**/*"),
			],
			allowExternal: true,
			reportsDirectory: path.resolve(vitestRoot, "./coverage"),
		},
		workspace: ["apps/*/vitest.config.ts", "packages/*/vitest.config.ts"],
		pool: "vmThreads",
		env: {
			// This regulates timezone with which expected dates are creates in tests
			TZ: "UTC",
		},
		watch: false,
		retry: process.env.CI ? 2 : 0,
	},
});
