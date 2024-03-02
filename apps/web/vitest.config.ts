import path from "node:path";

import { withSharedConfig } from "~tests/backend/shared-config";

const vitestRoot = path.join(__dirname, "../../testing/vitest");

export default withSharedConfig("web", {
	test: {
		setupFiles: path.resolve(vitestRoot, "./database.setup.ts"),
		exclude: ["**/utils.test.ts"],
	},
});
