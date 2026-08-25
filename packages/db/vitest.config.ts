import path from "node:path";
import { defineProject } from "vitest/config";

const vitestRoot = path.join(import.meta.dirname, "../../testing/vitest");

export default defineProject({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		name: "db",
		setupFiles: path.resolve(vitestRoot, "./database.setup.ts"),
		include: ["src/**/*.test.ts"],
	},
});
