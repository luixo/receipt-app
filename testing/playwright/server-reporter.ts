/* eslint-disable class-methods-use-this */
import type { Reporter, TestCase } from "@playwright/test/reporter";
import colors from "colors";

import { serverName } from "~tests/frontend/consts";
import { DEFAULT_IGNORED, isIgnored } from "~tests/frontend/fixtures/console";

const serverIgnored = [...DEFAULT_IGNORED];

export const serverMessages: {
	type: "info" | "error";
	suspectTests: string[];
	message: string;
}[] = [];

const getTestName = (test: TestCase) =>
	test.titlePath().filter(Boolean).join(" › ");

const runningTests: string[] = [];

class ServerMessagesReporter implements Reporter {
	onTestBegin(test: TestCase): void {
		runningTests.push(getTestName(test));
	}

	onTestEnd(test: TestCase): void {
		const testIndex = runningTests.indexOf(getTestName(test));
		runningTests.splice(testIndex, 1);
	}

	onStd(
		chunk: string | Buffer,
		test: TestCase | undefined,
		type: "error" | "info",
	) {
		const message = chunk.toString("utf-8");
		const prefix = colors.dim(`[${serverName}] `);
		if (!message.startsWith(prefix)) {
			return;
		}
		const reportMessage = message.slice(prefix.length);
		if (isIgnored(serverIgnored, reportMessage)) {
			return;
		}
		serverMessages.push({
			type,
			suspectTests: test ? [getTestName(test)] : runningTests.concat(),
			message: reportMessage,
		});
	}

	onStdOut(chunk: string | Buffer, test: TestCase | undefined) {
		this.onStd(chunk, test, "info");
	}

	onStdErr(chunk: string | Buffer, test: TestCase | undefined) {
		this.onStd(chunk, test, "error");
	}
}

export default ServerMessagesReporter;
