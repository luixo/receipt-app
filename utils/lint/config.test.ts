import { spawn } from "bun";
import { expect, test } from "bun:test";

import { config } from "./config";

const resolvedConfig = await config;
const syntaxRule = resolvedConfig.overrides?.find((override) =>
	override.files.includes("**/*"),
)?.rules["no-restricted-syntax"];

test.each([
	["import { options } from '~mutations/receipts/add';", true],
	[
		"import { options as receiptOptions } from '~mutations/receipts/add';",
		false,
	],
	[
		"export { receiptOptions as options } from '~mutations/receipts/add';",
		true,
	],
	[
		"export { options as receiptOptions } from '~mutations/receipts/add';",
		false,
	],
	["import { update } from '~mutations/cache/receipts';", true],
	[
		"import { update as updateReceipts } from '~mutations/cache/receipts';",
		false,
	],
	[
		"export { updateReceipts as update } from '~mutations/cache/receipts';",
		true,
	],
	[
		"export { update as updateReceipts } from '~mutations/cache/receipts';",
		false,
	],
	["import { invalidateAll } from '~mutations/cache/receipts';", true],
	["export { invalidateAll } from '~mutations/cache/receipts';", true],
	["export { Text } from 'react-native';", true],
	["export { Text as NativeText } from 'react-native';", false],
	["import { options } from 'other-mutations/receipts';", false],
])("syntax restriction: %s", async (source, restricted) => {
	expect(syntaxRule).toBeDefined();
	const result = spawn({
		cmd: [
			process.execPath,
			"lint",
			"--no-script",
			"--no-config-lookup",
			"--rule",
			`no-restricted-syntax: ${JSON.stringify(syntaxRule)}`,
			"--stdin",
			"--stdin-filename",
			"example.js",
		],
		stdin: Buffer.from(source),
		stderr: "pipe",
	});
	const errors = await new Response(result.stderr).text();
	expect(errors).toBe("");
	expect(await result.exited).toBe(restricted ? 1 : 0);
});
