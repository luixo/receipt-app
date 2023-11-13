import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import type { UserConfig } from "vitest/config";
import { configDefaults, defineConfig } from "vitest/config";

export const rootPath = path.resolve(__dirname, "../..");
export const testsRoot = path.resolve(rootPath, "apps/next/src");
const vitestRoot = path.resolve(rootPath, "testing/vitest");

const testConfig: NonNullable<UserConfig["test"]> = {
	root: rootPath,
	globalSetup: path.resolve(vitestRoot, "./global.setup.ts"),
	setupFiles: path.resolve(vitestRoot, "./tests.setup.ts"),
	include: [path.resolve(testsRoot, "**/*.test.ts")],
	exclude: [...configDefaults.exclude, "**/utils.test.ts"],
	coverage: {
		enabled: false,
		reporter: ["text", "html", "lcov", "json-summary", "json"],
		exclude: [
			...configDefaults.coverage.exclude!,
			path.resolve(rootPath, "packages/**/*"),
			path.resolve(testsRoot, "providers/**/*"),
			path.resolve(vitestRoot, "**/*"),
		],
		allowExternal: true,
		reportsDirectory: path.resolve(vitestRoot, "./coverage"),
	},
	experimentalVmThreads: true,
	watch: false,
};

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: testConfig,
});
