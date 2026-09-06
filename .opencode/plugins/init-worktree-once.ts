import type { Plugin } from "@opencode-ai/plugin";
import { execFile } from "node:child_process";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { isNonNullish } from "remeda";

// oxlint-disable-next-line typescript/strict-void-return
const execFileAsync = promisify(execFile);

const ENV_FILE = ".env.local";
const MIN_PORT = 3700;

const collectBusyPorts = async (directory: string) => {
	const { stdout } = await execFileAsync("git", [
		"-C",
		directory,
		"worktree",
		"list",
		"--porcelain",
	]);
	const worktrees = stdout
		.split(/^worktree /m)
		.slice(1)
		.map((block) => block.split("\n")[0])
		.filter(isNonNullish);

	const contents = await Promise.all(
		worktrees.map((worktree) =>
			readFile(path.join(worktree, ENV_FILE), "utf8").catch(() => ""),
		),
	);

	const ports = contents.flatMap((fileContent) =>
		fileContent.split("\n").flatMap((line) => {
			const match = /^PORT=(?<port>\d+)/.exec(line.trim());
			return match ? [Number(match.groups?.port)] : [];
		}),
	);
	return new Set(ports);
};

const assignWorktreePort = async (directory: string) => {
	const envFile = path.join(directory, ENV_FILE);
	const hasPort = await readFile(envFile)
		.then((fileContent) => fileContent.includes("PORT="))
		.catch(() => false);

	if (hasPort) {
		return;
	}

	const busyPorts = await collectBusyPorts(directory);
	let port = MIN_PORT;
	while (busyPorts.has(port)) {
		port += 1;
	}
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
