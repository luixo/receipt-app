import path from "node:path";

import { withSharedConfig } from "~tests/backend/shared-config";

const vitestRoot = path.join(__dirname, "../../testing/vitest");

export default withSharedConfig("web", {
	test: {
		setupFiles: path.resolve(vitestRoot, "./database.setup.ts"),
		// https://github.com/vitest-dev/vitest/issues/5318
		// Move to a global vitest.config.ts as issue gets resolved
		globalSetup: path.resolve(vitestRoot, "./global.setup.ts"),
		exclude: ["**/utils.test.ts"],
	},
});
