import React from "react";
import { Text, View } from "react-native";

import {
	Button,
	Card,
	CardBody,
	CardFooter,
	CardHeader,
	Divider,
} from "@nextui-org/react-tailwind";
import type {
	QueryObserverLoadingErrorResult,
	QueryObserverRefetchErrorResult,
} from "@tanstack/react-query";
import { IoWarning as WarningIcon } from "react-icons/io5";

import type { TRPCError } from "app/trpc";

type Props = {
	message: string;
	button?: {
		text: string;
		onClick: () => void;
	};
};

export const ErrorMessage: React.FC<Props> = ({ message, button }) => (
	<Card>
		<CardHeader>
			<View className="text-danger flex flex-row">
				<WarningIcon size={32} />
				<Text className="text-danger ml-2 text-2xl">Error</Text>
			</View>
		</CardHeader>
		<Divider />
		<CardBody>
			<span className="whitespace-pre-wrap">{message}</span>
		</CardBody>
		{button ? (
			<>
				<Divider />
				<CardFooter className="flex flex-row justify-end">
					<Button color="primary" onClick={button.onClick}>
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
