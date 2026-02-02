import React from "react";

import type {
	QueryObserverLoadingErrorResult,
	QueryObserverRefetchErrorResult,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type { TRPCError } from "~app/trpc";
import { Button } from "~components/button";
import { Card } from "~components/card";
import { Icon } from "~components/icons";
import { Text } from "~components/text";
import { View } from "~components/view";

type Props = {
	title?: string;
	message: string;
	stack?: string;
	button?: {
		text: string;
		onPress: () => void;
	};
};

export const ErrorMessage: React.FC<Props> = ({
	title,
	message,
	stack,
	button,
}) => {
	const { t } = useTranslation("default");
	return (
		<Card
			testID="error-message"
			header={
				<View className="text-danger flex flex-row gap-2">
					<Icon name="warning" className="size-8" />
					<Text variant="h3" className="text-danger">
						{title || t("components.errorMessage.error")}
					</Text>
				</View>
			}
			footerClassName="flex flex-row justify-end"
			footer={
				button ? (
					<Button color="primary" onPress={button.onPress}>
						{button.text}
					</Button>
				) : null
			}
		>
			<Text className="whitespace-pre-wrap">{message}</Text>
			<Text className="text-sm whitespace-pre-wrap">{stack}</Text>
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
