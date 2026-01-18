import React from "react";

import type {
	QueryObserverLoadingErrorResult,
	QueryObserverRefetchErrorResult,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type { TRPCError } from "~app/trpc";
import { Button } from "~components/button";
import { Card, CardBody, CardFooter, CardHeader } from "~components/card";
import { Divider } from "~components/divider";
import { Icon } from "~components/icons";
import { Text } from "~components/text";
import { View } from "~components/view";

type Props = {
	message: string;
	button?: {
		text: string;
		onPress: () => void;
	};
};

export const ErrorMessage: React.FC<Props> = ({ message, button }) => {
	const { t } = useTranslation("default");
	return (
		<Card data-testid="error-message">
			<CardHeader>
				<View className="text-danger flex flex-row gap-2">
					<Icon name="warning" className="size-8" />
					<Text variant="h3" className="text-danger">
						{t("components.errorMessage.error")}
					</Text>
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
};

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
	const { t } = useTranslation("default");
	const refetch = React.useCallback(() => query.refetch(), [query]);
	return (
		<ErrorMessage
			button={React.useMemo(
				() => ({
					text: t("components.errorMessage.refetch"),
					onPress: refetch,
				}),
				[refetch, t],
			)}
			message={query.error.message}
		/>
	);
};
