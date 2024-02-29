import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";
import "sharp";

const rootPath = __dirname;
const vitestRoot = path.resolve(rootPath, "testing/vitest");

export default defineConfig({
	test: {
		coverage: {
			all: false,
			enabled: true,
			skipFull: true,
			thresholds: {
				"100": true,
			},
			reporter: ["text", "html", "lcov", "json-summary", "json"],
			exclude: [
				...(configDefaults.coverage.exclude || []),
				path.resolve(rootPath, "apps/web/src/providers/**/*"),
				path.resolve(rootPath, "packages/app/**/*"),
				path.resolve(rootPath, "packages/utils/**/*"),
				path.resolve(vitestRoot, "**/*"),
			],
			allowExternal: true,
			reportsDirectory: path.resolve(vitestRoot, "./coverage"),
		},
		pool: "vmThreads",
		watch: false,
	},
});
