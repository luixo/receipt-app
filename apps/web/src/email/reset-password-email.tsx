import React from "react";

import { Button, Heading, Text } from "@react-email/components";

import { EmailLayout, button, subheading } from "./email";

/* oxlint-disable react/jsx-no-literals */

type Props = {
	baseUrl: string;
	token: string;
};

export const ResetPasswordEmail: React.FC<Props> = ({ baseUrl, token }) => (
	<EmailLayout
		preview="Receipt App reset password"
		baseUrl={baseUrl}
		footerNote={<Text>This link will expire in the next 24 hours.</Text>}
	>
		<Heading as="h3" style={subheading}>
			Forgot your password?
		</Heading>
		<Text>We received a request to reset your password.</Text>
		<Button href={`${baseUrl}reset-password?token=${token}`} style={button}>
			Reset my password
		</Button>
		<Text>Didn’t request a password reset? You can ignore this message.</Text>
	</EmailLayout>
);
