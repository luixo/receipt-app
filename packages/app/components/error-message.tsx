import React from "react";

import { Button, Text, Card, Row, Spacer, styled } from "@nextui-org/react";
import { IoWarning as WarningIcon } from "react-icons/io5";

const Title = styled(Text, {
	display: "flex",
	alignItems: "center",
});

type Props = {
	message: string;
	button: {
		text: string;
		onClick: () => void;
	};
};

export const ErrorMessage: React.FC<Props> = ({ message, button }) => (
	<Card variant="flat">
		<Card.Header>
			<Title h3 color="error">
				<WarningIcon size={32} />
				<Spacer x={0.25} />
				Error
			</Title>
		</Card.Header>
		<Card.Divider />
		<Card.Body>
			<Text>{message}</Text>
		</Card.Body>
		<Card.Divider />
		<Card.Footer>
			<Row justify="flex-end">
				<Button onClick={button.onClick}>{button.text}</Button>
			</Row>
		</Card.Footer>
	</Card>
);
