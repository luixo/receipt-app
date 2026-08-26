import type { Locator } from "@playwright/test";

import { test as originalTest } from "./utils";

type Fixtures = {
	inboundHeading: Locator;
	outboundHeading: Locator;
	inboundRows: Locator;
	outboundRows: Locator;
};

export const test = originalTest.extend<Fixtures>({
	inboundHeading: ({ page }, use) =>
		use(page.getByRole("heading", { level: 3, name: "Inbound connections" })),
	outboundHeading: ({ page }, use) =>
		use(page.getByRole("heading", { level: 3, name: "Outbound connections" })),
	inboundRows: ({ page }, use) =>
		use(page.getByTestId("inbound-connection-intention")),
	outboundRows: ({ page }, use) =>
		use(page.getByTestId("outbound-connection-intention")),
});
