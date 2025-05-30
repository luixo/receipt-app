import React from "react";
import { View } from "react-native";

import type {
	QueryObserverLoadingErrorResult,
	QueryObserverRefetchErrorResult,
} from "@tanstack/react-query";

import type { TRPCError } from "~app/trpc";
import { Button } from "~components/button";
import { Card, CardBody, CardFooter, CardHeader } from "~components/card";
import { Divider } from "~components/divider";
import { Header } from "~components/header";
import { WarningIcon } from "~components/icons";
import { Text } from "~components/text";

type Props = {
	message: string;
	button?: {
		text: string;
		onPress: () => void;
	};
};

export const ErrorMessage: React.FC<Props> = ({ message, button }) => (
	<Card data-testid="error-message">
		<CardHeader>
			<View className="text-danger flex flex-row gap-2">
				<WarningIcon size={32} />
				<Header className="text-danger">Error</Header>
			</View>
		</CardHeader>
		<Divider />
		<CardBody>
			<Text className="whitespace-pre-wrap">{message}</Text>
		</CardBody>
		{button ? (
			<>
				<Divider />
				<CardFooter className="flex flex-row justify-end">
					<Button color="primary" onPress={button.onPress}>
						{button.text}
					</Button>
				</CardFooter>
			</>
		) : null}
	</Card>
);

type QueryObserverErrorResult =
	| QueryObserverLoadingErrorResult<unknown, TRPCError>
	| QueryObserverRefetchErrorResult<unknown, TRPCError>;
type PickedQueryObserverErrorResult = Pick<
	QueryObserverErrorResult,
	"refetch" | "error"
>;

type QueryProps = {
	query: PickedQueryObserverErrorResult;
};

export const QueryErrorMessage: React.FC<QueryProps> = ({ query }) => {
	const refetch = React.useCallback(() => query.refetch(), [query]);
	return (
		<ErrorMessage
			button={React.useMemo(
				() => ({ text: "Refetch", onPress: refetch }),
				[refetch],
			)}
			message={query.error.message}
		/>
	);
};

type GroupedQueryProps = {
	queries: [
		PickedQueryObserverErrorResult,
		...PickedQueryObserverErrorResult[],
	];
};

export const GroupedQueryErrorMessage: React.FC<GroupedQueryProps> = ({
	queries,
}) => {
	const refetch = React.useCallback(
		() => queries.forEach((query) => query.refetch()),
		[queries],
	);
	return (
		<ErrorMessage
			button={React.useMemo(
				() => ({ text: "Refetch", onPress: refetch }),
				[refetch],
			)}
			message={queries[0].error.message}
		/>
	);
};
