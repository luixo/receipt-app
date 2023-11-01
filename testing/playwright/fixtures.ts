import { test as base, expect } from "@playwright/test";

import { apiMixin } from "./fixtures/api";
import { consoleMixin } from "./fixtures/console";
import { mockMixin } from "./fixtures/mock";
import { pageMixin } from "./fixtures/page";
import { queriesMixin } from "./fixtures/queries";
import { selectorsMixin } from "./fixtures/selectors";
import { toastsMixin } from "./fixtures/toasts";

export const test = queriesMixin(
	pageMixin(
		apiMixin(toastsMixin(selectorsMixin(consoleMixin(mockMixin(base))))),
	),
);

export { expect };
