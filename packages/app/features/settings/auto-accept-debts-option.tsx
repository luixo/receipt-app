import React from "react";

import { Spinner, Switch } from "@nextui-org/react-tailwind";

import { ErrorMessage, QueryErrorMessage } from "app/components/error-message";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";

export const AutoAcceptDebtsOption: React.FC = () => {
	const settingsQuery = trpc.accountSettings.get.useQuery();
	const updateSettingsMutation = trpc.accountSettings.update.useMutation(
		useTrpcMutationOptions(mutations.accountSettings.update.options),
	);
	const onChange = React.useCallback(
		(nextAutoAccept: boolean) =>
			updateSettingsMutation.mutate({
				type: "autoAcceptDebts",
				value: nextAutoAccept,
			}),
		[updateSettingsMutation],
	);
	const errorButton = React.useMemo(
		() => ({ text: "Reset", onClick: updateSettingsMutation.reset }),
		[updateSettingsMutation],
	);
	if (settingsQuery.status === "loading") {
		return <Spinner />;
	}
	if (settingsQuery.status === "error") {
		return <QueryErrorMessage query={settingsQuery} />;
	}
	return (
		<>
			<Switch
				isSelected={settingsQuery.data.autoAcceptDebts}
				onValueChange={onChange}
				thumbIcon={
					updateSettingsMutation.isLoading ? <Spinner size="sm" /> : undefined
				}
				isDisabled={updateSettingsMutation.isLoading}
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
