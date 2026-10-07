import { Plugin } from "@opencode/plugin";
import { execFile } from "node:child_process";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { isNonNullish } from "remeda";

// oxlint-disable-next-line typescript/strict-void-return
const execFileAsync = promisify(execFile);

const ENV_FILE = ".env.local";
const MIN_PORT = 3700;
const ENV_DEFAULT_KEYS = [
	"CACHE_DATABASE_URL",
	"ERA_API_KEY",
	"S3_BUCKET",
	"S3_ENDPOINT",
	"S3_REGION",
	"S3_ACCESS_KEY_ID",
	"S3_SECRET_KEY",
] as const;

const parseEnv = async (envPath: string) => {
	const contents = await readFile(envPath, "utf8").catch(() => "");
	return Object.assign(
		{},
		...contents
			.split("\n")
			.map((line) => {
				const [key, ...rest] = line.trim().split("=");
				if (!key) {
					return null;
				}
				return { [key]: rest.join("=") };
			})
			.filter(Boolean),
	) as Record<string, string>;
};

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

	const envFiles = await Promise.all(
		worktrees.map((worktree) => parseEnv(path.join(worktree, ENV_FILE))),
	);

	const ports = envFiles.flatMap((envFile) => envFile.PORT);
	return new Set(ports.map(Number));
};

const assignWorktreeLocalEnv = async (directory: string, canonical: string) => {
	const linesToAdd = [];
	const currentEnv = await parseEnv(path.join(directory, ENV_FILE));
	const exampleEnv = await parseEnv(path.join(canonical, ".env.example"));
	for (const key of ENV_DEFAULT_KEYS) {
		if (currentEnv[key]) {
			continue;
		}
		if (!exampleEnv[key]) {
			throw new Error(`Missing ${key} in .env.example`);
		}
		linesToAdd.push(`${key}=${exampleEnv[key]}`);
	}
	if (!currentEnv.PORT) {
		const busyPorts = await collectBusyPorts(directory);
		let port = MIN_PORT;
		while (busyPorts.has(port)) {
			port += 1;
		}
		linesToAdd.push(`PORT=${port}`);
	}

	if (linesToAdd.length !== 0) {
		await appendFile(
			path.join(directory, ENV_FILE),
			`\n${linesToAdd.join("\n")}`,
			{ encoding: "utf8" },
		);
	}
};

const runSubscription = async (
	ctx: Plugin.Context,
	controller: AbortController,
) => {
	for await (const event of ctx.event.subscribe({
		signal: controller.signal,
	})) {
		if (
			event.type !== "session.created" ||
			event.data.projectID !== ctx.location.project.id
		) {
			continue;
		}
		try {
			await assignWorktreeLocalEnv(
				event.data.location.directory,
				ctx.location.project.canonical,
			);
		} catch (error) {
			// oxlint-disable-next-line eslint/no-console
			console.error("Failed to initialize worktree port", error);
		}
	}
};

// oxlint-disable-next-line import/no-default-export
export default Plugin.define({
	id: "init-worktree-once",
	setup: (ctx) => {
		if (ctx.location.directory !== ctx.location.project.canonical) {
			return;
		}
		const controller = new AbortController();
		void runSubscription(ctx, controller);
		return () => controller.abort();
	},
});
