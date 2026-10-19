import type { Config } from "@luixo/configs";

const config: Config = {
	preCommitCommands: [
		"bun install --frozen-lockfile",
		"bun typecheck",
		"bun lint",
		"bun format:verify",
	],
};

export default config;
