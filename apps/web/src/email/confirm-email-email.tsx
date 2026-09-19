import React from "react";

import { Button, Heading, Text } from "@react-email/components";

import { EmailLayout, button, subheading } from "./email";

/* oxlint-disable react/jsx-no-literals */

type Props = {
	baseUrl: string;
	token: string;
};

export const ConfirmEmailEmail: React.FC<Props> = ({ baseUrl, token }) => (
	<EmailLayout preview="Receipt App confirm email" baseUrl={baseUrl}>
		<Heading as="h3" style={subheading}>
			✨Welcome to Receipt App✨
		</Heading>
		<Text>Happy counting!</Text>
		<Button href={`${baseUrl}confirm-email?token=${token}`} style={button}>
			Confirm email
		</Button>
		<Text>
			Didn’t register in Receipt App? Click below to void your account.
		</Text>
		<Button href={`${baseUrl}void-account?token=${token}`} style={button}>
			Void account
		</Button>
	</EmailLayout>
);
