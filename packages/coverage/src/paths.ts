import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.join(import.meta.dirname, "../../..");

const SOURCE_EXTENSION = /\.[cm]?[jt]sx?$/;

// Sources that are not first-party code
const EXTERNAL_PATHS = [/node_modules/, /(?:^|\/)\.output\//];

// First-party code we don't want in coverage reports
const IGNORED_PATHS = [
	// No tests & snapshots
	/__tests__/,
	/__snapshots__/,
	// No declarations
	/\.d\.ts$/,
	// Handlers coverage is verified in backend tests
	/^apps\/web\/src\/handlers\//,
];

// Bundled scripts that never contain first-party code
const IGNORED_SCRIPTS = [/node_modules/, /server\/_libs/];

export const isIgnoredScript = (scriptUrl: string) =>
	IGNORED_SCRIPTS.some((ignoredScript) => ignoredScript.test(scriptUrl));

const isSourceFile = (repoPath: string) =>
	SOURCE_EXTENSION.test(repoPath) &&
	EXTERNAL_PATHS.every((externalPath) => !externalPath.test(repoPath));

export const isReportedFile = (repoPath: string) =>
	isSourceFile(repoPath) &&
	IGNORED_PATHS.every((ignoredPath) => !ignoredPath.test(repoPath));

// Canonical coverage is keyed by a posix path relative to the repository root,
// so data produced on different machines (e.g. CI shards) is mergeable.
// Returns `undefined` for virtual modules and files outside of the repository.
export const toRepoPath = (sourceUrl: string) => {
	if (!URL.canParse(sourceUrl)) {
		return;
	}
	const url = new URL(sourceUrl);
	if (url.protocol !== "file:") {
		return;
	}
	// `fileURLToPath` ignores query and hash, e.g. `?tsr-split=component`
	const relativePath = path.relative(rootDir, fileURLToPath(url));
	if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
		return;
	}
	const repoPath = relativePath.split(path.sep).join("/");
	return isSourceFile(repoPath) ? repoPath : undefined;
};

export const toAbsolutePath = (repoPath: string) =>
	path.join(rootDir, repoPath);
