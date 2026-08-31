import type { FullConfig } from "@playwright/test";

import type { promisifyServer } from "~utils/promise";

const globalTeardown = async (config: FullConfig) => {
	await (
		config.metadata.portManagerServer as ReturnType<typeof promisifyServer>
	).close();
};

export default globalTeardown;
