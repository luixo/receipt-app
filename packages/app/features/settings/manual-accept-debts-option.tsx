import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

import { ErrorMessage, QueryErrorMessage } from "~app/components/error-message";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTRPC } from "~app/utils/trpc";
import { Spinner } from "~components/spinner";
import { Switch } from "~components/switch";
import { options as accountSettingsUpdateOptions } from "~mutations/account-settings/update";

export const ManualAcceptDebtsOption: React.FC = () => {
	const trpc = useTRPC();
	const settingsQuery = useSuspenseQuery(
		trpc.accountSettings.get.queryOptions(),
	);
	const updateSettingsMutation = useMutation(
		trpc.accountSettings.update.mutationOptions(
			useTrpcMutationOptions(accountSettingsUpdateOptions),
		),
	);
	const onChange = React.useCallback(
		(nextAutoAccept: boolean) =>
			updateSettingsMutation.mutate({
				type: "manualAcceptDebts",
				value: nextAutoAccept,
			}),
		[updateSettingsMutation],
	);
	const errorButton = React.useMemo(
		() => ({ text: "Reset", onPress: updateSettingsMutation.reset }),
		[updateSettingsMutation],
	);
	if (settingsQuery.status === "error") {
		return <QueryErrorMessage query={settingsQuery} />;
	}
	return (
		<>
			<Switch
				isSelected={settingsQuery.data.manualAcceptDebts}
				onValueChange={onChange}
				thumbIcon={
					updateSettingsMutation.isPending ? <Spinner size="sm" /> : undefined
				}
				isDisabled={updateSettingsMutation.isPending}
			/>
			{updateSettingsMutation.status === "error" ? (
				<ErrorMessage
					message={updateSettingsMutation.error.message}
					button={errorButton}
				/>
			) : null}
		</>
	);
};
