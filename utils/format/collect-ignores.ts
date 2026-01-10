import ignoreWalk from "ignore-walk";
import fs from "node:fs/promises";
import path from "node:path";

const prettierIgnore = ".prettierignore";
const gitIgnore = ".gitignore";
const globalPrettierIgnore = `${prettierIgnore}-root`;

export const collectIgnoreRules = async () => {
	const rootDir = path.join(import.meta.dirname, "../..");
	const allFiles = await ignoreWalk({
		path: rootDir,
		ignoreFiles: [gitIgnore],
	});
	const notGitFiles = allFiles.filter((file) => !file.startsWith(".git/"));
	const ignoreFiles = notGitFiles
		.filter((file) =>
			[gitIgnore, prettierIgnore, globalPrettierIgnore].some((ignorePath) =>
				file.endsWith(ignorePath),
			),
		)
		// Global file will be a collection of all of them
		.filter((file) => file !== prettierIgnore);
	const files = await Array.fromAsync(
		ignoreFiles.map(
			async (file) =>
				[file, await fs.readFile(path.join(rootDir, file), "utf8")] as const,
		),
	);
	const prettierIgnoreFile = files
		.map(([filename, content]) =>
			[`### File '${filename}' ###`, content].join("\n\n"),
		)
		.join("\n\n");
	await fs.writeFile(path.join(rootDir, prettierIgnore), prettierIgnoreFile);
};

await collectIgnoreRules();
