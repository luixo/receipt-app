import * as postmark from "postmark";

type Email = {
	address: string;
	subject: string;
	body: string;
};

type EmailClient = {
	send: (email: Email) => void;
};

let emailClient: EmailClient;

export const getEmailClient = (): EmailClient => {
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
		send: (email: Email) =>
			postmarkClient.sendEmail({
				From: mailSender,
				To: email.address,
				Subject: email.subject,
				HtmlBody: email.body,
				TextBody: email.body,
				MessageStream: "outbound",
			}),
	};
	return emailClient;
};

export const isEmailServiceActive = () => !process.env.NO_EMAIL_SERVICE;
