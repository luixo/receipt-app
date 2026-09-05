import * as postmark from "postmark";

import type { UnauthorizedContext } from "~web/handlers/context";
import { env } from "~web/utils/env";

export type Email = {
	address: string;
	subject: string;
	body: string;
};

export type EmailOptions = {
	getActive: () => boolean;
	setActive: (next: boolean) => void;
	baseUrl: string;
	mock?: EmailClient;
};

type EmailClient = {
	send: (email: Email) => Promise<void>;
};

let emailClient: EmailClient | undefined = undefined;

export const getEmailClient = (ctx: UnauthorizedContext): EmailClient => {
	if (ctx.emailOptions.mock) {
		return ctx.emailOptions.mock;
	}
	if (emailClient) {
		return emailClient;
	}
	const { MAILER_SENDER, MAILER_TOKEN } = env;
	if (!MAILER_SENDER) {
		throw new Error("Expected to have env.MAILER_SENDER variable!");
	}
	if (!MAILER_TOKEN) {
		throw new Error("Expected to have env.MAILER_TOKEN variable!");
	}

	const postmarkClient = new postmark.ServerClient(MAILER_TOKEN);
	emailClient = {
		send: async (email: Email) => {
			await postmarkClient.sendEmail({
				From: MAILER_SENDER,
				To: email.address,
				Subject: email.subject,
				HtmlBody: email.body,
				TextBody: email.body,
				MessageStream: "outbound",
			});
		},
	};
	return emailClient;
};
