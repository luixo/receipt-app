import type { TestInfo } from "@playwright/test";
import { toKebabCase } from "remeda";

export const addAttachment = (testInfo: TestInfo, name: string, data: object) =>
	testInfo.attach(name, {
		body: JSON.stringify(data, null, "\t"),
		contentType: "application/json",
	});

export const getSnapshotName = ({
	testInfo,
	key,
	name,
}: {
	testInfo: TestInfo;
	key: string;
	name: string | number;
}) => {
	const path = testInfo.titlePath.slice(1, -1).map((element) =>
		element
			.replaceAll(/[^a-zA-Z0-9]/g, "-")
			// Trim dashes
			.replaceAll(/(?<dashes>^-*|-*$)/g, "")
			// Replace multiple dashes with one
			.replaceAll(/-{2,}/g, "-")
			.toLowerCase(),
	);
	return [
		...path,
		[
			toKebabCase(testInfo.title.replaceAll(/[^a-zA-Z0-9]/g, "-")),
			key,
			// Removing baseName "0" by .filter(Boolean) is intended
			name,
			"json",
		]
			.filter(Boolean)
			.join("."),
	];
};
