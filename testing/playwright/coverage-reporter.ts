import { CoverageReporter } from "@bgotink/playwright-coverage";
import type { Reporter } from "@playwright/test/reporter";

/* eslint-disable class-methods-use-this, no-console */
class PrintingCoverageReporter extends CoverageReporter implements Reporter {
	onStdOut(chunk: string) {
		console.log(chunk);
	}
	onStdErr(chunk: string) {
		console.error(chunk);
	}
	printsToStdio() {
		return false;
	}
}
/* eslint-enable class-methods-use-this, no-console */

export default PrintingCoverageReporter;
