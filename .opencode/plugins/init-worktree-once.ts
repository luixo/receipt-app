import type { Plugin } from "@opencode-ai/plugin";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";

import { getFreePort } from "../../packages/utils/src/server/port.ts";

const ENV_FILE = ".env.local";

const assignWorktreePort = async (directory: string) => {
	const envFile = path.join(directory, ENV_FILE);
	const hasPort = await readFile(envFile)
		.then((content) => content.includes("PORT="))
		.catch(() => false);

	if (hasPort) {
		return;
	}

	const port = await getFreePort();
	await appendFile(envFile, `PORT=${port}\n`);
};

export const InitWorktreeOnce: Plugin = () =>
	Promise.resolve({
		event: async ({ event }) => {
			if (event.type === "session.created") {
				await assignWorktreePort(event.properties.info.directory);
			}
		},
	});
