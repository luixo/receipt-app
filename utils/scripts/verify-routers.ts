import { createPatch, diffLines } from "diff";
import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.join(import.meta.dirname, "../..");

async function* walk(
	dir: string,
	filter: (fileName: string, dirName: string) => boolean,
	map: (fileName: string) => string,
): AsyncGenerator<string, void, unknown> {
	for await (const dirent of await fs.opendir(dir)) {
		const entry = path.join(dir, dirent.name);
		if (dirent.isDirectory()) {
			yield* walk(entry, filter, map);
		} else if (
			dirent.isFile() &&
			!dirent.name.startsWith(".") &&
			filter(dirent.name, dirent.parentPath)
		) {
			yield map(entry);
		}
	}
}

const processPath = (
	filename: string,
	relativePath: string,
	segmentFilter: (segment: string) => boolean,
	segmentMap: (segment: string) => string,
) =>
	filename
		.slice(relativePath.length)
		.replace(/\.tsx?$/, "")
		.split("/")
		.filter(segmentFilter)
		.map(segmentMap)
		.join("/")
		.replace(/\/index$/, "");

const collectWebRouter = async (entryDir: string) => {
	const paths = await Array.fromAsync(
		walk(
			entryDir,
			(fileName, dirName) => {
				if (
					dirName.includes("/api") ||
					fileName === "__root.tsx" ||
					fileName.startsWith("_")
				) {
					return false;
				}
				return true;
			},
			(fileName) =>
				processPath(
					fileName,
					entryDir,
					(segment) => !segment.startsWith("_"),
					(segment) =>
						segment.startsWith("$") ? `<${segment.slice(1)}>` : segment,
				),
		),
	);
	return paths.toSorted();
};

const collectNativeRouter = async (entryDir: string) => {
	const paths = await Array.fromAsync(
		walk(
			entryDir,
			(fileName) => {
				if (fileName.startsWith("_layout.ts")) {
					return false;
				}
				return true;
			},
			(fileName) =>
				processPath(
					fileName,
					entryDir,
					(segment) => !segment.startsWith("("),
					(segment) =>
						segment.startsWith("[") ? `<${segment.slice(1, -1)}>` : segment,
				),
		),
	);
	return paths.toSorted();
};

const webRouter = await collectWebRouter(
	path.join(rootDir, "apps/web/src/pages"),
);
const nativeRouter = await collectNativeRouter(
	path.join(rootDir, "apps/mobile/app"),
);
const lineDiffs = diffLines(webRouter.join("\n"), nativeRouter.join("\n"));
if (!lineDiffs.every((line) => !line.added && !line.removed)) {
	const diff = createPatch(
		"routes",
		webRouter.join("\n"),
		nativeRouter.join("\n"),
		"web",
		"native",
	);
	console.error("Routes diff between web and native versions");
	console.error(diff);
	process.exit(1);
}
