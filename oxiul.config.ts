import type { Config } from "@oxiul/configs";

import { workflows } from "./.github/workflows.ts";

const config: Config = {
	preCommitCommands: [
		"bun install --frozen-lockfile",
		"bun typecheck",
		"bun lint",
		"bun format:verify",
		"bun workflows",
		"bun oxiul:verify",
	],
	workflows,
};

export default config;
