import React from "react";

import { ErrorMessage, QueryErrorMessage } from "~app/components/error-message";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { Spinner, Switch } from "~components";
import { options as accountSettingsUpdateOptions } from "~mutations/account-settings/update";

export const ManualAcceptDebtsOption: React.FC = () => {
	const settingsQuery = trpc.accountSettings.get.useQuery();
	const updateSettingsMutation = trpc.accountSettings.update.useMutation(
		useTrpcMutationOptions(accountSettingsUpdateOptions),
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
		() => ({ text: "Reset", onClick: updateSettingsMutation.reset }),
		[updateSettingsMutation],
	);
	if (settingsQuery.status === "pending") {
		return <Spinner />;
	}
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
