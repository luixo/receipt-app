/* oxlint-disable class-methods-use-this */
import type { Reporter, TestCase } from "@playwright/test/reporter";
import colors from "colors";
import { stripVTControlCharacters } from "node:util";

import { serverName } from "~tests/frontend/consts";
import { addTestServerError } from "~tests/frontend/global/router";
import { decryptTag } from "~utils/server/tag";

class ServerMessagesReporter implements Reporter {
	public onStd(
		chunk: string | Buffer,
		test: TestCase | undefined,
		type: "error" | "info",
	) {
		const message = chunk.toString("utf8");
		const prefix = colors.dim(`[${serverName}] `);
		if (!message.startsWith(prefix)) {
			return;
		}
		let reportMessage = message.slice(prefix.length);
		let testId: string | undefined = undefined;
		if (test) {
			testId = test.id;
		} else {
			const decryptedEnvelope = decryptTag(reportMessage);
			if (decryptedEnvelope) {
				testId = decryptedEnvelope.tag;
				reportMessage = decryptedEnvelope.message;
			}
		}
		addTestServerError({
			testId: testId ?? "unknown",
			type,
			text: stripVTControlCharacters(reportMessage),
		});
	}

	public onStdOut(chunk: string | Buffer, test: TestCase | undefined) {
		this.onStd(chunk, test, "info");
	}

	public onStdErr(chunk: string | Buffer, test: TestCase | undefined) {
		this.onStd(chunk, test, "error");
	}
}

export default ServerMessagesReporter;
