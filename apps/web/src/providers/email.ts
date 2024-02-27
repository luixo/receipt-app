import * as postmark from "postmark";

import type { UnauthorizedContext } from "~web/handlers/context";

export type Email = {
	address: string;
	subject: string;
	body: string;
};

export type EmailOptions = {
	active: boolean;
	baseUrl: string;
	mock?: EmailClient;
};

type EmailClient = {
	send: (email: Email) => Promise<void>;
};

let emailClient: EmailClient;

export const getEmailClient = (ctx: UnauthorizedContext): EmailClient => {
	if (ctx.emailOptions.mock) {
		return ctx.emailOptions.mock;
	}
	if (emailClient) {
		return emailClient;
	}
	const mailSender = process.env.MAILER_SENDER;
	if (!mailSender) {
		throw new Error("Expected to have process.env.MAILER_SENDER variable!");
	}
	if (!process.env.MAILER_TOKEN) {
		throw new Error("Expected to have process.env.MAILER_TOKEN variable!");
	}

	const postmarkClient = new postmark.ServerClient(process.env.MAILER_TOKEN);
	emailClient = {
		send: async (email: Email) => {
			await postmarkClient.sendEmail({
				From: mailSender,
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
