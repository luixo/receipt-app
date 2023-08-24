import hq from "alias-hq";
import type { Config } from "jest";

const config: Config = {
	roots: ["<rootDir>"],
	testMatch: ["**/?(*.)+(spec|test).+(ts|tsx|js)"],
	transform: {
		"^.+\\.tsx?$": ["esbuild-jest", { sourcemap: true, target: "es2021" }],
	},
	testPathIgnorePatterns: ["<rootDir>/apps/next/.next", ".history"],
	transformIgnorePatterns: ["/node_modules/"],
	moduleNameMapper: hq.get("jest"),
	globalSetup: "<rootDir>/apps/next/tests/global/setup.ts",
	globalTeardown: "<rootDir>/apps/next/tests/global/teardown.ts",
	setupFilesAfterEnv: ["<rootDir>/apps/next/tests/database.setup.ts"],
	collectCoverage: true,
	coverageProvider: "v8",
	globals: {
		routerConfig: {},
	},
};

export default config;
