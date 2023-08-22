import React from "react";

import { Button, Card, Row, Spacer, Text, styled } from "@nextui-org/react";
import type {
	QueryObserverLoadingErrorResult,
	QueryObserverRefetchErrorResult,
} from "@tanstack/react-query";
import { IoWarning as WarningIcon } from "react-icons/io5";

import type { TRPCError } from "app/trpc";

const Title = styled(Text, {
	display: "flex",
	alignItems: "center",
});

type Props = {
	message: string;
	button?: {
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
		{button ? (
			<>
				<Card.Divider />
				<Card.Footer>
					<Row justify="flex-end">
						<Button onClick={button.onClick}>{button.text}</Button>
					</Row>
				</Card.Footer>
			</>
		) : null}
	</Card>
);

type QueryObserverErrorResult =
	| QueryObserverLoadingErrorResult<unknown, TRPCError>
	| QueryObserverRefetchErrorResult<unknown, TRPCError>;

type QueryProps = {
	query: Pick<QueryObserverErrorResult, "refetch" | "error">;
};

export const QueryErrorMessage: React.FC<QueryProps> = ({ query }) => {
	const refetch = React.useCallback(() => query.refetch(), [query]);
	return (
		<ErrorMessage
			button={React.useMemo(
				() => ({ text: "Refetch", onClick: refetch }),
				[refetch],
			)}
			message={query.error.message}
		/>
	);
};
