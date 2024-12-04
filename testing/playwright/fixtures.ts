import { test as base, expect, mergeTests } from "@playwright/test";

import { apiFixtures } from "./fixtures/api";
import { browserFixtures } from "./fixtures/browser";
import { consoleFixtures } from "./fixtures/console";
import { currencyFixtures } from "./fixtures/currency";
import { mockFixtures } from "./fixtures/mock";
import { pageFixtures } from "./fixtures/page";
import { queriesFixtures } from "./fixtures/queries";
import { screenshotsFixtures } from "./fixtures/screenshots";
import { selectorsFixtures } from "./fixtures/selectors";
import { skipFixtures } from "./fixtures/skip";
import { toastsFixtures } from "./fixtures/toasts";
import { tooltipFixtures } from "./fixtures/tooltip";

export const test = mergeTests(
	base,
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
);

export { expect };
