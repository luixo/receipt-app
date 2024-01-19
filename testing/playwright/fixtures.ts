import { test as base, expect } from "@playwright/test";

import { apiMixin } from "./fixtures/api";
import { consoleMixin } from "./fixtures/console";
import { mockMixin } from "./fixtures/mock";
import { pageMixin } from "./fixtures/page";
import { queriesMixin } from "./fixtures/queries";
import { selectorsMixin } from "./fixtures/selectors";
import { toastsMixin } from "./fixtures/toasts";
import { tooltipMixin } from "./fixtures/tooltip";

export const test = queriesMixin(
	pageMixin(
		apiMixin(
			tooltipMixin(toastsMixin(selectorsMixin(consoleMixin(mockMixin(base))))),
		),
	),
);

export { expect };
