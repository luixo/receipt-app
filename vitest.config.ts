import tsconfigPaths from "vite-tsconfig-paths";
import type { UserConfig } from "vitest/config";
import { configDefaults, defineConfig } from "vitest/config";

const testConfig: NonNullable<UserConfig["test"]> = {
	globalSetup: "./apps/next/tests/global.setup.ts",
	setupFiles: "./apps/next/tests/tests.setup.ts",
	exclude: [...configDefaults.exclude, "./apps/next/.next/**/*", ".history"],
	coverage: {
		enabled: true,
		reporter: ["text", "html", "lcov", "json-summary", "json"],
		exclude: [
			...configDefaults.coverage.exclude!,
			"packages/**/*",
			"apps/next/tests/**/*",
			"apps/next/src/cache-db/index.ts",
			"apps/next/src/handlers/context.ts",
			"apps/next/src/providers/exchange-rate.ts",
			"apps/next/src/utils/email.ts",
		],
	},
	experimentalVmThreads: true,
	watch: false,
};

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: testConfig,
});
