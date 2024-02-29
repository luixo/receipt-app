import tsconfigPaths from "vite-tsconfig-paths";
import type { UserWorkspaceConfig } from "vitest";
import { defineProject, mergeConfig } from "vitest/config";

const originalConfig: UserWorkspaceConfig = {
	plugins: [tsconfigPaths()],
	test: {
		retry: process.env.CI ? 2 : 0,
	},
};

export const withSharedConfig = (
	name: string,
	mergedConfig: UserWorkspaceConfig,
) =>
	defineProject(
		mergeConfig(
			{ ...originalConfig, test: { ...originalConfig.test, name } },
			mergedConfig,
		),
	);
