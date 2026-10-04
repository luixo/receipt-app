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
		use(page.getByTestId("participants-preview")),
	participantRows: ({ participantsPicker }, use) =>
		use(participantsPicker.getByTestId("participant-row")),
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
	openParticipantsPicker: (
		{ participantsPreview, populatedParticipantsPreview },
		use,
	) =>
		use(async () => {
			const isPreviewVisible = await participantsPreview.isVisible();
			const preview = isPreviewVisible
				? participantsPreview
				: populatedParticipantsPreview;
			await preview.click();
		}),
});
