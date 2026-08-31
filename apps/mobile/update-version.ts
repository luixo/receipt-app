import fs from "node:fs/promises";
import path from "node:path";
// oxlint-disable-next-line import-js/no-extraneous-dependencies
import semver from "semver";

const versionFilePath = path.join(import.meta.dirname, "./.version");

const currentVersion = await fs.readFile(versionFilePath, "utf8");
const nextVersion =
	semver.inc(currentVersion.trim(), "patch") ?? currentVersion;
await fs.writeFile(versionFilePath, nextVersion);
// oxlint-disable-next-line no-console
console.log(
	`Update .version "${currentVersion.trim()}" -> "${nextVersion}" successfully`,
);
