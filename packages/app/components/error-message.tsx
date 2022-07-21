import React from "react";

import { Button, Text, Card, Row, Spacer, styled } from "@nextui-org/react";
import { IoWarning as WarningIcon } from "react-icons/io5";
import {
	QueryObserverRefetchErrorResult,
	QueryObserverLoadingErrorResult,
} from "react-query";

import { TRPCError } from "app/trpc";

const Title = styled(Text, {
	display: "flex",
	alignItems: "center",
});

type QueryObserverErrorResult =
	| QueryObserverLoadingErrorResult<unknown, TRPCError>
	| QueryObserverRefetchErrorResult<unknown, TRPCError>;

type Props = {
	query: QueryObserverErrorResult;
};

export const ErrorMessage: React.FC<Props> = ({ query }) => {
	const refetch = React.useCallback(() => query.refetch(), [query]);
	return (
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
				<Text>{query.error.message}</Text>
			</Card.Body>
			<Card.Divider />
			<Card.Footer>
				<Row justify="flex-end">
					<Button onClick={refetch}>Refetch</Button>
				</Row>
			</Card.Footer>
		</Card>
	);
};
