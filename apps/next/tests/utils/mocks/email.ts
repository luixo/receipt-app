import type { Email, EmailOptions } from "next-app/providers/email";

export type EmailOptionsMock = EmailOptions & {
	broken: boolean;
	mock: NonNullable<EmailOptions["mock"]> & {
		getMessages: () => Email[];
	};
};
export const getEmailOptions = (): EmailOptionsMock => {
	let innerBroken = false;
	let innerActive = true;
	const messages: Email[] = [];
	return {
		get broken() {
			return innerBroken;
		},
		set broken(value) {
			innerBroken = value;
		},
		get active() {
			return innerActive;
		},
		set active(value) {
			innerActive = value;
		},
		mock: {
			send: async (email) => {
				if (innerBroken) {
					throw new Error("Test context broke email service error");
				}
				messages.push(email);
			},
			getMessages: () => messages,
		},
	};
};
