import type { Locator } from "@playwright/test";

import { test as base } from "~app/features/receipt/__tests__/utils";

type Fixtures = {
	participantsPicker: Locator;
	participantsPreview: Locator;
	populatedParticipantsPreview: Locator;
	participantRows: Locator;
	participantRow: (name: string) => Locator;
	participantRole: (name: string) => Locator;
	participantPayerPart: (name: string) => Locator;
	participantSuggestion: Locator;
	openParticipantsPicker: () => Promise<void>;
};

export const test = base.extend<Fixtures>({
	participantsPicker: ({ page }, use) =>
		use(page.getByTestId("participants-picker")),
	participantsPreview: ({ page }, use) =>
		use(page.getByRole("button", { name: "Add participants" })),
	populatedParticipantsPreview: ({ page }, use) =>
		use(page.getByText("payed by", { exact: true }).locator("../..")),
	participantRows: ({ participantsPicker }, use) =>
		use(participantsPicker.getByRole("heading", { level: 2 }).locator("..")),
	participantRow: ({ participantRows }, use) =>
		use((name) => participantRows.filter({ hasText: name })),
	participantRole: ({ participantRow }, use) =>
		use((name) =>
			participantRow(name).getByRole("button", { name: "Pick role" }),
		),
	participantPayerPart: ({ participantRow }, use) =>
		use((name) =>
			participantRow(name).getByRole("textbox", { name: "Item payer part" }),
		),
	participantSuggestion: ({ participantsPicker }, use) =>
		use(participantsPicker.getByTestId("peers-suggest")),
	openParticipantsPicker: ({ page }, use) =>
		use(async () => {
			const addButton = page.getByRole("button", { name: "Add participants" });
			await (
				(await addButton.isVisible())
					? addButton
					: page.getByText("payed by", { exact: true })
			).click();
		}),
});
