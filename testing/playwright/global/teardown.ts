import type { FullConfig } from "@playwright/test";
import type * as http from "node:http";

const globalTeardown = async (config: FullConfig) => {
	await new Promise<void>((resolve, reject) => {
		(config.metadata.portManagerServer as http.Server).close((err) =>
			err ? reject(err) : resolve(),
		);
	});
};

export default globalTeardown;
