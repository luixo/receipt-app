import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import type { UserConfig } from "vitest/config";
import { configDefaults, defineConfig } from "vitest/config";

const pathToRoot = path.resolve(__dirname, "../..");
export const testsRoot = `${pathToRoot}/apps/next/src/`;

const testConfig: NonNullable<UserConfig["test"]> = {
	globalSetup: "./global.setup.ts",
	setupFiles: "./tests.setup.ts",
	include: [`${pathToRoot}/apps/next/**/*.test.ts`],
	coverage: {
		enabled: true,
		reporter: ["text", "html", "lcov", "json-summary", "json"],
		exclude: [
			...configDefaults.coverage.exclude!,
			`${pathToRoot}/packages/**/*`,
			`${testsRoot}/providers/**/*`,
		],
	},
	experimentalVmThreads: true,
	watch: false,
};

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: testConfig,
});
