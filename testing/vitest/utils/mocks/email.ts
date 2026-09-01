import type { Email, EmailOptions } from "~web/providers/email";

export type EmailOptionsMock = EmailOptions & {
	setBroken: (next: boolean) => void;
	mock: NonNullable<EmailOptions["mock"]> & {
		getMessages: () => Email[];
	};
};
export const getEmailOptions = (): EmailOptionsMock => {
	let innerBroken = false;
	let innerActive = true;
	let innerBaseUrl = "http://receipt-app.test/";
	const messages: Email[] = [];
	return {
		setBroken: (next) => {
			innerBroken = next;
		},
		setActive: (next) => {
			innerActive = next;
		},
		getActive: () => innerActive,
		get baseUrl() {
			return innerBaseUrl;
		},
		set baseUrl(value) {
			innerBaseUrl = value;
		},
		mock: {
			send: (email) => {
				if (innerBroken) {
					throw new Error("Test context broke email service error");
				}
				messages.push(email);
				return Promise.resolve();
			},
			getMessages: () => messages,
		},
	};
};
