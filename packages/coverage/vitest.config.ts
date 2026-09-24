import { defineProject } from "vitest/config";

export default defineProject({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		name: "coverage",
		include: ["src/**/*.test.ts"],
		// Native bindings (e.g. rolldown) reject values created in `vmThreads` contexts
		pool: "threads",
	},
});
