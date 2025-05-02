import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineProject } from "vitest/config";

const vitestRoot = path.join(__dirname, "../../testing/vitest");

export default defineProject({
	plugins: [tsconfigPaths()],
	test: {
		name: "web",
		setupFiles: path.resolve(vitestRoot, "./database.setup.ts"),
		exclude: ["**/utils.test.ts"],
	},
});
