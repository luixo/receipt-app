import type { TestFixture } from "@playwright/test";
import { test as base, expect } from "@playwright/test";

import { apiMixin } from "./fixtures/api";
import { consoleMixin } from "./fixtures/console";
import { mockMixin } from "./fixtures/mock";
import { pageMixin } from "./fixtures/page";
import { queriesMixin } from "./fixtures/queries";
import { screenshotsMixin } from "./fixtures/screenshots";
import { selectorsMixin } from "./fixtures/selectors";
import { skipMixin } from "./fixtures/skip";
import { toastsMixin } from "./fixtures/toasts";
import { tooltipMixin } from "./fixtures/tooltip";

export const test = queriesMixin(
	pageMixin(
		apiMixin(
			tooltipMixin(
				toastsMixin(
					selectorsMixin(
						consoleMixin(screenshotsMixin(mockMixin(skipMixin(base)))),
					),
				),
			),
		),
	),
);

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ExtractFixture<F extends TestFixture<unknown, any>> =
	F extends TestFixture<infer R, any> ? R : never;
/* eslint-enable @typescript-eslint/no-explicit-any */

export { expect };
