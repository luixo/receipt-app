import * as postmark from "postmark";

export type Email = {
	address: string;
	subject: string;
	body: string;
};

type EmailClient = {
	send: (email: Email) => Promise<void>;
};

let emailClient: EmailClient;

export const getEmailClient = (): EmailClient => {
	if (emailClient) {
		return emailClient;
	}
	if (global.testContext) {
		emailClient = {
			send: async (email: Email) => {
				const { emailService } = global.testContext!;
				if (emailService.broke) {
					throw new Error("Test context broke email service error");
				}
				emailService.messages.push(email);
			},
		};
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

export const isEmailServiceActive = () => {
	if (global.testContext) {
		return global.testContext.emailService.active;
	}
	return !process.env.NO_EMAIL_SERVICE;
};
