import { expect, test } from "~tests/frontend/fixtures";
import {
	generateConfirmEmailEmail,
	generateResetPasswordEmail,
} from "~web/email/utils";

const mockContext = {
	baseUrl: "http://receipt-test.app",
	reqHeaders: new Headers(),
};

test.describe("Emails", () => {
	test("Confirm email", async ({ page, faker }) => {
		const token = faker.string.uuid();
		const { body, subject } = await generateConfirmEmailEmail(
			token,
			mockContext,
		);
		await page.setContent(body);

		expect(subject).toBe("Confirm email in Receipt App");
		await expect(
			page.getByRole("link", { name: "Confirm email" }),
		).toHaveAttribute(
			"href",
			`${mockContext.baseUrl}/confirm-email?token=${token}`,
		);
		await expect(
			page.getByRole("link", { name: "Void account" }),
		).toHaveAttribute(
			"href",
			`${mockContext.baseUrl}/void-account?token=${token}`,
		);
	});

	test("Reset password email", async ({ page, faker }) => {
		const token = faker.string.uuid();
		const { body, subject } = await generateResetPasswordEmail(
			token,
			mockContext,
		);
		await page.setContent(body);

		expect(subject).toBe("Reset password intention in Receipt App");
		await expect(
			page.getByRole("link", { name: "Reset my password" }),
		).toHaveAttribute(
			"href",
			`${mockContext.baseUrl}/reset-password?token=${token}`,
		);
	});

	test("requires a base URL", async () => {
		const context = { ...mockContext, baseUrl: "" };

		await expect(generateConfirmEmailEmail("token", context)).rejects.toThrow(
			"Expected to have base url while generating email",
		);
		await expect(generateResetPasswordEmail("token", context)).rejects.toThrow(
			"Expected to have base url while generating email",
		);
	});
});
