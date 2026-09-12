import { test as baseTest, mergeTests } from "@playwright/test";

import { apiFixtures } from "./fixtures/api";
import { browserFixtures } from "./fixtures/browser";
import { cacheFixtures } from "./fixtures/cache";
import { consoleFixtures } from "./fixtures/console";
import { coverageFixtures } from "./fixtures/coverage";
import { currencyFixtures } from "./fixtures/currency";
import { formFixtures } from "./fixtures/form";
import { mockFixtures } from "./fixtures/mock";
import { pageFixtures } from "./fixtures/page";
import { queriesFixtures } from "./fixtures/queries";
import { screenshotsFixtures } from "./fixtures/screenshots";
import { selectorsFixtures } from "./fixtures/selectors";
import { skipFixtures } from "./fixtures/skip";
import { toastsFixtures } from "./fixtures/toasts";
import { tooltipFixtures } from "./fixtures/tooltip";

export const test = mergeTests(
	baseTest,
	skipFixtures,
	currencyFixtures,
	mockFixtures,
	tooltipFixtures,
	screenshotsFixtures,
	consoleFixtures,
	browserFixtures,
	selectorsFixtures,
	toastsFixtures,
	apiFixtures,
	pageFixtures,
	queriesFixtures,
	cacheFixtures,
	formFixtures,
	coverageFixtures,
);
export { expect } from "@playwright/test";
