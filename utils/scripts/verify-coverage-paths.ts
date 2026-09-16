import fs from "node:fs/promises";
import path from "node:path";

const lcovPath = path.resolve(
	process.argv[2] ?? "testing/playwright/coverage/report/lcov.info",
);
const repositoryRoot = process.cwd();
const lcov = await fs.readFile(lcovPath, "utf8");
const lines = lcov.split("\n");
const sourceFiles = lines
	.filter((line) => line.startsWith("SF:"))
	.map((line) => line.slice(3));
const missingFiles: string[] = [];

for (const sourceFile of sourceFiles) {
	const resolvedPath = path.resolve(repositoryRoot, sourceFile);
	const exists = await fs.access(resolvedPath).then(
		() => true,
		() => false,
	);
	if (!exists) {
		missingFiles.push(`${sourceFile} -> ${resolvedPath}`);
	}
}

if (missingFiles.length !== 0) {
	throw new Error(
		`${missingFiles.length} of ${sourceFiles.length} coverage paths do not resolve:\n${missingFiles.join("\n")}`,
	);
}

console.log(`Verified ${sourceFiles.length} coverage paths in ${lcovPath}`);
