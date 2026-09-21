import {
	generateConfirmEmailEmail,
	generateResetPasswordEmail,
} from "~web/email/utils";

import { test } from "./utils";

const mockContext = {
	baseUrl: "http://receipt-test.app",
	reqHeaders: new Headers(),
};

test.describe("Emails", () => {
	test.beforeEach(({ skip }, testInfo) => {
		skip(testInfo, "middle");
	});

	test("Confirm email", async ({ expectBodyScreenshot }) => {
		const { body } = await generateConfirmEmailEmail("token", mockContext);
		await expectBodyScreenshot(body, "confirm-email.png");
	});

	test("Reset password email", async ({ expectBodyScreenshot }) => {
		const { body } = await generateResetPasswordEmail("token", mockContext);
		await expectBodyScreenshot(body, "reset-password.png");
	});
});
